import { type APIRequestContext, expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

type IntegrationCase = {
  sourceType: "anilist" | "tmdb" | "igdb" | "openlibrary";
  mediaType: "anime" | "movie" | "game" | "book";
  config: Record<string, string>;
};

const cases: IntegrationCase[] = [
  { sourceType: "anilist", mediaType: "anime", config: {} },
  { sourceType: "tmdb", mediaType: "movie", config: { apiKey: "tmdb-key" } },
  {
    sourceType: "igdb",
    mediaType: "game",
    config: { clientId: "igdb-client", apiKey: "igdb-token" },
  },
  { sourceType: "openlibrary", mediaType: "book", config: {} },
];

for (const integration of cases) {
  test(`POST /ezq creates a ${integration.mediaType} entry enriched by ${integration.sourceType}`, async ({
    request,
  }) => {
    await signIn(request);
    await enableSourceIntegration(request, integration);

    const titleToken = `e2e_${integration.sourceType}_enrich_${Date.now()}`;
    const response = await request.post("/ezq", {
      data: {
        query: `/c ${titleToken} mt:${integration.mediaType} #${getEnrichCommand(integration.sourceType)}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.rows).toHaveLength(1);

    const entry = body.rows[0];
    expect(entry.title).toContain(sourceDisplayName(integration.sourceType));
    expect(entry.media_type).toBe(integration.mediaType);
    expect(entry.media_id).toBeTruthy();
    expect(entry.source_id).toBeTruthy();
    expect(entry.image_src).toBeTruthy();

    if (integration.sourceType !== "openlibrary") {
      expect(entry.public_rating).toBeGreaterThan(0);
    }

    if (
      integration.sourceType === "anilist" ||
      integration.sourceType === "igdb"
    ) {
      expect(entry.tags.length).toBeGreaterThan(0);
    }
  });
}

async function enableSourceIntegration(
  request: APIRequestContext,
  integration: IntegrationCase
) {
  const response = await request.put(
    `/source-integrations/${integration.sourceType}`,
    {
      data: {
        is_active: true,
        config: integration.config,
      },
    }
  );

  expect(response.ok()).toBeTruthy();
}

function getEnrichCommand(sourceType: IntegrationCase["sourceType"]) {
  if (sourceType === "anilist") return "enr:ovr:ani";
  return `enrich:override:${sourceType}`;
}

function sourceDisplayName(sourceType: IntegrationCase["sourceType"]) {
  if (sourceType === "openlibrary") return "OpenLibrary";
  if (sourceType === "anilist") return "AniList";
  return sourceType.toUpperCase();
}
