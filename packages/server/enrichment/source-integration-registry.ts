import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import {
  AniListSourceIntegration,
  IgdbSourceIntegration,
  OpenLibrarySourceIntegration,
  TmdbSourceIntegration,
} from "./source-integrations";
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

  private getKnownIntegration(sourceType: unknown) {
    return this.integrations.find(
      (integration) => integration.sourceType === sourceType
    );
  }
}

export const sourceIntegrationRegistry = new SourceIntegrationRegistry();
