import { z } from "zod";
import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import { logger } from "../logger";
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

const ANILIST_GRAPHQL_ENDPOINT = "https://graphql.anilist.co";

// AniList GraphQL requests and Media search arguments:
// https://docs.anilist.co/guide/graphql
// https://studio.apollographql.com/sandbox/explorer?endpoint=https%3A%2F%2Fgraphql.anilist.co
const ANILIST_MEDIA_SEARCH_QUERY = `
  query SearchAniListMedia($search: String!, $type: MediaType!) {
    Media(search: $search, type: $type, sort: SEARCH_MATCH) {
      id
      title {
        english
        romaji
        userPreferred
        native
      }
      type
      startDate {
        year
        month
        day
      }
      coverImage {
        extraLarge
        large
        medium
      }
      averageScore
      genres
      tags {
        name
      }
    }
  }
`;

const anilistMediaTypeSchema = z.enum(["ANIME", "MANGA"]);
type AniListMediaType = z.infer<typeof anilistMediaTypeSchema>;

const anilistMediaSchema = z.object({
  id: z.number(),
  title: z
    .object({
      english: z.string().nullable().optional(),
      romaji: z.string().nullable().optional(),
      userPreferred: z.string().nullable().optional(),
      native: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  type: anilistMediaTypeSchema,
  startDate: z
    .object({
      year: z.number().nullable().optional(),
      month: z.number().nullable().optional(),
      day: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  coverImage: z
    .object({
      extraLarge: z.string().nullable().optional(),
      large: z.string().nullable().optional(),
      medium: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  averageScore: z.number().nullable().optional(),
  genres: z.array(z.string()).nullable().optional(),
  tags: z
    .array(
      z.object({
        name: z.string().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
});

type AniListMedia = z.infer<typeof anilistMediaSchema>;

const anilistResponseSchema = z.object({
  data: z
    .object({
      Media: anilistMediaSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  errors: z.array(z.unknown()).optional(),
});

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

export class AniListSourceIntegration
  implements SourceIntegration<AniListMediaWithContext>
{
  sourceType = "anilist" as const;
  configSchema = sourceIntegrationConfigSchema;

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return supportsMediaType(row, ["anime", "manga"]);
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
          hasApiKey:
            typeof context.config.apiKey === "string" &&
            Boolean(context.config.apiKey.trim()),
        },
        "AniList enrichment request started"
      );

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

      const media = parsed.data.data?.Media;
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

    if (typeof apiKey === "string" && apiKey.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }

    return headers;
  }

  private toAniListMediaType(
    row: LibraryEntryWithTags
  ): AniListMediaType | null {
    if (row.media_type === "anime") return "ANIME";
    if (row.media_type === "manga") return "MANGA";
    return null;
  }

  private toReleasedAt(startDate: AniListMedia["startDate"]): string | null {
    if (!startDate?.year || !startDate.month || !startDate.day) return null;
    return [
      String(startDate.year).padStart(4, "0"),
      String(startDate.month).padStart(2, "0"),
      String(startDate.day).padStart(2, "0"),
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

type AniListMediaWithContext = {
  media: AniListMedia;
  sourceIntegrationId?: string;
};

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
