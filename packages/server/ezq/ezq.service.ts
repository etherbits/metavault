import type { SQL } from "bun";
import type { ASTExpr, Extras, EzqSqlStep } from "@etherbits/ezq-node";
import { generate_ast, generate_sql } from "@etherbits/ezq-node";
import {
  LibraryEntryRowsSchema,
  type LibraryEntryWithTags,
} from "./ezq.schema.js";

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
      await this.runSteps(this.sql, steps);
      return { ok: true, rows: [] };
    }

    if (action === "create") {
      const { valueMap } = await this.sql.begin((tx) =>
        this.runSteps(tx, steps)
      );
      const entryId = valueMap.get(ENTRY_ID_TOKEN);
      const rows = entryId ? await this.searchByIds([entryId], extras) : [];
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
      await this.sql.begin((tx) => this.runSteps(tx, steps));
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
    extras: Extras | null
  ): Promise<LibraryEntryWithTags[]> {
    const ast: ASTExpr = { Root: { action: "search", expression } };
    const steps = generate_sql(ast, extras);
    const step = steps[0];
    if (!step) return [];
    const rows = await this.sql.unsafe(step.sql, step.params);
    return LibraryEntryRowsSchema.parse(rows);
  }

  private async searchByIds(
    ids: string[],
    extras: Extras | null
  ): Promise<LibraryEntryWithTags[]> {
    if (ids.length === 0) return [];
    const expression: ASTExpr =
      ids.length === 1
        ? { Leaf: `id:${ids[0]}` }
        : { Or: ids.map((id) => ({ Leaf: `id:${id}` })) };
    return this.searchByExpression(expression, extras);
  }
}
