import type { SQL } from "bun";

export async function createAliasMappingsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS alias_mappings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      alias TEXT,
      expansion TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;
}
