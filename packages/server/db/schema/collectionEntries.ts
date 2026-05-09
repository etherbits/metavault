import type { SQL } from "bun";

export async function createCollectionEntriesTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS collection_entries (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL,
      library_entry_id TEXT NOT NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id),
      FOREIGN KEY (library_entry_id) REFERENCES library_entries(id)
    )
  `;
}
