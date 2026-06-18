import type { ASTExpr, Extras, EzqSqlStep } from "@etherbits/ezq-node";
import { generate_ast, generate_sql } from "@etherbits/ezq-node";
import type { SQL } from "bun";
import { AliasCommandExecutor } from "../aliases/alias-command-executor";
import { PullCommandExecutor } from "../catalogue/pull-command-executor";
import { CommandDelegator } from "../commands/command-delegator";
import {
  CommandExecutionError,
  type CommandExecutionParams,
} from "../commands/command-executor";
import { EnrichmentCommandExecutor } from "../enrichment/enrichment-command-executor";
import {
  LibraryEntryRowsSchema,
  type LibraryEntryWithTags,
} from "./ezq.schema";

const ENTRY_ID_TOKEN = "ENTRY_ID";

type RawRow = Record<string, unknown>;
type SqlExecutor = Pick<SQL, "unsafe">;

export type EzqResult =
  | { ok: true; rows: LibraryEntryWithTags[] }
  | { ok: false; status: number; error: string };

export class EzqService {
  private readonly commandDelegator = new CommandDelegator([
    new AliasCommandExecutor(),
    new PullCommandExecutor(),
    new EnrichmentCommandExecutor(),
  ]);

  constructor(private readonly sql: SQL) {}

  async execute(query: string, extras: Extras | null): Promise<EzqResult> {
    let ast: ASTExpr;
    try {
      ast = generate_ast(query);
    } catch (error) {
      return {
        ok: false,
        status: 400,
        error: error instanceof Error ? error.message : "Invalid EZQ query",
      };
    }

    if (!("Root" in ast)) {
      return {
        ok: false,
        status: 400,
        error: "Query did not produce a root expression",
      };
    }

    const { action, expression } = ast.Root;
    const commands =
      (ast.Root as typeof ast.Root & { commands?: string[] }).commands ?? [];
    const userId = this.getUserId(extras);
    const steps = generate_sql(ast, extras);

    if (action === "search") {
      const { lastRows } = await this.runSteps(this.sql, steps);
      const rows = LibraryEntryRowsSchema.parse(lastRows);
      const result = await this.delegateCommands(commands, {
        action,
        rows,
        userId,
        filterRowsByExpression: (expression, currentRows) =>
          this.filterRowsByExpression(expression, currentRows, extras),
      });
      return result;
    }

    if (action === "delete") {
      const rows = await this.sql.begin(async (tx) => {
        const matched = await this.searchByExpression(expression, extras, tx);
        await this.runSteps(tx, steps);
        return matched;
      });
      const result = await this.delegateCommands(commands, {
        action,
        rows,
        userId,
        filterRowsByExpression: (expression, currentRows) =>
          this.filterRowsByExpression(expression, currentRows, extras),
      });
      return result;
    }

    if (action === "create") {
      const rows = this.isEmptyExpression(expression)
        ? []
        : await this.createRowsFromSteps(steps, extras);
      const result = await this.delegateCommands(commands, {
        action,
        rows,
        userId,
        filterRowsByExpression: (expression, currentRows) =>
          this.filterRowsByExpression(expression, currentRows, extras),
      });
      return result;
    }

    if (action === "update") {
      if (!("Update" in expression)) {
        return {
          ok: false,
          status: 400,
          error: "Update expression has unexpected shape",
        };
      }
      const matched = await this.searchByExpression(
        expression.Update.selection,
        extras
      );
      const ids = matched.map((row) => row.id);
      if (ids.length === 0) {
        const result = await this.delegateCommands(commands, {
          action,
          rows: [],
          userId,
          filterRowsByExpression: (expression, currentRows) =>
            this.filterRowsByExpression(expression, currentRows, extras),
        });
        return result;
      }

      const stableUpdateAst: ASTExpr = {
        Root: {
          action: "update",
          expression: {
            Update: {
              selection: this.idExpression(ids),
              values: expression.Update.values,
            },
          },
          commands: [],
        },
      } as ASTExpr;
      const stableSteps = generate_sql(stableUpdateAst, extras);
      await this.sql.begin((tx) => this.runSteps(tx, stableSteps));
      const rows = await this.searchByIds(ids, extras);
      const result = await this.delegateCommands(commands, {
        action,
        rows,
        userId,
        filterRowsByExpression: (expression, currentRows) =>
          this.filterRowsByExpression(expression, currentRows, extras),
      });
      return result;
    }

    return { ok: false, status: 400, error: `Unsupported action: ${action}` };
  }

