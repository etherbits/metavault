import { z } from "zod";
import { AniListSourceIntegration } from "../enrichment/source-integrations/anilist/source-integration";
import { parsedEnv } from "../env";
import { logger } from "../logger";
import { err, ok, type Result } from "../utils/result";
import { type CatalogueEntry, catalogueModel } from "./catalogue.model";
import type {
  CatalogueRefreshResponse,
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
  private refreshPromise: Promise<Result<CatalogueRefreshResponse>> | null =
    null;

  refreshAniList(input: RefreshCatalogueInput = {}) {
    if (this.refreshPromise) {
      logger.info("Catalogue refresh already running; reusing active refresh");
      return this.refreshPromise;
    }

    this.refreshPromise = this.runAniListRefresh(input).finally(() => {
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

  private async runAniListRefresh(
    input: RefreshCatalogueInput
  ): Promise<Result<CatalogueRefreshResponse>> {
    let fetchedCount = 0;
    let embeddedCount = 0;
    let skippedEmbeddingCount = 0;

    try {
      const topN = parsedEnv.METAVAULT_CATALOGUE_ANILIST_TOP_N;
      const pageSize = parsedEnv.METAVAULT_CATALOGUE_ANILIST_PAGE_SIZE;
      const refreshWindowMs =
        input.refreshWindowMs ??
        parsedEnv.METAVAULT_CATALOGUE_REFRESH_WINDOW_MS;
      const pageCount = Math.ceil(topN / pageSize) * 2;
      const estimatedEmbeddingBatches = Math.ceil(
        (topN * 2) / parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_BATCH_SIZE
      );
      const pace = createPacer(
        refreshWindowMs,
        pageCount + estimatedEmbeddingBatches
      );

      logger.info(
        {
          sourceType: "anilist",
          topNPerMediaType: topN,
          pageSize,
          embeddingModel: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
          embeddingBatchSize:
            parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_BATCH_SIZE,
          refreshWindowMs,
        },
        "Catalogue refresh started"
      );

      const entries = await this.anilist.getCatalogueEntries({
        topN,
        pageSize,
        pace,
      });

      logger.info(
        { sourceType: "anilist", fetchedCount: entries.length },
        "Catalogue source fetch completed"
      );

      const upsertedEntries: CatalogueEntry[] = [];
      for (const entry of entries) {
        upsertedEntries.push(await catalogueModel.upsertEntry(entry));
      }
      fetchedCount = upsertedEntries.length;

      const needsEmbedding = await catalogueModel.getEntriesNeedingEmbedding({
        sourceType: "anilist",
        embeddingModel: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
      });
      const needsEmbeddingIds = new Set(
        needsEmbedding.map((entry) => entry.id)
      );
      skippedEmbeddingCount = upsertedEntries.filter(
        (entry) => !needsEmbeddingIds.has(entry.id)
      ).length;

      logger.info(
        {
          sourceType: "anilist",
          upsertedCount: upsertedEntries.length,
          needsEmbeddingCount: needsEmbedding.length,
          skippedEmbeddingCount,
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
          embeddedCount += 1;
        }
        await pace();
      }

      logger.info(
        {
          sourceType: "anilist",
          fetchedCount,
          embeddedCount,
          skippedEmbeddingCount,
        },
        "Catalogue refresh completed"
      );

      return ok({
        source_type: "anilist",
        status: "completed",
        fetched_count: fetchedCount,
        embedded_count: embeddedCount,
        skipped_embedding_count: skippedEmbeddingCount,
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
