import type { SQL } from "bun";
import { z } from "zod";

export const TagWeightSchema = z.enum(["major", "minor"]);
export type TagWeight = z.infer<typeof TagWeightSchema>;

export const EmbeddedTagSchema = z.object({
  id: z.string(),
  value: z.string(),
  weight: TagWeightSchema,
});
export type EmbeddedTag = z.infer<typeof EmbeddedTagSchema>;

export const TagSchema = EmbeddedTagSchema.extend({
  user_id: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

export async function createTagsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL COLLATE NOCASE,
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
