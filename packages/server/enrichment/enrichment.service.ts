import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import { libraryModel } from "../library/library.model";
import { sourceIntegrationModel } from "../source-integrations/source-integration.model";
import { sourceIntegrationRegistry } from "./source-integration-registry";
import type {
  EnrichedLibraryEntryData,
  EnrichmentCommand,
  SourceIntegrationContext,
} from "./types";

const ENRICHMENT_UPDATE_CONCURRENCY = 5;

export class EnrichmentService {
  async extendResponse({
    command,
    rows,
    userId,
  }: {
    command: EnrichmentCommand;
    rows: LibraryEntryWithTags[];
    userId: string | null;
  }): Promise<LibraryEntryWithTags[]> {
    return Promise.all(
      rows.map(async (row) => {
        const enrichment = await this.getMappedData(row, command, userId);
        if (!enrichment) return row;
        return this.mergeRow(row, enrichment, command.mode);
      })
    );
  }

  async updateEntry({
    command,
    rows,
    userId,
  }: {
    command: EnrichmentCommand;
    rows: LibraryEntryWithTags[];
    userId: string | null;
  }): Promise<LibraryEntryWithTags[]> {
    if (!userId) return rows;

    const nextRows: LibraryEntryWithTags[] = [];

    for (
      let index = 0;
      index < rows.length;
      index += ENRICHMENT_UPDATE_CONCURRENCY
    ) {
      const batch = rows.slice(index, index + ENRICHMENT_UPDATE_CONCURRENCY);
      const batchRows = await Promise.all(
        batch.map(async (row) => {
          const enrichment = await this.getMappedData(row, command, userId);
          if (!enrichment) return row;

          const updatedRow = await libraryModel.updateEntryFromEnrichment({
            entryId: row.id,
            userId,
            data: enrichment,
            mode: command.mode,
          });
          return updatedRow ?? row;
        })
      );
      nextRows.push(...batchRows);
    }

    return nextRows;
  }

  private async getMappedData(
    row: LibraryEntryWithTags,
    command: EnrichmentCommand,
    userId: string | null
  ): Promise<EnrichedLibraryEntryData | null> {
    const integration = sourceIntegrationRegistry.getIntegration(
      row,
      command.sourceType
    );
    if (!integration || !userId) return null;

    const sourceIntegration = await sourceIntegrationModel.getByUserAndType(
      userId,
      integration.sourceType
    );
    if (!sourceIntegration || sourceIntegration.is_active !== 1) return null;

    const config = integration.configSchema.parse(
      this.parseConfigJson(sourceIntegration.config_json)
    );
    const context: SourceIntegrationContext = { command, userId, config };
    const sourceData = await integration.getEnrichmentData(row, context);
    if (!sourceData) return null;

    return integration.mapToLibraryEntry(sourceData, row);
  }

  private parseConfigJson(configJson: string | null): Record<string, unknown> {
    if (!configJson) return {};
    const parsed = JSON.parse(configJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  }

  private mergeRow(
    row: LibraryEntryWithTags,
    enrichment: EnrichedLibraryEntryData,
    mode: EnrichmentCommand["mode"]
  ): LibraryEntryWithTags {
    const { tags, ...entryFields } = enrichment;
    if (mode === "add") {
      return {
        ...row,
        ...this.getMissingEntryFields(row, entryFields),
        tags: tags ? this.addVirtualTags(row, tags) : row.tags,
      };
    }

    return {
      ...row,
      ...entryFields,
      tags: tags ? this.toVirtualTags(row.id, tags) : row.tags,
    };
  }

  private getMissingEntryFields(
    row: LibraryEntryWithTags,
    entryFields: Omit<EnrichedLibraryEntryData, "tags">
  ): Omit<EnrichedLibraryEntryData, "tags"> {
    const missingFields: Omit<EnrichedLibraryEntryData, "tags"> = {};

    for (const key of Object.keys(entryFields) as Array<
      keyof Omit<EnrichedLibraryEntryData, "tags">
    >) {
      const value = entryFields[key];
      if (!this.isMissingValue(row[key]) || this.isMissingValue(value)) {
        continue;
      }
      missingFields[key] = value as never;
    }

    return missingFields;
  }

  private addVirtualTags(
    row: LibraryEntryWithTags,
    tags: NonNullable<EnrichedLibraryEntryData["tags"]>
  ): LibraryEntryWithTags["tags"] {
    const existing = new Set(
      row.tags.map((tag) => this.getTagIdentity(tag.value, tag.weight))
    );
    const newTags = tags.filter((tag) => {
      const identity = this.getTagIdentity(tag.value, tag.weight);
      if (existing.has(identity)) return false;
      existing.add(identity);
      return true;
    });

    return [...row.tags, ...this.toVirtualTags(row.id, newTags)];
  }

  private getTagIdentity(value: string, weight: string): string {
    return `${weight}:${value}`;
  }

  private isMissingValue(value: unknown): boolean {
    return value == null || value === "";
  }

  private toVirtualTags(
    entryId: string,
    tags: NonNullable<EnrichedLibraryEntryData["tags"]>
  ): LibraryEntryWithTags["tags"] {
    return tags.map((tag, index) => ({
      id: `enrichment:${entryId}:${tag.weight}:${tag.value}:${index}`,
      value: tag.value,
      weight: tag.weight,
    }));
  }
}
