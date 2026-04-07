import type { SQL } from "bun";

export async function createTagsTable(sql: SQL) {
	await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      library_entry_id TEXT NOT NULL,
      FOREIGN KEY (library_entry_id) REFERENCES library_entries(id)
    )
  `;
}
