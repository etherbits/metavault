import type { Migration } from "./types";

export const catalogueMediaIdentityMigration: Migration = {
  id: "006",
  name: "catalogue_media_identity",
  async up(sql) {
    await sql`DROP INDEX IF EXISTS idx_catalogue_entries_source_media`;
    await sql`
      CREATE UNIQUE INDEX idx_catalogue_entries_source_media
      ON catalogue_entries(source_type, source_media_id, media_type)
    `;
  },
};
