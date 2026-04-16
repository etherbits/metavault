import type { SQL } from "bun";

export async function createContentNodesTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS content_nodes (
      id TEXT PRIMARY KEY,
      title TEXT,
      link TEXT,
      order_index INTEGER,
      library_entry_id TEXT NOT NULL,
      FOREIGN KEY (library_entry_id) REFERENCES library_entries(id)
    )
  `;
}
