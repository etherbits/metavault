import { logger } from "../logger";
import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import { z } from "zod";
import type {
  EnrichedLibraryEntryData,
  EnrichmentSourceType,
  SourceIntegration,
  SourceIntegrationContext,
} from "./types";

const sourceIntegrationConfigSchema = z
  .object({
    apiKey: z.string().optional(),
  })
  .catchall(z.unknown());

function supportsMediaType(
  row: LibraryEntryWithTags,
  mediaTypes: Array<NonNullable<LibraryEntryWithTags["media_type"]>>
): boolean {
  return row.media_type ? mediaTypes.includes(row.media_type) : false;
}

function logUnimplementedSourceCall(
  sourceType: EnrichmentSourceType,
  row: LibraryEntryWithTags,
  context: SourceIntegrationContext
) {
  logger.info(
    {
      sourceType,
      command: context.command,
      rowId: row.id,
      title: row.title,
      mediaType: row.media_type,
    },
    "Source integration API call is not implemented yet"
  );
}

export class AniListSourceIntegration implements SourceIntegration<unknown> {
  sourceType = "anilist" as const;
  configSchema = sourceIntegrationConfigSchema;

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return supportsMediaType(row, ["anime", "manga"]);
  }

  async getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<unknown | null> {
    logUnimplementedSourceCall(this.sourceType, row, context);
    return null;
  }

  mapToLibraryEntry(): EnrichedLibraryEntryData | null {
    return null;
  }
}

export class TmdbSourceIntegration implements SourceIntegration<unknown> {
  sourceType = "tmdb" as const;
  configSchema = sourceIntegrationConfigSchema;

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return supportsMediaType(row, ["movie", "tv_show"]);
  }

  async getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<unknown | null> {
    logUnimplementedSourceCall(this.sourceType, row, context);
    return null;
  }

  mapToLibraryEntry(): EnrichedLibraryEntryData | null {
    return null;
  }
}

export class IgdbSourceIntegration implements SourceIntegration<unknown> {
  sourceType = "igdb" as const;
  configSchema = sourceIntegrationConfigSchema;

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return supportsMediaType(row, ["game"]);
  }

  async getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<unknown | null> {
    logUnimplementedSourceCall(this.sourceType, row, context);
    return null;
  }

  mapToLibraryEntry(): EnrichedLibraryEntryData | null {
    return null;
  }
}

export class OpenLibrarySourceIntegration
  implements SourceIntegration<unknown>
{
  sourceType = "openlibrary" as const;
  configSchema = sourceIntegrationConfigSchema;

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return supportsMediaType(row, ["book"]);
  }

  async getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<unknown | null> {
    logUnimplementedSourceCall(this.sourceType, row, context);
    return null;
  }

  mapToLibraryEntry(): EnrichedLibraryEntryData | null {
    return null;
  }
}
