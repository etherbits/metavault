import { beforeAll, describe, expect, it, mock } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { LibraryEntryWithTags } from "../../packages/server/ezq/ezq.schema";

const testRoot = mkdtempSync(path.join(tmpdir(), "metavault-si-unit-"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "unit-secret";
process.env.DATABASE_URL = `sqlite://${path.join(testRoot, "db.sqlite")}`;

let sourceIntegrationService: typeof import("../../packages/server/source-integrations/source-integration.service").sourceIntegrationService;
let sourceIntegrationRegistry: typeof import("../../packages/server/enrichment/source-integration-registry").sourceIntegrationRegistry;
let EnrichmentService: typeof import("../../packages/server/enrichment/enrichment.service").EnrichmentService;
let AniListSourceIntegration: typeof import("../../packages/server/enrichment/source-integrations").AniListSourceIntegration;
let sql: typeof import("../../packages/server/db").sql;
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  const db = await import("../../packages/server/db");
  const service = await import(
    "../../packages/server/source-integrations/source-integration.service"
  );
  const registry = await import(
    "../../packages/server/enrichment/source-integration-registry"
  );
  const enrichment = await import(
    "../../packages/server/enrichment/enrichment.service"
  );
  const sourceIntegrations = await import(
    "../../packages/server/enrichment/source-integrations"
  );

  sql = db.sql;
  sourceIntegrationService = service.sourceIntegrationService;
  sourceIntegrationRegistry = registry.sourceIntegrationRegistry;
  EnrichmentService = enrichment.EnrichmentService;
  AniListSourceIntegration = sourceIntegrations.AniListSourceIntegration;

  await db.applySchema();
});

describe("SourceIntegrationService", () => {
  it("returns all known source integrations", async () => {
    const userId = await createUser("known");

    const result = await sourceIntegrationService.getSettings(userId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((item) => item.integration_type).sort()).toEqual([
      "anilist",
      "igdb",
      "openlibrary",
      "tmdb",
    ]);
  });

  it("upserts source integration settings and returns parsed config", async () => {
    const userId = await createUser("upsert");

    const first = await sourceIntegrationService.updateSettings({
      userId,
      integrationType: "anilist",
      body: { is_active: true, config: { apiKey: "first", extra: 1 } },
    });
    const second = await sourceIntegrationService.updateSettings({
      userId,
      integrationType: "anilist",
      body: { is_active: false, config: { apiKey: "second" } },
    });
    const settings = await sourceIntegrationService.getSettings(userId);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(settings.ok).toBe(true);
    if (!settings.ok) return;
    expect(
      settings.data.find((item) => item.integration_type === "anilist")
    ).toMatchObject({
      integration_type: "anilist",
      is_active: false,
      config: { apiKey: "second" },
    });
  });

  it("registry selects OpenLibrary for book entries without user state", () => {
    const integration = sourceIntegrationRegistry.getIntegration(
      row({ media_type: "book" }),
      "openlibrary"
    );

    expect(integration?.sourceType).toBe("openlibrary");
  });

  it("enrichment passes active user config to the source integration", async () => {
    const userId = await createUser("registry");
    await sourceIntegrationService.updateSettings({
      userId,
      integrationType: "openlibrary",
      body: { is_active: true, config: { apiKey: "books" } },
    });
    const integration = sourceIntegrationRegistry.getIntegration(
      row({ media_type: "book" }),
      "openlibrary"
    );
    if (!integration) throw new Error("OpenLibrary integration not found");
    const originalGetEnrichmentData = integration.getEnrichmentData;
    const originalMapToLibraryEntry = integration.mapToLibraryEntry;
    const getEnrichmentData = mock(async () => ({ ok: true }));
    integration.getEnrichmentData = getEnrichmentData;
    integration.mapToLibraryEntry = () => ({
      title: "Enriched Book",
      image_src: "https://example.test/book.jpg",
    });

    try {
      const service = new EnrichmentService();
      const result = await service.extendResponse({
        command: { sourceType: "openlibrary", mode: "add" },
        rows: [row({ media_type: "book" })],
        userId,
      });

      expect(result[0]?.title).toBe("Test Entry");
      expect(result[0]?.image_src).toBe("https://example.test/book.jpg");
      expect(getEnrichmentData).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userId,
          config: { apiKey: "books" },
        })
      );
    } finally {
      integration.getEnrichmentData = originalGetEnrichmentData;
      integration.mapToLibraryEntry = originalMapToLibraryEntry;
    }
  });

  it("inactive settings are stored but not used by enrichment", async () => {
    const userId = await createUser("inactive");
    await sourceIntegrationService.updateSettings({
      userId,
      integrationType: "tmdb",
      body: { is_active: false, config: { apiKey: "movies" } },
    });
    const integration = sourceIntegrationRegistry.getIntegration(
      row({ media_type: "movie" }),
      "tmdb"
    );
    if (!integration) throw new Error("TMDB integration not found");
    const originalGetEnrichmentData = integration.getEnrichmentData;
    const getEnrichmentData = mock(async () => ({ ok: true }));
    integration.getEnrichmentData = getEnrichmentData;

    try {
      const service = new EnrichmentService();
      const result = await service.extendResponse({
        command: { sourceType: "tmdb", mode: "add" },
        rows: [row({ media_type: "movie" })],
        userId,
      });

      expect(result[0]?.title).toBe("Test Entry");
      expect(getEnrichmentData).not.toHaveBeenCalled();
    } finally {
      integration.getEnrichmentData = originalGetEnrichmentData;
    }
  });
});

