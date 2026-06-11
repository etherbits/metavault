import type { CatalogueEntry } from "../catalogue/catalogue.model";
import { catalogueModel } from "../catalogue/catalogue.model";
import { catalogueService } from "../catalogue/catalogue.service";
import {
  cosineSimilarity,
  decodeFloat32Vector,
} from "../catalogue/catalogue-vector";
import { parsedEnv } from "../env";
import { logger } from "../logger";
import { err, ok, type Result } from "../utils/result";
import type {
  GenerateRecommendationsInput,
  GenerateRecommendationsResponse,
} from "./recommendation.schema";

class RecommendationService {
  async generate({
    userId,
    input,
  }: {
    userId: string;
    input: GenerateRecommendationsInput;
  }): Promise<Result<GenerateRecommendationsResponse>> {
    logger.info(
      {
        userId,
        count: input.count,
        promptLength: input.prompt.length,
        filters: input.filters,
        embeddingModel: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
      },
      "Recommendation generation started"
    );

    const queryEmbeddingResult = await catalogueService.createEmbeddings([
      input.prompt,
    ]);
    if (!queryEmbeddingResult.ok) {
      logger.warn(
        { userId, error: queryEmbeddingResult.error },
        "Recommendation query embedding failed"
      );
      return queryEmbeddingResult;
    }

    const queryEmbedding = queryEmbeddingResult.data[0];
    if (!queryEmbedding) {
      return err(502, "Embedding provider returned no query embedding");
    }

    const candidates = await catalogueModel.getCandidates({
      userId,
      embeddingModel: parsedEnv.METAVAULT_CATALOGUE_EMBEDDING_MODEL,
      adult: input.filters.adult,
      excludedMediaTypes: input.filters.excludedMediaTypes ?? [],
      releaseYearFrom: input.filters.releaseYearFrom,
      releaseYearTo: input.filters.releaseYearTo,
      minPublicRating: input.filters.minPublicRating,
      excludeExistingLibrary: input.filters.excludeExistingLibrary,
    });

    logger.info(
      { userId, candidateCount: candidates.length },
      "Recommendation candidates loaded"
    );

    const items = candidates
      .map((candidate) => ({
        candidate,
        cosineScore: cosineSimilarity(
          queryEmbedding,
          decodeFloat32Vector(candidate.embedding_blob)
        ),
      }))
      .map((item) => ({
        ...item,
        score: getRecommendationScore({
          prompt: input.prompt,
          candidate: item.candidate,
          cosineScore: item.cosineScore,
        }),
      }))
      .sort((left, right) => right.score.total - left.score.total)
      .slice(0, input.count)
      .map(({ candidate, cosineScore, score }) => ({
        catalogue_entry_id: candidate.id,
        source_type: candidate.source_type,
        source_media_id: candidate.source_media_id,
        title: candidate.title,
        media_type: candidate.media_type,
        adult: candidate.adult,
        public_rating: candidate.public_rating,
        released_at: candidate.released_at,
        image_src: candidate.image_src,
        genres: candidate.genres,
        tags: candidate.tags,
        cosine_score: cosineScore,
        match_score: score.total,
        score_breakdown: {
          cosine_weight: SCORE_WEIGHTS.cosine,
          cosine_contribution: score.cosineContribution,
          keyword_overlap: score.keywordOverlap,
          keyword_contribution: score.keywordContribution,
          rating_contribution: score.ratingContribution,
          popularity_contribution: score.popularityContribution,
        },
        ...(input.debug
          ? {
              debug: {
                embedding_text_hash: candidate.embedding_text_hash,
                embedding_model: candidate.embedding_model,
              },
            }
          : {}),
      }));

    logger.info(
      {
        userId,
        returnedCount: items.length,
        topMatchScore: items[0]?.match_score ?? null,
        topCosineScore: items[0]?.cosine_score ?? null,
        topTitle: items[0]?.title ?? null,
      },
      "Recommendation generation completed"
    );

    return ok({ items });
  }
}

export const recommendationService = new RecommendationService();

export function scoreRecommendationCandidate({
  prompt,
  candidate,
  cosineScore,
}: {
  prompt: string;
  candidate: Pick<
    CatalogueEntry,
    "title" | "genres" | "tags" | "public_rating" | "popularity"
  >;
  cosineScore: number;
}) {
  return getRecommendationScore({ prompt, candidate, cosineScore }).total;
}

export function getRecommendationScore({
  prompt,
  candidate,
  cosineScore,
}: {
  prompt: string;
  candidate: Pick<
    CatalogueEntry,
    "title" | "genres" | "tags" | "public_rating" | "popularity"
  >;
  cosineScore: number;
}) {
  const keywordOverlap = keywordOverlapScore(prompt, candidate);
  const cosineContribution = cosineScore * SCORE_WEIGHTS.cosine;
  const keywordContribution = keywordOverlap * SCORE_WEIGHTS.keyword;
  const ratingContribution =
    ratingScore(candidate.public_rating) * SCORE_WEIGHTS.rating;
  const popularityContribution =
    popularityScore(candidate.popularity) * SCORE_WEIGHTS.popularity;

  return {
    total:
      cosineContribution +
      keywordContribution +
      ratingContribution +
      popularityContribution,
    cosineContribution,
    keywordOverlap,
    keywordContribution,
    ratingContribution,
    popularityContribution,
  };
}

function keywordOverlapScore(
  prompt: string,
  candidate: Pick<CatalogueEntry, "title" | "genres" | "tags">
) {
  const promptTokens = tokenize(prompt);
  if (promptTokens.length === 0) return 0;

  const candidateTokens = new Set(
    tokenize(
      [candidate.title, ...candidate.genres, ...candidate.tags].join(" ")
    )
  );
  const matches = promptTokens.filter((token) => candidateTokens.has(token));
  return matches.length / promptTokens.length;
}

function tokenize(value: string) {
  return (
    value
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter((token) => !STOP_WORDS.has(token)) ?? []
  );
}

function ratingScore(value: number | null) {
  return value === null ? 0 : Math.max(0, Math.min(1, value / 10));
}

function popularityScore(value: number | null) {
  return value === null
    ? 0
    : Math.max(0, Math.min(1, Math.log10(value + 1) / 6));
}

const STOP_WORDS = new Set(["and", "for", "the", "with", "want", "something"]);
const SCORE_WEIGHTS = {
  cosine: 0.82,
  keyword: 0.1,
  rating: 0.05,
  popularity: 0.03,
} as const;
