import type { Migration } from "./types";

export const collectionNameUniquenessMigration: Migration = {
  id: "009",
  name: "collection_name_uniqueness",
  async up(sql) {
    await sql`
      UPDATE collections
      SET name = name || ' (' || substr(id, 1, 8) || ')'
      WHERE id IN (
        SELECT id
        FROM (
          SELECT
            id,
            row_number() OVER (
              PARTITION BY user_id, lower(name)
              ORDER BY created_at, id
            ) AS duplicate_rank
          FROM collections
        )
        WHERE duplicate_rank > 1
      )
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_user_name
      ON collections(user_id, lower(name))
    `;
  },
};