describe("AniListSourceIntegration", () => {
  it("supports anime and manga entries", () => {
    const integration = new AniListSourceIntegration();

    expect(integration.supportsEntry(row({ media_type: "anime" }))).toBe(true);
    expect(integration.supportsEntry(row({ media_type: "manga" }))).toBe(true);
    expect(integration.supportsEntry(row({ media_type: "book" }))).toBe(false);
  });

  it("searches AniList with the entry title, media type, and optional bearer token", async () => {
    const integration = new AniListSourceIntegration();
    const fetchMock = mock(
      async () => new Response(JSON.stringify(anilistResponse()))
    );
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      await integration.getEnrichmentData(row({ media_type: "anime" }), {
        command: { sourceType: "anilist", mode: "add" },
        userId: "user-1",
        config: { apiKey: "token-1" },
        sourceIntegrationId: "si-1",
      });

      const [url, init] = fetchMock.mock.calls[0] ?? [];
      const body = JSON.parse(String((init as RequestInit).body));

      expect(url).toBe("https://graphql.anilist.co");
      expect((init as RequestInit).method).toBe("POST");
      expect((init as RequestInit).headers).toMatchObject({
        Authorization: "Bearer token-1",
      });
      expect(body.variables).toEqual({
        search: "Test Entry",
        type: "ANIME",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("searches manga rows as MANGA without an Authorization header", async () => {
    const integration = new AniListSourceIntegration();
    const fetchMock = mock(
      async () => new Response(JSON.stringify(anilistResponse()))
    );
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      await integration.getEnrichmentData(row({ media_type: "manga" }), {
        command: { sourceType: "anilist", mode: "add" },
        userId: "user-1",
        config: {},
      });

      const [, init] = fetchMock.mock.calls[0] ?? [];
      const body = JSON.parse(String((init as RequestInit).body));

      expect((init as RequestInit).headers).not.toHaveProperty("Authorization");
      expect(body.variables.type).toBe("MANGA");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps AniList media into library enrichment data", () => {
    const integration = new AniListSourceIntegration();
    const mapped = integration.mapToLibraryEntry(
      {
        media: anilistMedia(),
        sourceIntegrationId: "si-1",
      },
      row({ title: "Local Title" })
    );

    expect(mapped).toEqual({
      title: "English Title",
      media_id: "101",
      source_id: "si-1",
      media_type: "anime",
      image_src: "https://img.test/extra.jpg",
      public_rating: 8.7,
      released_at: "2024-04-05",
      tags: [
        { value: "Action", weight: "major" },
        { value: "Drama", weight: "major" },
        { value: "Spoiler Tag", weight: "minor" },
        { value: "Adult Tag", weight: "minor" },
      ],
    });
  });

  it("falls back across title, cover, and partial date values", () => {
    const integration = new AniListSourceIntegration();
    const mapped = integration.mapToLibraryEntry(
      {
        media: anilistMedia({
          title: {
            english: null,
            romaji: null,
            userPreferred: "Preferred Title",
            native: "Native Title",
          },
          coverImage: {
            extraLarge: null,
            large: "https://img.test/large.jpg",
            medium: "https://img.test/medium.jpg",
          },
          startDate: { year: 2024, month: null, day: null },
        }),
      },
      row({ title: "Local Title" })
    );

    expect(mapped?.title).toBe("Preferred Title");
    expect(mapped?.image_src).toBe("https://img.test/large.jpg");
    expect(mapped?.released_at).toBeNull();
  });

  it("returns null when AniList has no usable media or the request fails", async () => {
    const integration = new AniListSourceIntegration();
    const fetchMock = mock(async () => new Response(JSON.stringify({})));
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const emptyResult = await integration.getEnrichmentData(
        row({ media_type: "anime" }),
        {
          command: { sourceType: "anilist", mode: "add" },
          userId: "user-1",
          config: {},
        }
      );
      expect(emptyResult).toBeNull();

      fetchMock.mockImplementationOnce(
        async () => new Response("error", { status: 500 })
      );
      const errorResult = await integration.getEnrichmentData(
        row({ media_type: "anime" }),
        {
          command: { sourceType: "anilist", mode: "add" },
          userId: "user-1",
          config: {},
        }
      );
      expect(errorResult).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("extends search rows and persists update rows through active AniList settings", async () => {
    const userId = await createUser("anilist-real");
    await sourceIntegrationService.updateSettings({
      userId,
      integrationType: "anilist",
      body: { is_active: true, config: {} },
    });
    const sourceRows = await sql`
      SELECT id
      FROM source_integrations
      WHERE user_id = ${userId}
      AND integration_type = 'anilist'
      LIMIT 1
    `;
    const sourceIntegrationId = (sourceRows[0] as { id: string }).id;
    const entry = await insertLibraryEntry({
      id: "anilist-entry-1",
      userId,
      title: "Attack on Titan",
      mediaType: "anime",
    });
    const fetchMock = mock(
      async () => new Response(JSON.stringify(anilistResponse()))
    );
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const service = new EnrichmentService();
      const searchResult = await service.extendResponse({
        command: { sourceType: "anilist", mode: "override" },
        rows: [entry],
        userId,
      });
      const updateResult = await service.updateEntry({
        command: { sourceType: "anilist", mode: "override" },
        rows: [entry],
        userId,
      });

      expect(searchResult[0]).toMatchObject({
        title: "English Title",
        media_id: "101",
        source_id: sourceIntegrationId,
        image_src: "https://img.test/extra.jpg",
        public_rating: 8.7,
        released_at: "2024-04-05",
      });
      expect(updateResult[0]).toMatchObject({
        title: "English Title",
        media_id: "101",
        source_id: sourceIntegrationId,
        image_src: "https://img.test/extra.jpg",
        public_rating: 8.7,
        released_at: "2024-04-05",
      });
      expect(
        updateResult[0]?.tags.map((tag) => `${tag.weight}:${tag.value}`).sort()
      ).toEqual([
        "major:Action",
        "major:Drama",
        "minor:Adult Tag",
        "minor:Spoiler Tag",
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

async function createUser(suffix: string) {
  const userId = `unit-source-${suffix}`;
  await sql`
    INSERT INTO users (id, username, email, password_hash, is_verified)
    VALUES (${userId}, ${userId}, ${`${userId}@test.local`}, 'hash', 1)
    ON CONFLICT DO NOTHING
  `;
  return userId;
}

function row(
  overrides: Partial<LibraryEntryWithTags> = {}
): LibraryEntryWithTags {
  return {
    id: "entry-1",
    title: "Test Entry",
    user_id: "user-1",
    media_id: null,
    source_id: null,
    image_src: null,
    media_type: "book",
    status: "planning",
    public_rating: null,
    personal_rating: null,
    released_at: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    tags: [],
    ...overrides,
  };
}

async function insertLibraryEntry({
  id,
  userId,
  title,
  mediaType,
}: {
  id: string;
  userId: string;
  title: string;
  mediaType: NonNullable<LibraryEntryWithTags["media_type"]>;
}) {
  await sql`
    INSERT INTO library_entries (id, user_id, title, media_type, status)
    VALUES (${id}, ${userId}, ${title}, ${mediaType}, 'planning')
  `;

  return {
    ...row({ id, user_id: userId, title, media_type: mediaType }),
    tags: [],
  };
}

function anilistResponse(media = anilistMedia()) {
  return {
    data: {
      Media: media,
    },
  };
}

function anilistMedia(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    title: {
      english: "English Title",
      romaji: "Romaji Title",
      userPreferred: "Preferred Title",
      native: "Native Title",
    },
    type: "ANIME",
    startDate: {
      year: 2024,
      month: 4,
      day: 5,
    },
    coverImage: {
      extraLarge: "https://img.test/extra.jpg",
      large: "https://img.test/large.jpg",
      medium: "https://img.test/medium.jpg",
    },
    averageScore: 87,
    genres: ["Action", "Drama"],
    tags: [{ name: "Spoiler Tag" }, { name: "Adult Tag" }],
    ...overrides,
  };
}
