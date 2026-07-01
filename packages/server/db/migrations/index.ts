import type { SQL } from "bun";
import { logger } from "../../logger";
import { initialSchemaMigration } from "./001_initial_schema";
import { assistantSessionsMigration } from "./002_assistant_sessions";
import { aiIntegrationProfilesMigration } from "./003_ai_integration_profiles";
import { backfillAiIntegrationTimestampsMigration } from "./004_backfill_ai_integration_timestamps";
import { catalogueMigration } from "./005_catalogue";
import { catalogueMediaIdentityMigration } from "./006_catalogue_media_identity";
import { aliasMappingsConstraintsMigration } from "./007_alias_mappings_constraints";
import { userAvatarUrlMigration } from "./008_user_avatar_url";
import { collectionNameUniquenessMigration } from "./009_collection_name_uniqueness";
import type { Migration } from "./types";

const migrations: Migration[] = [
  initialSchemaMigration,
  assistantSessionsMigration,
  aiIntegrationProfilesMigration,
  backfillAiIntegrationTimestampsMigration,
  catalogueMigration,
  catalogueMediaIdentityMigration,
  aliasMappingsConstraintsMigration,
  userAvatarUrlMigration,
  collectionNameUniquenessMigration,
];

export async function migrate(sql: SQL) {
  await sql`PRAGMA journal_mode = WAL`;
  await sql`PRAGMA foreign_keys = ON`;
  await createSchemaMigrationsTable(sql);

  const appliedRows = (await sql`
    SELECT id
    FROM schema_migrations
  `) as Array<{ id: string }>;
  const appliedIds = new Set(appliedRows.map((row) => row.id));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      continue;
    }

    await migration.up(sql);
    await sql`
      INSERT INTO schema_migrations (id, name)
      VALUES (${migration.id}, ${migration.name})
    `;
    logger.info(
      { migration: `${migration.id}_${migration.name}` },
      "Database migration applied"
    );
  }
}

async function createSchemaMigrationsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
}
