import { createAiIntegrationsTable } from "../schema/aiIntegrations";
import { createAliasMappingsTable } from "../schema/aliasMappings";
import { createCollectionEntriesTable } from "../schema/collectionEntries";
import { createCollectionsTable } from "../schema/collections";
import { createContentNodesTable } from "../schema/contentNodes";
import { createLibraryEntriesTable } from "../schema/libraryEntries";
import { createLibraryEntryTagsTable } from "../schema/libraryEntryTags";
import { createOtpCodesTable } from "../schema/otpCodes";
import { createSourceIntegrationsTable } from "../schema/sourceIntegrations";
import { createTagsTable } from "../schema/tags";
import { createUsersTable } from "../schema/users";
import type { Migration } from "./types";

export const initialSchemaMigration: Migration = {
  id: "001",
  name: "initial_schema",
  async up(sql) {
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
  },
};
