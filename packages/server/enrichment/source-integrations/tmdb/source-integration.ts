import type { LibraryEntryWithTags } from "../../../ezq/ezq.schema";
import { logger } from "../../../logger";
import { getTrimmedString } from "../../../utils/string";
import {
  SourceIntegrationResponseCache,
  toSourceCacheKeyPart,
  toSourceCredentialCacheKeyPart,
} from "../../source-integration-response-cache";
import {
  dedupeEnrichedTags,
  logSourceCallSkipped,
} from "../../source-integration-utils";
import type {
  EnrichedLibraryEntryData,
  SourceIntegration,
  SourceIntegrationContext,
} from "../../types";
import { TMDB_API_BASE_URL, TMDB_IMAGE_BASE_URL, tmdbConfig } from "./config";
import {
  type TmdbGenreListResponse,
  type TmdbMediaWithContext,
  tmdbGenreListResponseSchema,
  tmdbSearchResponseSchema,
} from "./schema";

export class TmdbSourceIntegration
  implements SourceIntegration<TmdbMediaWithContext>
{
  sourceType = "tmdb" as const;
  configSchema = tmdbConfig.schema;
  configFields = tmdbConfig.fields;
  private readonly responseCache = new SourceIntegrationResponseCache(
    this.sourceType
  );

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return row.media_type === "movie" || row.media_type === "tv_show";
  }

  async getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<TmdbMediaWithContext | null> {
    const mediaType = this.toTmdbMediaType(row);
    const apiKey = getTrimmedString(context.config.apiKey);
    if (!mediaType) return null;
    if (!apiKey) {
      logSourceCallSkipped(this.sourceType, row, "missing_api_key");
      return null;
    }

    try {
      logger.info(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
          tmdbMediaType: mediaType,
        },
        "TMDB enrichment request started"
      );

      // TMDB search endpoint and detail workflow:
      // https://developer.themoviedb.org/docs/search-and-query-for-details
      const url = new URL(`${TMDB_API_BASE_URL}/search/${mediaType}`);
      url.searchParams.set("query", row.title);
      url.searchParams.set("api_key", apiKey);

      const parsedData = await this.responseCache.get({
        key: [
          "media-search",
          mediaType,
          toSourceCacheKeyPart(row.title),
          toSourceCredentialCacheKeyPart(apiKey),
        ].join(":"),
        label: "media_search",
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
              "TMDB enrichment request failed"
            );
            return null;
          }

          const parsed = tmdbSearchResponseSchema.safeParse(
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
              "TMDB enrichment response was invalid"
            );
            return null;
          }

          return parsed.data;
        },
      });
      if (!parsedData) return null;

      const media = parsedData.results?.[0];
      if (!media) {
        logger.info(
          {
            sourceType: this.sourceType,
            rowId: row.id,
            title: row.title,
            mediaType: row.media_type,
          },
          "TMDB enrichment found no media"
        );
        return null;
      }

      logger.info(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          tmdbId: media.id,
        },
        "TMDB enrichment media selected"
      );
      const genreNamesById = await this.getGenreNamesById(mediaType, apiKey);
      return {
        media,
        mediaType,
        genreNamesById,
        sourceIntegrationId: context.sourceIntegrationId,
      };
    } catch (error) {
      logger.warn(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          error,
        },
        "TMDB enrichment request threw"
      );
      return null;
    }
  }

  mapToLibraryEntry(
    data: TmdbMediaWithContext,
    row: LibraryEntryWithTags
  ): EnrichedLibraryEntryData | null {
    const title = this.getTmdbTitle(data);
    const releasedAt = this.getTmdbReleasedAt(data);
    const tags = this.getTmdbTags(data);

    logger.info(
      {
        sourceType: this.sourceType,
        rowId: row.id,
        title: row.title,
        tmdbId: data.media.id,
      },
      "TMDB enrichment data mapped"
    );

    return {
      title: title || row.title,
      media_id: String(data.media.id),
      source_id: data.sourceIntegrationId,
      media_type: data.mediaType === "movie" ? "movie" : "tv_show",
      image_src: data.media.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${data.media.poster_path}`
        : null,
      public_rating:
        typeof data.media.vote_average === "number"
          ? data.media.vote_average
          : null,
      released_at: releasedAt || null,
      tags,
    };
  }

  private getTmdbTags(data: TmdbMediaWithContext) {
    return dedupeEnrichedTags(
      (data.media.genre_ids ?? [])
        .map((genreId) => data.genreNamesById.get(genreId))
        .filter((value): value is string => Boolean(value))
        .map((value) => ({ value, weight: "major" as const }))
    );
  }

  private async getGenreNamesById(
    mediaType: "movie" | "tv",
    apiKey: string
  ): Promise<Map<number, string>> {
    const genreList = await this.responseCache.get<TmdbGenreListResponse>({
      key: [
        "genre-list",
        mediaType,
        toSourceCredentialCacheKeyPart(apiKey),
      ].join(":"),
      label: "genre_list",
      load: async () => {
        // TMDB genre list endpoints:
        // https://developer.themoviedb.org/reference/genre-movie-list
        // https://developer.themoviedb.org/reference/genre-tv-list
        const url = new URL(`${TMDB_API_BASE_URL}/genre/${mediaType}/list`);
        url.searchParams.set("api_key", apiKey);

        const response = await fetch(url);
        if (!response.ok) {
          logger.warn(
            {
              sourceType: this.sourceType,
              tmdbMediaType: mediaType,
              status: response.status,
            },
            "TMDB genre list request failed"
          );
          return null;
        }

        const parsed = tmdbGenreListResponseSchema.safeParse(
          await response.json()
        );
        if (!parsed.success) {
          logger.warn(
            {
              sourceType: this.sourceType,
              tmdbMediaType: mediaType,
              error: parsed.error,
            },
            "TMDB genre list response was invalid"
          );
          return null;
        }

        return parsed.data;
      },
    });

    return new Map(
      (genreList?.genres ?? []).map((genre) => [genre.id, genre.name])
    );
  }

  private getTmdbTitle(data: TmdbMediaWithContext): string | null | undefined {
    switch (data.mediaType) {
      case "movie":
        return "title" in data.media
          ? data.media.title || data.media.original_title
          : null;
      case "tv":
        return "name" in data.media
          ? data.media.name || data.media.original_name
          : null;
    }
  }

  private getTmdbReleasedAt(
    data: TmdbMediaWithContext
  ): string | null | undefined {
    switch (data.mediaType) {
      case "movie":
        return "release_date" in data.media ? data.media.release_date : null;
      case "tv":
        return "first_air_date" in data.media
          ? data.media.first_air_date
          : null;
    }
  }

  private toTmdbMediaType(row: LibraryEntryWithTags): "movie" | "tv" | null {
    switch (row.media_type) {
      case "movie":
        return "movie";
      case "tv_show":
        return "tv";
      default:
        return null;
    }
  }
}