  private async createRowsFromSteps(
    steps: EzqSqlStep[],
    extras: Extras | null
  ): Promise<LibraryEntryWithTags[]> {
    const { valueMap } = await this.sql.begin((tx) => this.runSteps(tx, steps));
    const entryIds = Array.from(valueMap.entries())
      .filter(
        ([token]) =>
          token === ENTRY_ID_TOKEN || token.startsWith(`${ENTRY_ID_TOKEN}_`)
      )
      .map(([, value]) => value);

    return entryIds.length > 0 ? this.searchByIds(entryIds, extras) : [];
  }

  private async runSteps(executor: SqlExecutor, steps: EzqSqlStep[]) {
    const valueMap = new Map<string, string>();
    let lastRows: RawRow[] = [];

    for (const step of steps) {
      const params = step.params.map((value) => valueMap.get(value) ?? value);
      const rows = (await executor.unsafe(step.sql, params)) as RawRow[];

      if (step.outputs.length > 0 && rows.length === 0) {
        throw new Error("SQL step declared outputs but returned no rows.");
      }

      const outputValues = rows[0] ? Object.values(rows[0]) : [];
      for (const [index, token] of step.outputs.entries()) {
        const resolved = outputValues[index];
        if (typeof resolved !== "string") {
          throw new Error(
            `Missing output value at index ${index} for token ${token}`
          );
        }
        valueMap.set(token, resolved);
      }

      lastRows = rows;
    }

    return { valueMap, lastRows };
  }

  private async searchByExpression(
    expression: ASTExpr,
    extras: Extras | null,
    executor: SqlExecutor = this.sql
  ): Promise<LibraryEntryWithTags[]> {
    const ast: ASTExpr = {
      Root: { action: "search", expression, commands: [] },
    } as ASTExpr;
    const steps = generate_sql(ast, extras);
    const step = steps[0];
    if (!step) return [];
    const rows = await executor.unsafe(step.sql, step.params);
    return LibraryEntryRowsSchema.parse(rows);
  }

  private async delegateCommands(
    commands: string[],
    params: Omit<CommandExecutionParams, "command">
  ): Promise<EzqResult> {
    try {
      const result = await this.commandDelegator.delegateCommands(
        commands,
        params
      );
      return { ok: true, rows: result.rows };
    } catch (error) {
      if (error instanceof CommandExecutionError) {
        return {
          ok: false,
          status: error.status,
          error: error.message,
        };
      }

      throw error;
    }
  }

  private async searchByIds(
    ids: string[],
    extras: Extras | null
  ): Promise<LibraryEntryWithTags[]> {
    if (ids.length === 0) return [];
    return this.searchByExpression(this.idExpression(ids), extras);
  }

  private idExpression(ids: string[]): ASTExpr {
    return ids.length === 1
      ? { Leaf: `id:${ids[0]}` }
      : { Or: ids.map((id) => ({ Leaf: `id:${id}` })) };
  }

  private async filterRowsByExpression(
    expression: ASTExpr,
    rows: LibraryEntryWithTags[],
    extras: Extras | null
  ): Promise<LibraryEntryWithTags[]> {
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];

    return this.searchByExpression(
      { And: [this.idExpression(ids), expression] },
      extras
    );
  }

  private isEmptyExpression(expression: ASTExpr): boolean {
    return "And" in expression && expression.And.length === 0;
  }

  private getUserId(extras: Extras | null): string | null {
    if (!extras || typeof extras !== "object") return null;
    const userId = (extras as unknown as Record<string, unknown>).user_id;
    return typeof userId === "string" ? userId : null;
  }
}
