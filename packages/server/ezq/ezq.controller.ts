import { Router } from "express";
import { sql } from "../db";
import { authMiddleware } from "../middleware/isAuth";

type EzqRow = {
  id: string;
  user_id: string;
  title: string;
  status: string | null;
  tags: Array<{ value: string; weight: "major" }>;
};

function tokenToTitle(token: string): string {
  return token.replaceAll("_", " ").trim();
}

function parseTag(query: string): string | null {
  const match = query.match(/\btg:([^\s>]+)/i);
  return match?.[1]?.trim() || null;
}

function parseStatus(query: string): string | null {
  const match = query.match(/\bstatus:([^\s>]+)/i);
  if (!match?.[1]) return null;

  const raw = match[1].trim().toLowerCase();
  if (raw === "progress") return "in_progress";
  return raw;
}

function parseId(query: string): string | null {
  const match = query.match(/\bid:([^\s>]+)/i);
  return match?.[1]?.trim() || null;
}

async function withTags(rows: Array<{ id: string } & Record<string, unknown>>) {
  if (rows.length === 0) {
    return [] as EzqRow[];
  }

  const ids = rows.map((row) => row.id);
  const tagRows = await sql`
    SELECT library_entry_id, value
    FROM tags
    WHERE library_entry_id IN ${sql(ids)}
  `;

  const tagsByEntry = new Map<
    string,
    Array<{ value: string; weight: "major" }>
  >();
  for (const tagRow of tagRows as Array<{
    library_entry_id: string;
    value: string;
  }>) {
    const current = tagsByEntry.get(tagRow.library_entry_id) ?? [];
    current.push({ value: tagRow.value, weight: "major" });
    tagsByEntry.set(tagRow.library_entry_id, current);
  }

  return rows.map((row) => ({
    ...(row as unknown as Omit<EzqRow, "tags">),
    tags: tagsByEntry.get(row.id) ?? [],
  }));
}

export const ezqRouter = Router();

ezqRouter.post("/", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const query = String(req.body?.query ?? "").trim();
  if (!query.startsWith("/")) {
    return res.status(400).json({ message: "Invalid query" });
  }

  if (query.startsWith("/create ")) {
    const [, titleToken = ""] = query.split(/\s+/, 2);
    const title = tokenToTitle(titleToken || "untitled");
    const id = crypto.randomUUID();
    const tag = parseTag(query);

    const created = await sql`
      INSERT INTO library_entries (id, user_id, title, media_id, media_type, status)
      VALUES (${id}, ${userId}, ${title}, ${id}, ${"movie"}, ${"planning"})
      RETURNING id, user_id, title, status
    `;

    if (tag) {
      await sql`
        INSERT INTO tags (id, value, library_entry_id)
        VALUES (${crypto.randomUUID()}, ${tag}, ${id})
      `;
    }

    return res.json({ rows: await withTags(created as Array<{ id: string }>) });
  }

  if (query === "/s") {
    const rows = await sql`
      SELECT id, user_id, title, status
      FROM library_entries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return res.json({ rows: await withTags(rows as Array<{ id: string }>) });
  }

  if (query.startsWith("/search ")) {
    const tag = parseTag(query);
    if (!tag) {
      return res.json({ rows: [] });
    }

    const rows = await sql`
      SELECT le.id, le.user_id, le.title, le.status
      FROM library_entries le
      INNER JOIN tags t ON t.library_entry_id = le.id
      WHERE le.user_id = ${userId} AND t.value = ${tag}
      ORDER BY le.created_at DESC
    `;
    return res.json({ rows: await withTags(rows as Array<{ id: string }>) });
  }

  if (query.startsWith("/delete ")) {
    const id = parseId(query);
    if (!id) {
      return res.status(400).json({ message: "Missing id" });
    }

    await sql`DELETE FROM tags WHERE library_entry_id = ${id}`;
    await sql`
      DELETE FROM library_entries
      WHERE id = ${id} AND user_id = ${userId}
    `;

    return res.json({ rows: [] });
  }

  if (query.startsWith("/u ")) {
    const match = query.match(/^\/u\s+([^\s]+)\s*>\s*/i);
    const titleToken = match?.[1];
    const status = parseStatus(query);
    if (!titleToken || !status) {
      return res.status(400).json({ message: "Invalid update query" });
    }

    const title = tokenToTitle(titleToken);
    const updated = await sql`
      UPDATE library_entries
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND title = ${title}
      RETURNING id, user_id, title, status
    `;

    return res.json({ rows: await withTags(updated as Array<{ id: string }>) });
  }

  if (query.startsWith("/update ")) {
    const id = parseId(query);
    if (!id) {
      return res.status(400).json({ message: "Missing id" });
    }

    const status = parseStatus(query);
    const tag = parseTag(query);

    if (status) {
      await sql`
        UPDATE library_entries
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND user_id = ${userId}
      `;
    }

    if (tag) {
      const existing = await sql`
        SELECT id FROM tags
        WHERE library_entry_id = ${id} AND value = ${tag}
        LIMIT 1
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO tags (id, value, library_entry_id)
          VALUES (${crypto.randomUUID()}, ${tag}, ${id})
        `;
      }
    }

    const updated = await sql`
      SELECT id, user_id, title, status
      FROM library_entries
      WHERE id = ${id} AND user_id = ${userId}
      LIMIT 1
    `;

    return res.json({ rows: await withTags(updated as Array<{ id: string }>) });
  }

  return res.status(400).json({ message: "Unsupported query" });
});
