import type { LibraryEntryWithTags } from "../../../ezq/ezq.schema";
import type { CatalogueEntryData } from "../../../catalogue/catalogue.model";
import {
  buildCatalogueEmbeddingText,
  hashEmbeddingText,
} from "../../../catalogue/catalogue-vector";
import { logger } from "../../../logger";
import { toDateStringFromYearMonthDay } from "../../../utils/date";
import { getTrimmedString } from "../../../utils/string";
import {
  SourceIntegrationResponseCache,
  toSourceCacheKeyPart,
  toSourceCredentialCacheKeyPart,
} from "../../source-integration-response-cache";
import type {
  EnrichedLibraryEntryData,
  SourceIntegration,
  SourceIntegrationContext,
} from "../../types";
import {
  ANILIST_GRAPHQL_ENDPOINT,
  ANILIST_MEDIA_SEARCH_QUERY,
  ANILIST_POPULAR_MEDIA_QUERY,
  anilistConfig,
} from "./config";
import {
  type AniListMedia,
  type AniListMediaType,
  type AniListMediaWithContext,
  anilistPopularMediaResponseSchema,
  anilistResponseSchema,
} from "./schema";

export class AniListSourceIntegration
  implements SourceIntegration<AniListMediaWithContext>
{
  sourceType = "anilist" as const;
  configSchema = anilistConfig.schema;
  configFields = anilistConfig.fields;
  private readonly responseCache = new SourceIntegrationResponseCache(
    this.sourceType
  );

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return row.media_type === "anime" || row.media_type === "manga";
  }

  async getCatalogueEntries(input: {
    topN: number;
    pageSize: number;
    pace: () => Promise<void>;
  }): Promise<CatalogueEntryData[]> {
    const entries: CatalogueEntryData[] = [];

    for (const type of ["ANIME", "MANGA"] as const) {
      const pageCount = Math.ceil(input.topN / input.pageSize);
      for (let page = 1; page <= pageCount; page += 1) {
        const media = await this.getPopularMediaPage({
          type,
          page,
          perPage: input.pageSize,
        });
        entries.push(
          ...media.slice(0, input.topN - countEntriesForType(entries, type))
        );
        await input.pace();
      }
    }

    return entries;
  }

  async getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<AniListMediaWithContext | null> {
    const mediaType = this.toAniListMediaType(row);
    if (!mediaType) return null;

    try {
      logger.info(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
          anilistMediaType: mediaType,
          hasApiKey: Boolean(getTrimmedString(context.config.apiKey)),
        },
        "AniList enrichment request started"
      );

      const parsedData = await this.responseCache.get({
        key: [
          "media-search",
          mediaType,
          toSourceCacheKeyPart(row.title),
          toSourceCredentialCacheKeyPart(
            getTrimmedString(context.config.apiKey)
          ),
        ].join(":"),
        label: "media_search",
        load: async () => {
          const response = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
            method: "POST",
            headers: this.getRequestHeaders(context.config.apiKey),
            body: JSON.stringify({
              query: ANILIST_MEDIA_SEARCH_QUERY,
              variables: {
                search: row.title,
                type: mediaType,
              },
            }),
          });

          if (!response.ok) {
            logger.warn(
              {
                sourceType: this.sourceType,
                rowId: row.id,
                title: row.title,
                status: response.status,
              },
              "AniList enrichment request failed"
            );
            return null;
          }

          const parsed = anilistResponseSchema.safeParse(await response.json());
          if (!parsed.success) {
            logger.warn(
              {
                sourceType: this.sourceType,
                rowId: row.id,
                title: row.title,
                error: parsed.error,
              },
              "AniList enrichment response was invalid"
            );
            return null;
          }

          if (parsed.data.errors?.length) {
            logger.warn(
              {
                sourceType: this.sourceType,
                rowId: row.id,
                title: row.title,
                errors: parsed.data.errors,
              },
              "AniList enrichment returned GraphQL errors"
            );
            return null;
          }

          return parsed.data;
        },
      });
      if (!parsedData) return null;

      const media = parsedData.data?.Media;
      if (!media) {
        logger.info(
          {
            sourceType: this.sourceType,
            rowId: row.id,
            title: row.title,
            mediaType: row.media_type,
            anilistMediaType: mediaType,
          },
          "AniList enrichment found no media"
        );
        return null;
      }

      logger.info(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
          anilistMediaType: mediaType,
          anilistId: media.id,
          anilistTitle:
            media.title?.english ||
            media.title?.romaji ||
            media.title?.userPreferred ||
            media.title?.native,
        },
        "AniList enrichment media selected"
      );
      return { media, sourceIntegrationId: context.sourceIntegrationId };
    } catch (error) {
      logger.warn(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          error,
        },
        "AniList enrichment request threw"
      );
      return null;
    }
  }

  mapToLibraryEntry(
    data: AniListMediaWithContext,
    row: LibraryEntryWithTags
  ): EnrichedLibraryEntryData | null {
    const tags = this.toTags(data.media);
    logger.info(
      {
        sourceType: this.sourceType,
        rowId: row.id,
        title: row.title,
        anilistId: data.media.id,
        tagCount: tags.length,
      },
      "AniList enrichment data mapped"
    );

    return {
      title:
        data.media.title?.english ||
        data.media.title?.romaji ||
        data.media.title?.userPreferred ||
        data.media.title?.native ||
        row.title,
      media_id: String(data.media.id),
      source_id: data.sourceIntegrationId,
      media_type: data.media.type === "ANIME" ? "anime" : "manga",
      adult: data.media.isAdult === true,
      image_src:
        data.media.coverImage?.extraLarge ||
        data.media.coverImage?.large ||
        data.media.coverImage?.medium ||
        null,
      public_rating:
        typeof data.media.averageScore === "number"
          ? data.media.averageScore / 10
          : null,
      released_at: this.toReleasedAt(data.media.startDate),
      tags,
    };
  }

  private async getPopularMediaPage(input: {
    type: AniListMediaType;
    page: number;
    perPage: number;
  }): Promise<CatalogueEntryData[]> {
    const response = await fetchWithRetry(ANILIST_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: this.getRequestHeaders(undefined),
      body: JSON.stringify({
        query: ANILIST_POPULAR_MEDIA_QUERY,
        variables: input,
      }),
    });

    if (!response.ok) {
      logger.warn(
        { sourceType: this.sourceType, status: response.status, ...input },
        "AniList catalogue request failed"
      );
      return [];
    }

    const parsed = anilistPopularMediaResponseSchema.safeParse(
      await response.json()
    );
    if (!parsed.success || parsed.data.errors?.length) {
      logger.warn(
        {
          sourceType: this.sourceType,
          error: parsed.success ? parsed.data.errors : parsed.error,
        },
        "AniList catalogue response was invalid"
      );
      return [];
    }

    return (parsed.data.data?.Page?.media ?? []).map((media) =>
      this.toCatalogueEntry(media)
    );
  }

  private toCatalogueEntry(media: AniListMedia): CatalogueEntryData {
    const title =
      media.title?.english ||
      media.title?.romaji ||
      media.title?.userPreferred ||
      media.title?.native ||
      `AniList ${media.id}`;
    const genres = [...(media.genres ?? [])]
      .map((genre) => genre.trim())
      .filter(Boolean);
    const tags = [...(media.tags ?? [])]
      .map((tag) => tag.name?.trim())
      .filter((value): value is string => Boolean(value));
    const mediaType = media.type === "ANIME" ? "anime" : "manga";
    const description = media.description ?? null;
    const embeddingText = buildCatalogueEmbeddingText({
      title,
      mediaType,
      genres,
      tags,
      description,
    });

    return {
      id: `anilist-${media.id}`,
      source_type: "anilist",
      source_media_id: String(media.id),
      media_type: mediaType,
      title,
      description,
      image_src:
        media.coverImage?.extraLarge ||
        media.coverImage?.large ||
        media.coverImage?.medium ||
        null,
      adult: media.isAdult === true,
      public_rating:
        typeof media.averageScore === "number" ? media.averageScore / 10 : null,
      popularity:
        typeof media.popularity === "number" ? media.popularity : null,
      released_at: this.toCatalogueReleasedAt(media.startDate),
      genres,
      tags,
      metadata: {
        title: media.title ?? null,
        type: media.type,
      },
      embedding_text_hash: hashEmbeddingText(embeddingText),
    };
  }

  private getRequestHeaders(apiKey: unknown): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const token = getTrimmedString(apiKey);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private toAniListMediaType(
    row: LibraryEntryWithTags
  ): AniListMediaType | null {
    switch (row.media_type?.toLowerCase()) {
      case "anime":
        return "ANIME";
      case "manga":
        return "MANGA";
      default:
        return null;
    }
  }

  private toReleasedAt(startDate: AniListMedia["startDate"]): string | null {
    if (!startDate) return null;
    return toDateStringFromYearMonthDay(startDate);
  }

  private toCatalogueReleasedAt(
    startDate: AniListMedia["startDate"]
  ): string | null {
    if (!startDate) return null;
    if (!startDate.year) return null;
    return [
      String(startDate.year).padStart(4, "0"),
      String(startDate.month ?? 1).padStart(2, "0"),
      String(startDate.day ?? 1).padStart(2, "0"),
    ].join("-");
  }

  private toTags(
    media: AniListMedia
  ): NonNullable<EnrichedLibraryEntryData["tags"]> {
    const genreValues = [...(media.genres ?? [])]
      .map((genre) => genre.trim())
      .filter(Boolean);
    const seenValues = new Set(genreValues);

    return [
      ...genreValues.map((value) => ({ value, weight: "major" as const })),
      ...[...(media.tags ?? [])]
        .map((tag) => tag.name?.trim())
        .filter((value): value is string => Boolean(value))
        .filter((value) => {
          if (seenValues.has(value)) return false;
          seenValues.add(value);
          return true;
        })
        .map((value) => ({ value, weight: "minor" as const })),
    ];
  }
}

function countEntriesForType(
  entries: CatalogueEntryData[],
  type: AniListMediaType
) {
  const mediaType = type === "ANIME" ? "anime" : "manga";
  return entries.filter((entry) => entry.media_type === mediaType).length;
}

async function fetchWithRetry(url: string, init: RequestInit) {
  let response = await fetch(url, init);
  for (let attempt = 0; response.status === 429 && attempt < 3; attempt += 1) {
    await sleep(getRetryAfterMs(response) ?? 1000 * (attempt + 1));
    response = await fetch(url, init);
  }
  return response;
}

function getRetryAfterMs(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
