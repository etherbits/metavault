import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import { AniListSourceIntegration } from "./source-integrations/anilist/source-integration";
import { IgdbSourceIntegration } from "./source-integrations/igdb/source-integration";
import { OpenLibrarySourceIntegration } from "./source-integrations/openlibrary/source-integration";
import { TmdbSourceIntegration } from "./source-integrations/tmdb/source-integration";
import type { EnrichmentSourceType, SourceIntegration } from "./types";

export class SourceIntegrationRegistry {
  private readonly integrations: SourceIntegration[] = [
    new AniListSourceIntegration(),
    new TmdbSourceIntegration(),
    new IgdbSourceIntegration(),
    new OpenLibrarySourceIntegration(),
  ];

  getKnownIntegrations() {
    return this.integrations;
  }

  getConfigSchema(sourceType: EnrichmentSourceType) {
    return this.getKnownIntegration(sourceType)?.configSchema;
  }

  getIntegration(
    row: LibraryEntryWithTags,
    sourceType?: EnrichmentSourceType
  ): SourceIntegration | undefined {
    return this.integrations.find((integration) => {
      if (sourceType && integration.sourceType !== sourceType) return false;
      return integration.supportsEntry(row);
    });
  }

  getKnownIntegration(sourceType: unknown) {
    return this.integrations.find(
      (integration) => integration.sourceType === sourceType
    );
  }
}

export const sourceIntegrationRegistry = new SourceIntegrationRegistry();
