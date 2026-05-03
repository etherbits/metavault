import type { SQL } from "bun";

export async function createTagsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      value TEXT NOT NULL,
      weight TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_tags_value
    ON tags(value)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_tags_user_id
    ON tags(user_id)
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_value_weight_user_id
    ON tags(value, weight, user_id)
  `;
}
