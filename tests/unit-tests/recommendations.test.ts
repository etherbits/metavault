import { afterEach, describe, expect, it, mock } from "bun:test";
import { refreshCatalogueSchema } from "../../packages/server/catalogue/catalogue.schema";
import {
  buildCatalogueEmbeddingText,
  cosineSimilarity,
  decodeFloat32Vector,
  encodeFloat32Vector,
  hashEmbeddingText,
} from "../../packages/server/catalogue/catalogue-vector";
import { tmdbSearchResponseSchema } from "../../packages/server/enrichment/source-integrations/tmdb/schema";
import { generateRecommendationsSchema } from "../../packages/server/recommendations/recommendation.schema";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("recommendation vectors", () => {
  it("round-trips vectors through Float32 blobs", () => {
    const vector = [1, 0.5, -0.25, 3];

    const decoded = decodeFloat32Vector(encodeFloat32Vector(vector));

    expect(decoded).toEqual(vector);
  });

  it("calculates cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1], [1, 0])).toBe(0);
  });

  it("hashes the exact embedding text", () => {
    const text = buildCatalogueEmbeddingText({
      title: "Cozy Friendship Anime",
      mediaType: "anime",
      genres: ["Adventure"],
      tags: ["Cozy", "Friendship"],
      description: "A warm story.",
    });

    expect(text).toContain("Title: Cozy Friendship Anime");
    expect(hashEmbeddingText(text)).toBe(hashEmbeddingText(text));
    expect(hashEmbeddingText(text)).not.toBe(hashEmbeddingText(`${text} `));
  });

  it("caps descriptions in embedding text", () => {
    const text = buildCatalogueEmbeddingText({
      title: "Long Description",
      mediaType: "anime",
      genres: [],
      tags: [],
      description: "a".repeat(2100),
    });

    expect(text).toEndWith("a".repeat(2000));
    expect(text).not.toContain("a".repeat(2001));
  });

  it("strips markup from embedding text", () => {
    const text = buildCatalogueEmbeddingText({
      title: "Markup",
      mediaType: "anime",
      genres: [],
      tags: [],
      description: "<b>Warm</b><br>friendship story",
    });

    expect(text).toContain("Synopsis: Warm friendship story");
    expect(text).not.toContain("<b>");
  });
});

describe("recommendation scoring", () => {
  it("boosts direct prompt matches without ignoring cosine", async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "unit-secret";
    const { scoreRecommendationCandidate } = await import(
      "../../packages/server/recommendations/recommendation.service"
    );

    const matching = scoreRecommendationCandidate({
      prompt: "cozy friendship anime",
      cosineScore: 0.8,
      candidate: {
        title: "Cozy Friendship Anime",
        genres: ["Slice of Life"],
        tags: ["Friendship"],
        public_rating: 7,
        popularity: 1000,
      },
    });
    const vague = scoreRecommendationCandidate({
      prompt: "cozy friendship anime",
      cosineScore: 0.8,
      candidate: {
        title: "Popular Action Show",
        genres: ["Action"],
        tags: ["Battle"],
        public_rating: 10,
        popularity: 1_000_000,
      },
    });

    expect(matching).toBeGreaterThan(vague);
  });

  it("makes cosine similarity the dominant score contribution", async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "unit-secret";
    const { getRecommendationScore } = await import(
      "../../packages/server/recommendations/recommendation.service"
    );

    const score = getRecommendationScore({
      prompt: "cozy friendship anime",
      cosineScore: 0.8,
      candidate: {
        title: "Cozy Friendship Anime",
        genres: ["Slice of Life"],
        tags: ["Friendship"],
        public_rating: 8,
        popularity: 1000,
      },
    });

    expect(score.cosineContribution).toBeCloseTo(0.656);
    expect(score.total).toBeGreaterThan(score.cosineContribution);
  });
});

