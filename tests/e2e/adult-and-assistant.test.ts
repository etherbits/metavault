import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

test("EZQ can create and search adult entries", async ({ request }) => {
  await signIn(request);
  const suffix = Date.now();
  const titleToken = `adult_entry_${suffix}`;

  const createResponse = await request.post("/ezq", {
    data: { query: `/create ${titleToken} adult:true` },
  });
  expect(createResponse.ok()).toBeTruthy();

  const created = await createResponse.json();
  expect(created.rows).toHaveLength(1);
  expect(created.rows[0]).toMatchObject({
    title: titleToken.replace(/_/g, " "),
    adult: true,
  });

  const searchResponse = await request.post("/ezq", {
    data: { query: `/search adult:true title:${titleToken}` },
  });
  expect(searchResponse.ok()).toBeTruthy();

  const searched = await searchResponse.json();
  expect(searched.rows).toHaveLength(1);
  expect(searched.rows[0]).toMatchObject({
    id: created.rows[0].id,
    adult: true,
  });
});

test("assistant chat uses OpenAI-compatible integration config", async ({
  request,
}) => {
  await signIn(request);
  const sourceMockPort = process.env.METAVAULT_E2E_SOURCE_MOCK_PORT ?? "3636";
  const baseUrl = `http://localhost:${sourceMockPort}/openai/v1`;

  const configResponse = await request.put(
    "/ai-integrations/openai_compatible",
    {
      data: {
        is_active: true,
        config: {
          baseUrl,
          apiKey: "test-key",
          model: "mock-gpt",
        },
      },
    }
  );
  expect(configResponse.ok()).toBeTruthy();

  const chatResponse = await request.post("/assistant/chat", {
    data: {
      message: "Describe the current results.",
      history: [{ role: "user", content: "Remember this session." }],
      context: {
        currentQuery: "/s adult:true",
        canonicalQuery: "search adult:true",
        visibleResults: [
          {
            id: "entry-1",
            title: "Adult Entry",
            media_type: "anime",
            status: "planning",
            adult: true,
            public_rating: 8,
            personal_rating: null,
            tags: [{ id: "tag-1", value: "Action", weight: "major" }],
          },
        ],
      },
    },
  });
  expect(chatResponse.ok()).toBeTruthy();

  const body = await chatResponse.json();
  expect(body.message).toContain("mock-gpt");
  expect(body.message).toContain("4 messages");
});

test("catalogue refresh requires the private refresh key", async ({
  request,
}) => {
  await signIn(request);

  const refreshResponse = await request.post("/catalogue/refresh", {
    data: { refreshWindowMs: 0 },
  });

  expect(refreshResponse.status()).toBe(401);
});

test("catalogue refresh can select AniList and TMDB only", async ({
  request,
}) => {
  await signIn(request);
  const refreshResponse = await refreshCatalogue(request, ["anilist", "tmdb"]);
  expect(refreshResponse.ok()).toBeTruthy();

  const body = await refreshResponse.json();
  expect(
    body.sources.map((source: { source_type: string }) => source.source_type)
  ).toEqual(["anilist", "tmdb"]);
});

test("recommendations refresh catalogue and rank by cosine similarity", async ({
  request,
}) => {
  await signIn(request);
  await configureMockAi(request);

  const refreshResponse = await refreshCatalogue(request);
  expect(refreshResponse.ok()).toBeTruthy();
  const refreshBody = await refreshResponse.json();
  expect(refreshBody).toMatchObject({
    source_type: "all",
    status: "completed",
  });
  expect(refreshBody.fetched_count).toBeGreaterThan(4);
  expect(refreshBody.embedded_count).toBeGreaterThan(0);
  expect(
    refreshBody.sources.map(
      (source: { source_type: string }) => source.source_type
    )
  ).toEqual(["anilist", "tmdb", "igdb", "openlibrary"]);

  const recommendationResponse = await request.post(
    "/recommendations/generate",
    {
      data: {
        prompt: "I want a cozy friendship anime with a warm mood",
        count: 2,
        debug: true,
        filters: {
          adult: "exclude",
          excludedMediaTypes: ["manga"],
          releaseYearFrom: 2020,
          minPublicRating: 8,
        },
      },
    }
  );
  expect(recommendationResponse.ok()).toBeTruthy();

  const body = await recommendationResponse.json();
  expect(body.items[0]).toMatchObject({
    title: "Cozy Friendship Anime",
    description: "A warm cozy adventure about friendship and gentle action.",
    source_url: "https://anilist.co/anime/1001",
    source_type: "anilist",
    source_media_id: "1001",
    media_type: "anime",
    adult: false,
  });
  expect(body.items[0].cosine_score).toBeGreaterThan(0);
  expect(body.items[0].score_breakdown).toMatchObject({
    cosine_weight: 0.82,
  });
  expect(body.items[0].match_score).toBeGreaterThan(0);
  expect(body.items[0].debug.embedding_model).toBe("text-embedding-3-small");
  expect(body.items.map((item: { title: string }) => item.title)).not.toContain(
    "Dark Horror Anime"
  );

  const allSourcesResponse = await request.post("/recommendations/generate", {
    data: {
      prompt: "Show me recommendations across every media type",
      count: 20,
    },
  });
  expect(allSourcesResponse.ok()).toBeTruthy();
  const allSourcesBody = await allSourcesResponse.json();
  expect(
    new Set(
      allSourcesBody.items.map(
        (item: { source_type: string }) => item.source_type
      )
    )
  ).toEqual(new Set(["anilist", "tmdb", "igdb", "openlibrary"]));
});

