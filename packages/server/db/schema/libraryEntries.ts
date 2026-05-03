import type { SQL } from "bun";

export async function createLibraryEntriesTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS library_entries (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT,
      user_id TEXT NOT NULL,
      media_id TEXT,
      source_id TEXT,
      image_src TEXT,
      media_type TEXT,
      status TEXT,
      public_rating REAL,
      personal_rating REAL,
      released_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (source_id) REFERENCES source_integrations(id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_library_entries_user_id
    ON library_entries(user_id)
  `;
}
