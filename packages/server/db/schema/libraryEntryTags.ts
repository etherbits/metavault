import type { SQL } from "bun";

export async function createLibraryEntryTagsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS library_entry_tags (
      library_entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (library_entry_id, tag_id),
      FOREIGN KEY (library_entry_id) REFERENCES library_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_library_entry_tags_library_entry_id
    ON library_entry_tags(library_entry_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_library_entry_tags_tag_id
    ON library_entry_tags(tag_id)
  `;
}
