import type { CatalogueEntryData } from "../../../catalogue/catalogue.model";
import {
  buildCatalogueEmbeddingText,
  hashEmbeddingText,
} from "../../../catalogue/catalogue-vector";
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

  async getCatalogueEntries(input: {
    topN: number;
    pageSize: number;
    pace: () => Promise<void>;
  }): Promise<CatalogueEntryData[]> {
    const entries: CatalogueEntryData[] = [];
    const pageCount = Math.ceil(input.topN / input.pageSize);

    for (let page = 1; page <= pageCount; page += 1) {
      const url = new URL(OPEN_LIBRARY_SEARCH_ENDPOINT);
      url.searchParams.set("q", "language:eng");
      url.searchParams.set("sort", "rating");
      url.searchParams.set("page", String(page));
      url.searchParams.set(
        "limit",
        String(Math.min(input.pageSize, input.topN - entries.length))
      );
      url.searchParams.set(
        "fields",
        [
          "key",
          "title",
          "cover_i",
          "first_publish_year",
          "ratings_average",
          "ratings_count",
          "subject",
          "author_name",
          "first_sentence",
        ].join(",")
      );

      const response = await fetch(url);
      if (!response.ok) {
        logger.warn(
          { sourceType: this.sourceType, status: response.status, page },
          "OpenLibrary catalogue request failed"
        );
        await input.pace();
        continue;
      }

      const parsed = openLibrarySearchResponseSchema.safeParse(
        await response.json()
      );
      if (!parsed.success) {
        logger.warn(
          { sourceType: this.sourceType, error: parsed.error },
          "OpenLibrary catalogue response was invalid"
        );
        await input.pace();
        continue;
      }

      entries.push(
        ...(parsed.data.docs ?? [])
          .slice(0, input.topN - entries.length)
          .map((doc) => this.toCatalogueEntry(doc))
      );
      await input.pace();
    }

    return entries;
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

  private toCatalogueEntry(
    doc: OpenLibraryDocWithContext["doc"]
  ): CatalogueEntryData {
    const title = doc.title || "Unknown OpenLibrary book";
    const sourceMediaId =
      doc.key ?? `title:${hashEmbeddingText(title).slice(0, 16)}`;
    const genres = [...(doc.subject ?? [])]
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12);
    const description = Array.isArray(doc.first_sentence)
      ? (doc.first_sentence[0] ?? null)
      : (doc.first_sentence ?? null);
    const embeddingText = buildCatalogueEmbeddingText({
      title,
      mediaType: "book",
      genres,
      tags: [],
      description,
    });

    return {
      id: `openlibrary-${sourceMediaId.replace(/^\/+/, "").replaceAll("/", "-")}`,
      source_type: "openlibrary",
      source_media_id: sourceMediaId,
      media_type: "book",
      title,
      description,
      image_src: doc.cover_i
        ? `${OPEN_LIBRARY_COVER_BASE_URL}/${doc.cover_i}-L.jpg`
        : null,
      adult: false,
      public_rating:
        typeof doc.ratings_average === "number"
          ? doc.ratings_average * 2
          : null,
      popularity:
        typeof doc.ratings_count === "number" ? doc.ratings_count : null,
      released_at: doc.first_publish_year
        ? `${doc.first_publish_year}-01-01`
        : null,
      genres,
      tags: [],
      metadata: { authors: doc.author_name ?? [] },
      embedding_text_hash: hashEmbeddingText(embeddingText),
    };
  }
}
