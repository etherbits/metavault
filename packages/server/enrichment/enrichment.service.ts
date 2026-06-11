import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import { libraryModel } from "../library/library.model";
import { logger } from "../logger";
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
    logger.info(
      {
        command,
        rowCount: rows.length,
      },
      "Extending enrichment response"
    );

    return Promise.all(
      rows.map(async (row) => {
        const enrichment = await this.getMappedData(row, command, userId);
        if (!enrichment) {
          logger.info(
            {
              command,
              rowId: row.id,
              title: row.title,
              mediaType: row.media_type,
            },
            "No response enrichment available for row"
          );
          return row;
        }

        logger.info(
          {
            command,
            rowId: row.id,
            title: row.title,
            mediaType: row.media_type,
          },
          "Response enrichment applied to row"
        );
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
    logger.info(
      {
        command,
        rowCount: rows.length,
      },
      "Persisting enrichment updates"
    );

    if (!userId) {
      logger.info(
        {
          command,
          rowCount: rows.length,
        },
        "Enrichment persistence skipped because user is anonymous"
      );
      return rows;
    }

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
          if (!enrichment) {
            logger.info(
              {
                command,
                rowId: row.id,
                title: row.title,
                mediaType: row.media_type,
              },
              "No persisted enrichment available for row"
            );
            return row;
          }

          const updatedRow = await libraryModel.updateEntryFromEnrichment({
            entryId: row.id,
            userId,
            data: enrichment,
            mode: command.mode,
          });
          logger.info(
            {
              command,
              rowId: row.id,
              title: row.title,
              mediaType: row.media_type,
              updated: Boolean(updatedRow),
            },
            "Persisted enrichment update completed for row"
          );
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
    if (!integration) {
      logger.info(
        {
          command,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
        },
        "No source integration supports row"
      );
      return null;
    }

    logger.info(
      {
        command,
        rowId: row.id,
        title: row.title,
        mediaType: row.media_type,
        sourceType: integration.sourceType,
      },
      "Source integration selected for row"
    );

    if (!userId) return null;

    const sourceIntegration = await sourceIntegrationModel.getByUserAndType(
      userId,
      integration.sourceType
    );
    if (!sourceIntegration) {
      logger.info(
        {
          command,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
          sourceType: integration.sourceType,
        },
        "Source integration settings are missing for user"
      );
      return null;
    }

    if (sourceIntegration.is_active !== 1) {
      logger.info(
        {
          command,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
          sourceType: integration.sourceType,
        },
        "Source integration is inactive for user"
      );
      return null;
    }

    const config = integration.configSchema.parse(
      this.parseConfigJson(sourceIntegration.config_json)
    );
    const context: SourceIntegrationContext = {
      command,
      userId,
      config,
      sourceIntegrationId: sourceIntegration.id,
    };
    const sourceData = await integration.getEnrichmentData(row, context);
    if (!sourceData) {
      logger.info(
        {
          command,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
          sourceType: integration.sourceType,
        },
        "Source integration returned no enrichment data"
      );
      return null;
    }

    const mappedData = integration.mapToLibraryEntry(sourceData, row);
    logger.info(
      {
        command,
        rowId: row.id,
        title: row.title,
        mediaType: row.media_type,
        sourceType: integration.sourceType,
        mapped: Boolean(mappedData),
      },
      "Source integration mapping completed"
    );
    return mappedData;
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
    return value == null || value === "" || value === false;
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
