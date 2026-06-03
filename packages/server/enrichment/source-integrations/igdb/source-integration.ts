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
}
