import { SQL } from "bun";
import { logger } from "../logger";
import { createUsersTable } from "./schema/users";
import { createLibraryEntriesTable } from "./schema/libraryEntries";
import { createTagsTable } from "./schema/tags";
import { createSourceIntegrationsTable } from "./schema/sourceIntegrations";
import { createAiIntegrationsTable } from "./schema/aiIntegrations";
import { createAliasMappingsTable } from "./schema/aliasMappings";
import { createContentNodesTable } from "./schema/contentNodes";
import { createCollectionsTable } from "./schema/collections";
import { createCollectionEntriesTable } from "./schema/collectionEntries";
import { createOtpCodesTable } from "./schema/otpCodes";
import { defaultSeed } from "./seeds/default";

// biome-ignore lint/complexity/useLiteralKeys: bracket notation keeps env var names explicit
const DATABASE_URL = process.env["DATABASE_URL"] ?? "sqlite://./data/db.sqlite";

export const sql = new SQL(DATABASE_URL);

export async function applySchema() {
  await sql`PRAGMA journal_mode = WAL`;
  await sql`PRAGMA foreign_keys = ON`;
  await createUsersTable(sql);
  await createLibraryEntriesTable(sql);
  await createCollectionsTable(sql);
  await createTagsTable(sql);
  await createSourceIntegrationsTable(sql);
  await createAiIntegrationsTable(sql);
  await createAliasMappingsTable(sql);
  await createContentNodesTable(sql);
  await createCollectionEntriesTable(sql);
  await createOtpCodesTable(sql);
  logger.debug("Schema applied.");
}

export async function seed() {
  await defaultSeed(sql);
  logger.debug("Seed complete.");
}
