import { z } from "zod";
import { AniListSourceIntegration } from "../enrichment/source-integrations/anilist/source-integration";
import { IgdbSourceIntegration } from "../enrichment/source-integrations/igdb/source-integration";
import { OpenLibrarySourceIntegration } from "../enrichment/source-integrations/openlibrary/source-integration";
import { TmdbSourceIntegration } from "../enrichment/source-integrations/tmdb/source-integration";
import { parsedEnv } from "../env";
import { logger } from "../logger";
import { err, ok, type Result } from "../utils/result";
import {
  type CatalogueEntry,
  type CatalogueEntryData,
  type CatalogueSourceType,
  catalogueModel,
} from "./catalogue.model";
import type {
  CatalogueRefreshResponse,
  CatalogueSourceRefresh,
  RefreshCatalogueInput,
} from "./catalogue.schema";
import {
  buildCatalogueEmbeddingText,
  encodeFloat32Vector,
} from "./catalogue-vector";

const embeddingsResponseSchema = z.object({
  data: z.array(
    z.object({
      embedding: z.array(z.number()),
      index: z.number().optional(),
    })
  ),
});

class CatalogueService {
  private readonly anilist = new AniListSourceIntegration();
  private readonly tmdb = new TmdbSourceIntegration();
  private readonly igdb = new IgdbSourceIntegration();
  private readonly openLibrary = new OpenLibrarySourceIntegration();
  private refreshPromise: Promise<Result<CatalogueRefreshResponse>> | null =
    null;

