import type { CatalogueEntryData } from "../../../catalogue/catalogue.model";
import {
  buildCatalogueEmbeddingText,
  hashEmbeddingText,
} from "../../../catalogue/catalogue-vector";
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
import { IGDB_GAMES_ENDPOINT, igdbConfig } from "./config";
import { type IgdbGameWithContext, igdbGamesResponseSchema } from "./schema";

export class IgdbSourceIntegration
  implements SourceIntegration<IgdbGameWithContext>
{
  sourceType = "igdb" as const;
  configSchema = igdbConfig.schema;
  configFields = igdbConfig.fields;
  private readonly responseCache = new SourceIntegrationResponseCache(
    this.sourceType
  );

  supportsEntry(row: LibraryEntryWithTags): boolean {
    return row.media_type === "game";
  }

  async getCatalogueEntries(input: {
    topN: number;
    pageSize: number;
    clientId: string;
    accessToken: string;
    pace: () => Promise<void>;
  }): Promise<CatalogueEntryData[]> {
    const entries: CatalogueEntryData[] = [];

    for (let offset = 0; offset < input.topN; offset += input.pageSize) {
      const limit = Math.min(input.pageSize, input.topN - offset);
      const response = await fetch(IGDB_GAMES_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Client-ID": input.clientId,
          Authorization: `Bearer ${input.accessToken}`,
        },
        body: [
          "fields name,summary,cover.url,rating,rating_count,total_rating_count,first_release_date,genres.name,themes.name;",
          "where rating_count > 0;",
          "sort total_rating_count desc;",
          `limit ${limit};`,
          `offset ${offset};`,
        ].join(" "),
      });

      if (!response.ok) {
        logger.warn(
          { sourceType: this.sourceType, status: response.status, offset },
          "IGDB catalogue request failed"
        );
        await input.pace();
        continue;
      }

      const parsed = igdbGamesResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        logger.warn(
          { sourceType: this.sourceType, error: parsed.error },
          "IGDB catalogue response was invalid"
        );
        await input.pace();
        continue;
      }

      entries.push(...parsed.data.map((game) => this.toCatalogueEntry(game)));
      await input.pace();
    }

    return entries;
  }

  async getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<IgdbGameWithContext | null> {
    if (!this.supportsEntry(row)) return null;
    const clientId = getTrimmedString(context.config.clientId);
    const apiKey = getTrimmedString(context.config.apiKey);
    if (!clientId || !apiKey) {
      logSourceCallSkipped(this.sourceType, row, "missing_credentials");
      return null;
    }

    try {
      logger.info(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          mediaType: row.media_type,
        },
        "IGDB enrichment request started"
      );

      // IGDB API v4 uses APIcalypse queries against endpoint-specific URLs:
      // https://api-docs.igdb.com/
      const parsedData = await this.responseCache.get({
        key: [
          "game-search",
          toSourceCacheKeyPart(row.title),
          toSourceCredentialCacheKeyPart(clientId),
          toSourceCredentialCacheKeyPart(apiKey),
        ].join(":"),
        label: "game_search",
        load: async () => {
          const response = await fetch(IGDB_GAMES_ENDPOINT, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Client-ID": clientId,
              Authorization: `Bearer ${apiKey}`,
            },
            body: `search "${row.title.replaceAll('"', '\\"')}"; fields name,cover.url,rating,first_release_date,genres.name; limit 1;`,
          });

          if (!response.ok) {
            logger.warn(
              {
                sourceType: this.sourceType,
                rowId: row.id,
                title: row.title,
                status: response.status,
              },
              "IGDB enrichment request failed"
            );
            return null;
          }

          const parsed = igdbGamesResponseSchema.safeParse(
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
              "IGDB enrichment response was invalid"
            );
            return null;
          }

          return parsed.data;
        },
      });
      if (!parsedData) return null;

      const game = parsedData[0];
      if (!game) {
        logger.info(
          { sourceType: this.sourceType, rowId: row.id, title: row.title },
          "IGDB enrichment found no game"
        );
        return null;
      }

      logger.info(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          igdbId: game.id,
          igdbTitle: game.name,
        },
        "IGDB enrichment game selected"
      );
      return { game, sourceIntegrationId: context.sourceIntegrationId };
    } catch (error) {
      logger.warn(
        {
          sourceType: this.sourceType,
          rowId: row.id,
          title: row.title,
          error,
        },
        "IGDB enrichment request threw"
      );
      return null;
    }
  }

  mapToLibraryEntry(
    data: IgdbGameWithContext,
    row: LibraryEntryWithTags
  ): EnrichedLibraryEntryData | null {
    const tags = dedupeEnrichedTags(
      [...(data.game.genres ?? [])]
        .map((genre) => genre.name?.trim())
        .filter((value): value is string => Boolean(value))
        .map((value) => ({ value, weight: "major" as const }))
    );

    logger.info(
      {
        sourceType: this.sourceType,
        rowId: row.id,
        title: row.title,
        igdbId: data.game.id,
        tagCount: tags.length,
      },
      "IGDB enrichment data mapped"
    );

    return {
      title: data.game.name || row.title,
      media_id: String(data.game.id),
      source_id: data.sourceIntegrationId,
      media_type: "game",
      image_src: this.toCoverUrl(data.game.cover?.url),
      public_rating:
        typeof data.game.rating === "number" ? data.game.rating / 10 : null,
      released_at: data.game.first_release_date
        ? new Date(data.game.first_release_date * 1000)
            .toISOString()
            .slice(0, 10)
        : null,
      tags,
    };
  }

  private toCoverUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const withProtocol = url.startsWith("//") ? `https:${url}` : url;
    return withProtocol.replace("/t_thumb/", "/t_cover_big/");
  }

  private toCatalogueEntry(
    game: IgdbGameWithContext["game"]
  ): CatalogueEntryData {
    const title = game.name || `IGDB ${game.id}`;
    const genres = getNamedValues(game.genres);
    const tags = getNamedValues(game.themes);
    const description = game.summary ?? null;
    const embeddingText = buildCatalogueEmbeddingText({
      title,
      mediaType: "game",
      genres,
      tags,
      description,
    });

    return {
      id: `igdb-${game.id}`,
      source_type: "igdb",
      source_media_id: String(game.id),
      media_type: "game",
      title,
      description,
      image_src: this.toCoverUrl(game.cover?.url),
      adult: false,
      public_rating: typeof game.rating === "number" ? game.rating / 10 : null,
      popularity: game.total_rating_count ?? game.rating_count ?? null,
      released_at: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
        : null,
      genres,
      tags,
      metadata: {},
      embedding_text_hash: hashEmbeddingText(embeddingText),
    };
  }
}

function getNamedValues(
  values: Array<{ name?: string | null }> | null | undefined
) {
  return (values ?? [])
    .map((value) => value.name?.trim())
    .filter((value): value is string => Boolean(value));
}