describe("recommendation schemas", () => {
  it("applies generate defaults", () => {
    const parsed = generateRecommendationsSchema.parse({
      prompt: "cozy anime",
    });

    expect(parsed).toEqual({
      prompt: "cozy anime",
      count: 10,
      debug: false,
      filters: {
        adult: "exclude",
        excludeExistingLibrary: true,
      },
    });
  });

  it("rejects inverted release year ranges", () => {
    const parsed = generateRecommendationsSchema.safeParse({
      prompt: "older manga",
      filters: {
        releaseYearFrom: 2025,
        releaseYearTo: 2020,
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts selective catalogue refresh sources", () => {
    expect(
      refreshCatalogueSchema.parse({
        sources: ["anilist", "tmdb"],
        refreshWindowMs: 0,
      })
    ).toEqual({
      sources: ["anilist", "tmdb"],
      refreshWindowMs: 0,
    });
  });
});

describe("recommendation source URLs", () => {
  it("builds AniList and TMDB detail URLs", async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "unit-secret";
    const { getRecommendationSourceUrl } = await import(
      "../../packages/server/recommendations/recommendation.service"
    );

    expect(
      getRecommendationSourceUrl({
        source_type: "anilist",
        source_media_id: "1001",
        media_type: "anime",
      })
    ).toBe("https://anilist.co/anime/1001");

    expect(
      getRecommendationSourceUrl({
        source_type: "tmdb",
        source_media_id: "9102",
        media_type: "tv_show",
      })
    ).toBe("https://www.themoviedb.org/tv/9102");
  });

  it("normalizes equivalent titles for result deduplication", async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "unit-secret";
    const { normalizeRecommendationTitle } = await import(
      "../../packages/server/recommendations/recommendation.service"
    );

    expect(normalizeRecommendationTitle("Howl's Moving Castle")).toBe(
      normalizeRecommendationTitle("Howl’s Moving Castle")
    );
  });
});

describe("TMDB catalogue response schemas", () => {
  it("preserves TV names instead of parsing them as movies", () => {
    const parsed = tmdbSearchResponseSchema.parse({
      results: [
        {
          id: 42,
          name: "Example TV Show",
          original_name: "Original TV Show",
        },
      ],
    });

    expect(parsed.results?.[0]).toMatchObject({
      id: 42,
      name: "Example TV Show",
    });
  });
});

describe("AniListSourceIntegration catalogue", () => {
  it("maps top AniList anime and manga into catalogue entries", async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "unit-secret";
    process.env.METAVAULT_ANILIST_GRAPHQL_ENDPOINT =
      "https://mock.test/anilist";

    const fetchMock = mock(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          variables?: { type?: "ANIME" | "MANGA" };
        };
        const type = body.variables?.type ?? "ANIME";

        return new Response(
          JSON.stringify({
            data: {
              Page: {
                media: [
                  {
                    id: type === "ANIME" ? 1 : 2,
                    title: { english: `${type} Title` },
                    type,
                    description: "<b>raw description</b>",
                    startDate: { year: 2024 },
                    coverImage: { extraLarge: `https://img.test/${type}.jpg` },
                    averageScore: 80,
                    popularity: 100,
                    isAdult: false,
                    genres: ["Adventure"],
                    tags: [{ name: "Cozy" }],
                  },
                ],
              },
            },
          })
        );
      }
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { AniListSourceIntegration } = await import(
      "../../packages/server/enrichment/source-integrations/anilist/source-integration"
    );
    const integration = new AniListSourceIntegration();

    const entries = await integration.getCatalogueEntries({
      topN: 1,
      pageSize: 1,
      pace: async () => {},
    });

    expect(entries.map((entry) => entry.media_type)).toEqual([
      "anime",
      "manga",
    ]);
    expect(entries[0]).toMatchObject({
      source_type: "anilist",
      source_media_id: "1",
      title: "ANIME Title",
      description: "<b>raw description</b>",
      public_rating: 8,
      released_at: "2024-01-01",
      genres: ["Adventure"],
      tags: ["Cozy"],
    });
    expect(entries[0]?.embedding_text_hash).toBe(
      hashEmbeddingText(
        buildCatalogueEmbeddingText({
          title: "ANIME Title",
          mediaType: "anime",
          genres: ["Adventure"],
          tags: ["Cozy"],
          description: "<b>raw description</b>",
        })
      )
    );
  });
});
