import type { ASTExpr, Extras, EzqSqlStep } from "@etherbits/ezq-node";
import { generate_ast, generate_sql } from "@etherbits/ezq-node";
import type { SQL } from "bun";
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
  constructor(private readonly sql: SQL) {}

  async execute(query: string, extras: Extras | null): Promise<EzqResult> {
    const ast = generate_ast(query);
    if (!("Root" in ast)) {
      return {
        ok: false,
        status: 400,
        error: "Query did not produce a root expression",
      };
    }

    const { action, expression } = ast.Root;
    const steps = generate_sql(ast, extras);

    if (action === "search") {
      const { lastRows } = await this.runSteps(this.sql, steps);
      return { ok: true, rows: LibraryEntryRowsSchema.parse(lastRows) };
    }

    if (action === "delete") {
      const rows = await this.sql.begin(async (tx) => {
        const matched = await this.searchByExpression(expression, extras, tx);
        await this.runSteps(tx, steps);
        return matched;
      });
      return { ok: true, rows };
    }

    if (action === "create") {
      const { valueMap } = await this.sql.begin((tx) =>
        this.runSteps(tx, steps)
      );
      const entryIds = Array.from(valueMap.entries())
        .filter(
          ([token]) =>
            token === ENTRY_ID_TOKEN || token.startsWith(`${ENTRY_ID_TOKEN}_`)
        )
        .map(([, value]) => value);
      const rows =
        entryIds.length > 0 ? await this.searchByIds(entryIds, extras) : [];
      return { ok: true, rows };
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
        return { ok: true, rows: [] };
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
        },
      };
      const stableSteps = generate_sql(stableUpdateAst, extras);
      await this.sql.begin((tx) => this.runSteps(tx, stableSteps));
      const rows = await this.searchByIds(ids, extras);
      return { ok: true, rows };
    }

    return { ok: false, status: 400, error: `Unsupported action: ${action}` };
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
    const ast: ASTExpr = { Root: { action: "search", expression } };
    const steps = generate_sql(ast, extras);
    const step = steps[0];
    if (!step) return [];
    const rows = await executor.unsafe(step.sql, step.params);
    return LibraryEntryRowsSchema.parse(rows);
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
}