test("assistant can call the recommendation tool", async ({ request }) => {
  await signIn(request);
  await configureMockAi(request);

  const refreshResponse = await refreshCatalogue(request);
  expect(refreshResponse.ok()).toBeTruthy();

  const chatResponse = await request.post("/assistant/chat", {
    data: {
      message: "Could you recommend me a cozy friendship anime?",
      recommendationCount: 5,
      recommendationMediaTypes: ["anime"],
      includeRecommendationDetails: true,
    },
  });
  expect(chatResponse.ok()).toBeTruthy();

  const body = await chatResponse.json();
  expect(body.message).toContain("Cozy Friendship Anime");
  expect(body.recommendation_runs).toHaveLength(1);
  expect(body.recommendation_runs[0].input.count).toBe(5);
  expect(body.recommendation_runs[0].input.filters.excludedMediaTypes).toEqual([
    "movie",
    "tv_show",
    "game",
    "book",
    "manga",
    "other",
  ]);
  expect(body.recommendation_runs[0].items.length).toBeGreaterThan(0);
  expect(body.recommendation_runs[0].items.length).toBeLessThanOrEqual(5);
  expect(
    body.recommendation_runs[0].items.every(
      (item: { media_type: string }) => item.media_type === "anime"
    )
  ).toBeTruthy();
  expect(body.recommendation_runs[0].items[0]).toMatchObject({
    title: "Cozy Friendship Anime",
    source_url: "https://anilist.co/anime/1001",
  });

  const defaultResponse = await request.post("/assistant/chat", {
    data: {
      message: "Could you recommend another cozy friendship anime?",
    },
  });
  expect(defaultResponse.ok()).toBeTruthy();
  const defaultBody = await defaultResponse.json();
  expect(defaultBody.recommendation_runs).toBeUndefined();
});

test("streaming assistant emits opt-in recommendation details", async ({
  request,
}) => {
  await signIn(request);
  await configureMockAi(request);

  const refreshResponse = await refreshCatalogue(request);
  expect(refreshResponse.ok()).toBeTruthy();

  const chatResponse = await request.post("/assistant/chat/stream", {
    data: {
      message: "Recommend a warm friendship anime.",
      recommendationCount: 5,
      includeRecommendationDetails: true,
    },
  });
  expect(chatResponse.ok()).toBeTruthy();

  const body = await chatResponse.text();
  expect(body).toContain("event: recommendations");
  expect(body).toContain('"recommendation_runs"');
  expect(body).toContain('"count":5');
  expect(body).toContain("https://anilist.co/anime/1001");
  expect(body).toContain("event: done");
});

async function configureMockAi(request: Parameters<typeof signIn>[0]) {
  const sourceMockPort = process.env.METAVAULT_E2E_SOURCE_MOCK_PORT ?? "3636";
  const baseUrl = `http://localhost:${sourceMockPort}/openai/v1`;

  const configResponse = await request.put(
    "/ai-integrations/openai_compatible",
    {
      data: {
        is_active: true,
        config: {
          baseUrl,
          apiKey: "test-key",
          model: "mock-gpt",
        },
      },
    }
  );
  expect(configResponse.ok()).toBeTruthy();
}

function refreshCatalogue(
  request: Parameters<typeof signIn>[0],
  sources?: Array<"anilist" | "tmdb" | "igdb" | "openlibrary">
) {
  return request.post("/catalogue/refresh", {
    headers: {
      "x-metavault-catalogue-key":
        process.env.METAVAULT_CATALOGUE_REFRESH_KEY ?? "catalogue-test-key",
    },
    data: { refreshWindowMs: 0, ...(sources ? { sources } : {}) },
  });
}
