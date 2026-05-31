import type { LibraryEntryWithTags } from "../../../ezq/ezq.schema";
import { logger } from "../../../logger";
import {
  SourceIntegrationResponseCache,
  toSourceCacheKeyPart,
} from "../../source-integration-response-cache";
import { dedupeEnrichedTags } from "../../source-integration-utils";
import type {
  EnrichedLibraryEntryData,
  SourceIntegration,
  SourceIntegrationContext,
} from "../../types";
import {
  OPEN_LIBRARY_COVER_BASE_URL,
  OPEN_LIBRARY_SEARCH_ENDPOINT,
  openLibraryConfig,
} from "./config";
import {
  type OpenLibraryDocWithContext,
  openLibrarySearchResponseSchema,
} from "./schema";

export class OpenLibrarySourceIntegration
  implements SourceIntegration<OpenLibraryDocWithContext>
{
  sourceType = "openlibrary" as const;
  configSchema = openLibraryConfig.schema;
  configFields = openLibraryConfig.fields;
  private readonly responseCache = new SourceIntegrationResponseCache(
    this.sourceType
  );

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return row.media_type === "book";
  }

  async getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<OpenLibraryDocWithContext | null> {
    if (!this.supportsEntry(row)) return null;

    try {
      logger.info(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
        },
        "OpenLibrary enrichment request started"
      );

      // OpenLibrary Search API:
      // https://openlibrary.org/dev/docs/api/search
      const url = new URL(OPEN_LIBRARY_SEARCH_ENDPOINT);
      url.searchParams.set("title", row.title);
      url.searchParams.set("limit", "1");
      url.searchParams.set(
        "fields",
        [
          "key",
          "title",
          "cover_i",
          "first_publish_year",
          "ratings_average",
          "subject",
        ].join(",")
      );

      const parsedData = await this.responseCache.get({
        key: ["book-search", toSourceCacheKeyPart(row.title)].join(":"),
        label: "book_search",
        load: async () => {
          const response = await fetch(url);
          if (!response.ok) {
            logger.warn(
              {
                sourceType: this.sourceType,
                rowId: row.id,
                title: row.title,
                status: response.status,
              },
              "OpenLibrary enrichment request failed"
            );
            return null;
          }

          const parsed = openLibrarySearchResponseSchema.safeParse(
            await response.json()
          );
          if (!parsed.success) {
            logger.warn(
              {
                sourceType: this.sourceType,
                rowId: row.id,
                title: row.title,
                error: parsed.error,
              },
              "OpenLibrary enrichment response was invalid"
            );
            return null;
          }

          return parsed.data;
        },
      });
      if (!parsedData) return null;

      const doc = parsedData.docs?.[0];
      if (!doc) {
        logger.info(
          { sourceType: this.sourceType, rowId: row.id, title: row.title },
          "OpenLibrary enrichment found no book"
        );
        return null;
      }

      logger.info(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          openLibraryKey: doc.key,
          openLibraryTitle: doc.title,
        },
        "OpenLibrary enrichment book selected"
      );
      return { doc, sourceIntegrationId: context.sourceIntegrationId };
    } catch (error) {
      logger.warn(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          error,
        },
        "OpenLibrary enrichment request threw"
      );
      return null;
    }
  }

  mapToLibraryEntry(
    data: OpenLibraryDocWithContext,
    row: LibraryEntryWithTags
  ): EnrichedLibraryEntryData | null {
    const tags = dedupeEnrichedTags(
      [...(data.doc.subject ?? [])]
        .slice(0, 8)
        .map((subject) => subject.trim())
        .filter(Boolean)
        .map((value) => ({ value, weight: "major" as const }))
    );

    logger.info(
      {
        sourceType: this.sourceType,
        rowId: row.id,
        title: row.title,
        openLibraryKey: data.doc.key,
        tagCount: tags.length,
      },
      "OpenLibrary enrichment data mapped"
    );

    return {
      title: data.doc.title || row.title,
      media_id: data.doc.key ?? null,
      source_id: data.sourceIntegrationId,
      media_type: "book",
      image_src: data.doc.cover_i
        ? `${OPEN_LIBRARY_COVER_BASE_URL}/${data.doc.cover_i}-L.jpg`
        : null,
      public_rating:
        typeof data.doc.ratings_average === "number"
          ? data.doc.ratings_average * 2
          : null,
      released_at: data.doc.first_publish_year
        ? `${data.doc.first_publish_year}-01-01`
        : null,
      tags,
    };
  }
}
