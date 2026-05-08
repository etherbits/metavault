import { SQL } from "bun";
import { parsedEnv } from "../env";
import { logger } from "../logger";
import { createAiIntegrationsTable } from "./schema/aiIntegrations";
import { createAliasMappingsTable } from "./schema/aliasMappings";
import { createCollectionEntriesTable } from "./schema/collectionEntries";
import { createCollectionsTable } from "./schema/collections";
import { createContentNodesTable } from "./schema/contentNodes";
import { createLibraryEntriesTable } from "./schema/libraryEntries";
import { createLibraryEntryTagsTable } from "./schema/libraryEntryTags";
import { createOtpCodesTable } from "./schema/otpCodes";
import { createSourceIntegrationsTable } from "./schema/sourceIntegrations";
import { createTagsTable } from "./schema/tags";
import { createUsersTable } from "./schema/users";
import { defaultSeed } from "./seeds/default";

export const sql = new SQL(parsedEnv.DATABASE_URL);

export async function applySchema() {
  await sql`PRAGMA journal_mode = WAL`;
  await sql`PRAGMA foreign_keys = ON`;
  await createUsersTable(sql);
  await createLibraryEntriesTable(sql);
  await createCollectionsTable(sql);
  await createTagsTable(sql);
  await createLibraryEntryTagsTable(sql);
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
