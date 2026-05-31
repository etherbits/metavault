import type { LibraryEntryWithTags } from "../../../ezq/ezq.schema";
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
  anilistConfig,
} from "./config";
import {
  type AniListMedia,
  type AniListMediaType,
  type AniListMediaWithContext,
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
      image_src:
        data.media.coverImage?.extraLarge ||
        data.media.coverImage?.large ||
        data.media.coverImage?.medium ||
        null,
      public_rating:
        typeof data.media.averageScore === "number"
          ? data.media.averageScore / 10
          : null,
      // AniList FuzzyDate can omit month/day; store released_at only for full dates.
      // Schema reference: https://studio.apollographql.com/sandbox/explorer?endpoint=https%3A%2F%2Fgraphql.anilist.co
      released_at: this.toReleasedAt(data.media.startDate),
      tags,
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