  refreshAll(input: RefreshCatalogueInput = {}) {
    if (this.refreshPromise) {
      logger.info("Catalogue refresh already running; reusing active refresh");
      return this.refreshPromise;
    }

    this.refreshPromise = this.runRefresh(input).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async createEmbeddings(input: string[]) {
    const apiKey = parsedEnv.METAVAULT_CATALOGUE_AI_API_KEY?.trim();
    if (!apiKey) {
      return err(400, "Catalogue embedding API key is not configured");
    }

    const url = new URL(
      "embeddings",
      `${parsedEnv.METAVAULT_CATALOGUE_AI_BASE_URL.replace(/\/+$/, "")}/`
    );
    logger.debug(
      {
        inputCount: input.length,
        model: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
      },
      "Catalogue embeddings request started"
    );
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
        input,
      }),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status },
        "OpenAI-compatible catalogue embeddings request failed"
      );
      return err(response.status, "Embedding request failed");
    }

    const parsed = embeddingsResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      logger.warn(
        { error: parsed.error },
        "OpenAI-compatible catalogue embeddings response was invalid"
      );
      return err(502, "Embedding response was invalid");
    }

    return ok(
      parsed.data.data
        .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
        .map((item) => item.embedding)
    );
  }

  private async runRefresh(
    input: RefreshCatalogueInput
  ): Promise<Result<CatalogueRefreshResponse>> {
    try {
      const refreshWindowMs =
        input.refreshWindowMs ??
        parsedEnv.METAVAULT_CATALOGUE_REFRESH_WINDOW_MS;
      const pace = createPacer(refreshWindowMs, estimateRefreshOperations());
      const sources = this.getSources(pace, input.sources);
      const sourceResults: CatalogueSourceRefresh[] = [];
      const refreshedEntries = new Map<CatalogueSourceType, CatalogueEntry[]>();

      logger.info(
        {
          sourceTypes: sources.map((source) => source.sourceType),
          embeddingModel: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
          embeddingBatchSize:
            parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_BATCH_SIZE,
          refreshWindowMs,
        },
        "Catalogue refresh started"
      );

      for (const source of sources) {
        if (source.skipReason) {
          sourceResults.push({
            source_type: source.sourceType,
            status: "skipped",
            fetched_count: 0,
            embedded_count: 0,
            skipped_embedding_count: 0,
            message: source.skipReason,
          });
          continue;
        }

        try {
          const entries = await source.load();
          const upsertedEntries: CatalogueEntry[] = [];
          for (const entry of entries) {
            upsertedEntries.push(await catalogueModel.upsertEntry(entry));
          }
          refreshedEntries.set(source.sourceType, upsertedEntries);
          sourceResults.push({
            source_type: source.sourceType,
            status: "completed",
            fetched_count: upsertedEntries.length,
            embedded_count: 0,
            skipped_embedding_count: 0,
          });
          logger.info(
            {
              sourceType: source.sourceType,
              fetchedCount: upsertedEntries.length,
            },
            "Catalogue source fetch completed"
          );
        } catch (error) {
          logger.warn(
            { sourceType: source.sourceType, error },
            "Catalogue source refresh failed"
          );
          sourceResults.push({
            source_type: source.sourceType,
            status: "failed",
            fetched_count: 0,
            embedded_count: 0,
            skipped_embedding_count: 0,
            message: "Source refresh failed",
          });
        }
      }

      const needsEmbedding = (
        await catalogueModel.getEntriesNeedingEmbedding({
          embeddingModel: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
        })
      ).filter(
        (entry) => !input.sources || input.sources.includes(entry.source_type)
      );
      const needsEmbeddingIds = new Set(
        needsEmbedding.map((entry) => entry.id)
      );
      for (const result of sourceResults) {
        result.skipped_embedding_count = (
          refreshedEntries.get(result.source_type) ?? []
        ).filter((entry) => !needsEmbeddingIds.has(entry.id)).length;
      }

      logger.info(
        {
          needsEmbeddingCount: needsEmbedding.length,
        },
        "Catalogue entries upserted"
      );

      for (
        let index = 0;
        index < needsEmbedding.length;
        index += parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_BATCH_SIZE
      ) {
        const batch = needsEmbedding.slice(
          index,
          index + parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_BATCH_SIZE
        );
        const embeddingsResult = await this.createEmbeddings(
          batch.map((entry) => this.toEmbeddingText(entry))
        );
        if (!embeddingsResult.ok) {
          throw new Error(embeddingsResult.error.message);
        }

        for (const [
          embeddingIndex,
          embedding,
        ] of embeddingsResult.data.entries()) {
          const entry = batch[embeddingIndex];
          if (!entry) continue;
          await catalogueModel.upsertEmbedding({
            catalogueEntryId: entry.id,
            embeddingModel: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
            dimensions: embedding.length,
            embeddingBlob: encodeFloat32Vector(embedding),
            embeddingTextHash: entry.embedding_text_hash,
          });
          const sourceResult = sourceResults.find(
            (result) => result.source_type === entry.source_type
          );
          if (sourceResult) {
            sourceResult.embedded_count += 1;
          }
        }
        await pace();
      }

      const totals = sourceResults.reduce(
        (total, source) => ({
          fetched: total.fetched + source.fetched_count,
          embedded: total.embedded + source.embedded_count,
          skipped: total.skipped + source.skipped_embedding_count,
        }),
        { fetched: 0, embedded: 0, skipped: 0 }
      );

      logger.info(
        {
          fetchedCount: totals.fetched,
          embeddedCount: totals.embedded,
          skippedEmbeddingCount: totals.skipped,
          sources: sourceResults,
        },
        "Catalogue refresh completed"
      );

      return ok({
        source_type: "all",
        status: "completed",
        fetched_count: totals.fetched,
        embedded_count: totals.embedded,
        skipped_embedding_count: totals.skipped,
        sources: sourceResults,
      });
    } catch (error) {
      logger.warn({ error }, "Catalogue refresh failed");
      return err(502, "Catalogue refresh failed");
    }
  }

  private toEmbeddingText(entry: CatalogueEntry) {
    return buildCatalogueEmbeddingText({
      title: entry.title,
      mediaType: entry.media_type,
      genres: entry.genres,
      tags: entry.tags,
      description: entry.description,
    });
  }

  private getSources(
    pace: () => Promise<void>,
    requestedSources?: CatalogueSourceType[]
  ): CatalogueSource[] {
    const tmdbApiKey = parsedEnv.METAVAULT_CATALOGUE_TMDB_API_KEY?.trim();
    const igdbClientId = parsedEnv.METAVAULT_CATALOGUE_IGDB_CLIENT_ID?.trim();
    const igdbAccessToken =
      parsedEnv.METAVAULT_CATALOGUE_IGDB_ACCESS_TOKEN?.trim();

    const sources: CatalogueSource[] = [
      {
        sourceType: "anilist",
        load: () =>
          this.anilist.getCatalogueEntries({
            topN: parsedEnv.METAVAULT_CATALOGUE_ANILIST_TOP_N,
            pageSize: parsedEnv.METAVAULT_CATALOGUE_ANILIST_PAGE_SIZE,
            pace,
          }),
      },
      {
        sourceType: "tmdb",
        skipReason: tmdbApiKey ? undefined : "Catalogue API key is missing",
        load: () =>
          this.tmdb.getCatalogueEntries({
            topN: parsedEnv.METAVAULT_CATALOGUE_TMDB_TOP_N,
            apiKey: tmdbApiKey ?? "",
            pace,
          }),
      },
      {
        sourceType: "igdb",
        skipReason:
          igdbClientId && igdbAccessToken
            ? undefined
            : "Catalogue credentials are missing",
        load: () =>
          this.igdb.getCatalogueEntries({
            topN: parsedEnv.METAVAULT_CATALOGUE_IGDB_TOP_N,
            pageSize: 50,
            clientId: igdbClientId ?? "",
            accessToken: igdbAccessToken ?? "",
            pace,
          }),
      },
      {
        sourceType: "openlibrary",
        load: () =>
          this.openLibrary.getCatalogueEntries({
            topN: parsedEnv.METAVAULT_CATALOGUE_OPEN_LIBRARY_TOP_N,
            pageSize: 100,
            pace,
          }),
      },
    ];

    if (!requestedSources) {
      return sources;
    }

    const requested = new Set(requestedSources);
    return sources.filter((source) => requested.has(source.sourceType));
  }
}

