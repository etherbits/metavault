import express from "express";
import cors from "cors";
import { sql } from "./db/index";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";
import { generate_ast, generate_sql } from "../ezq/out/node/ezq.js";
import type { ASTExpr, Extras, EzqSqlStep } from "../ezq/out/node/ezq.js";

const app = express();
const port = Number(process.env.PORT ?? 3435);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3534";

const ENTRY_ID_TOKEN = "ENTRY_ID";

type Row = Record<string, unknown>;
type SqlExecutor = Pick<typeof sql, "unsafe">;

async function runEzqSteps(executor: SqlExecutor, steps: EzqSqlStep[]) {
  const valueMap = new Map<string, string>();
  let lastRows: Row[] = [];

  for (const step of steps) {
    const params = step.params.map((value) => valueMap.get(value) ?? value);
    const rows = (await executor.unsafe(step.sql, params)) as Row[];

    if (step.outputs.length > 0 && rows.length === 0) {
      throw new Error(
        "SQL step declared outputs but returned no rows. Use RETURNING for output-producing steps."
      );
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

type TagRow = { id: string; value: string; weight: string };

async function attachTags(entries: Row[]): Promise<Row[]> {
  if (entries.length === 0) return entries;
  const ids = entries.map((entry) => String(entry.id));
  const placeholders = ids.map(() => "?").join(", ");
  const tagJoinRows = (await sql.unsafe(
    `SELECT let.library_entry_id, t.id, t.value, t.weight
     FROM library_entry_tags let
     JOIN tags t ON t.id = let.tag_id
     WHERE let.library_entry_id IN (${placeholders})`,
    ids
  )) as Array<TagRow & { library_entry_id: string }>;

  const tagsByEntry = new Map<string, TagRow[]>();
  for (const row of tagJoinRows) {
    const list = tagsByEntry.get(row.library_entry_id) ?? [];
    list.push({ id: row.id, value: row.value, weight: row.weight });
    tagsByEntry.set(row.library_entry_id, list);
  }

  return entries.map((entry) => ({
    ...entry,
    tags: tagsByEntry.get(String(entry.id)) ?? [],
  }));
}

async function fetchEntriesByIds(ids: string[]): Promise<Row[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const entries = (await sql.unsafe(
    `SELECT * FROM library_entries WHERE id IN (${placeholders})`,
    ids
  )) as Row[];
  return attachTags(entries);
}

async function selectIdsForExpression(
  expression: ASTExpr,
  extras: Extras | null
): Promise<string[]> {
  const searchAst: ASTExpr = { Root: { action: "search", expression } };
  const steps = generate_sql(searchAst, extras);
  const step = steps[0];
  if (!step) return [];
  const matches = (await sql.unsafe(step.sql, step.params)) as Row[];
  return matches.map((row) => String(row.id));
}

app.use(express.json());
app.use(loggerMiddleware);
app.use(
  cors({
    origin: clientOrigin,
  })
);

// biome-ignore lint/correctness/noUnusedFunctionParameters: req unused but required by Express signature
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/users", async (req, res) => {
  const users = await sql`SELECT id, username, email, created_at FROM users`;
  req.log.debug({ count: users.length }, "fetched users");
  res.json(users);
});

app.post("/ezq", async (req, res) => {
  const { query, extras } = req.body as {
    query: string;
    extras?: Extras;
  };
  const extrasOrNull = extras ?? null;

  const ast = generate_ast(query);
  console.log("ast: ", ast);
  if (!("Root" in ast)) {
    return res
      .status(400)
      .json({ error: "Query did not produce a root expression" });
  }

  const { action, expression } = ast.Root;
  const steps = generate_sql(ast, extrasOrNull);

  console.log("steps: ", steps);
  console.log("action: ", action);
  if (action === "search" || action === "delete") {
    const { lastRows } = await runEzqSteps(sql, steps);
    const rows = action === "search" ? await attachTags(lastRows) : [];
    return res.json({ rows });
  }

  if (action === "create") {
    const { valueMap } = await sql.begin((tx) => runEzqSteps(tx, steps));
    const entryId = valueMap.get(ENTRY_ID_TOKEN);
    const rows = entryId ? await fetchEntriesByIds([entryId]) : [];
    return res.json({ rows });
  }

  if (action === "update") {
    if (!("Update" in expression)) {
      return res
        .status(400)
        .json({ error: "Update expression has unexpected shape" });
    }
    const ids = await selectIdsForExpression(
      expression.Update.selection,
      extrasOrNull
    );
    await sql.begin((tx) => runEzqSteps(tx, steps));
    const rows = await fetchEntriesByIds(ids);
    return res.json({ rows });
  }

  return res.status(400).json({ error: `Unsupported action: ${action}` });
});

app.listen(port, () => {
  logger.info({ port }, "Server started");
});
