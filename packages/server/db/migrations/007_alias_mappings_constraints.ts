import type { Migration } from "./types";

export const aliasMappingsConstraintsMigration: Migration = {
  id: "007",
  name: "alias_mappings_constraints",
  async up(sql) {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_alias_mappings_user_alias
      ON alias_mappings (user_id, alias)
    `;
  },
};
