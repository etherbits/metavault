import type { SQL } from "bun";

export async function createLibraryEntriesTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS library_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      source_id TEXT,
      image_src TEXT,
      media_type TEXT NOT NULL,
      status TEXT NOT NULL,
      public_rating REAL,
      personal_rating REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (source_id) REFERENCES source_integrations(id)
    )
  `;
}