export const catalogueService = new CatalogueService();

function createPacer(refreshWindowMs: number, operationCount: number) {
  const delayMs =
    operationCount > 0 ? Math.floor(refreshWindowMs / operationCount) : 0;

  return async () => {
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  };
}

type CatalogueSource = {
  sourceType: CatalogueSourceType;
  load: () => Promise<CatalogueEntryData[]>;
  skipReason?: string;
};

function estimateRefreshOperations() {
  const sourceRequests =
    Math.ceil(
      parsedEnv.METAVAULT_CATALOGUE_ANILIST_TOP_N /
        parsedEnv.METAVAULT_CATALOGUE_ANILIST_PAGE_SIZE
    ) *
      2 +
    Math.ceil(parsedEnv.METAVAULT_CATALOGUE_TMDB_TOP_N / 20) * 2 +
    Math.ceil(parsedEnv.METAVAULT_CATALOGUE_IGDB_TOP_N / 50) +
    Math.ceil(parsedEnv.METAVAULT_CATALOGUE_OPEN_LIBRARY_TOP_N / 100);
  const maximumEntries =
    parsedEnv.METAVAULT_CATALOGUE_ANILIST_TOP_N * 2 +
    parsedEnv.METAVAULT_CATALOGUE_TMDB_TOP_N * 2 +
    parsedEnv.METAVAULT_CATALOGUE_IGDB_TOP_N +
    parsedEnv.METAVAULT_CATALOGUE_OPEN_LIBRARY_TOP_N;

  return (
    sourceRequests +
    Math.ceil(
      maximumEntries / parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_BATCH_SIZE
    )
  );
}

async function fetchWithRetry(url: URL, init: RequestInit) {
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
