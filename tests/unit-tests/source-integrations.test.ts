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
let AniListSourceIntegration: typeof import("../../packages/server/enrichment/source-integrations/anilist/source-integration").AniListSourceIntegration;
let TmdbSourceIntegration: typeof import("../../packages/server/enrichment/source-integrations/tmdb/source-integration").TmdbSourceIntegration;
let IgdbSourceIntegration: typeof import("../../packages/server/enrichment/source-integrations/igdb/source-integration").IgdbSourceIntegration;
let OpenLibrarySourceIntegration: typeof import("../../packages/server/enrichment/source-integrations/openlibrary/source-integration").OpenLibrarySourceIntegration;
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
  const anilist = await import(
    "../../packages/server/enrichment/source-integrations/anilist/source-integration"
  );
  const tmdb = await import(
    "../../packages/server/enrichment/source-integrations/tmdb/source-integration"
  );
  const igdb = await import(
    "../../packages/server/enrichment/source-integrations/igdb/source-integration"
  );
  const openlibrary = await import(
    "../../packages/server/enrichment/source-integrations/openlibrary/source-integration"
  );

  sql = db.sql;
  sourceIntegrationService = service.sourceIntegrationService;
  sourceIntegrationRegistry = registry.sourceIntegrationRegistry;
  EnrichmentService = enrichment.EnrichmentService;
  AniListSourceIntegration = anilist.AniListSourceIntegration;
  TmdbSourceIntegration = tmdb.TmdbSourceIntegration;
  IgdbSourceIntegration = igdb.IgdbSourceIntegration;
  OpenLibrarySourceIntegration = openlibrary.OpenLibrarySourceIntegration;

  await db.applySchema();
});

describe.serial("SourceIntegrationService", () => {
  it.serial("returns all known source integrations", async () => {
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

  it.serial(
    "upserts source integration settings and returns parsed config",
    async () => {
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
        config_fields: [
          expect.objectContaining({
            key: "apiKey",
            label: "API Key",
            secret: true,
          }),
        ],
      });
    }
  );

  it.serial("returns provider-owned config fields for IGDB", async () => {
    const userId = await createUser("config-fields");

    const result = await sourceIntegrationService.getSettings(userId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.data.find((item) => item.integration_type === "igdb")
        ?.config_fields
    ).toEqual([
      expect.objectContaining({
        key: "clientId",
        label: "Client ID",
        secret: false,
        required: true,
      }),
      expect.objectContaining({
        key: "apiKey",
        label: "Access Token",
        secret: true,
        required: true,
      }),
    ]);
  });

  it.serial("returns no config fields for OpenLibrary", async () => {
    const userId = await createUser("openlibrary-config-fields");

    const result = await sourceIntegrationService.getSettings(userId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.data.find((item) => item.integration_type === "openlibrary")
        ?.config_fields
    ).toEqual([]);
  });

  it.serial(
    "allows inactive integrations to clear required config fields",
    async () => {
      const userId = await createUser("inactive-required-config");

      const result = await sourceIntegrationService.updateSettings({
        userId,
        integrationType: "tmdb",
        body: { is_active: false, config: {} },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.config).toEqual({});
      expect(result.data.is_active).toBe(false);
    }
  );

  it.serial("rejects invalid active config fields", async () => {
    const userId = await createUser("invalid-active-config");

    const result = await sourceIntegrationService.updateSettings({
      userId,
      integrationType: "tmdb",
      body: { is_active: true, config: { apiKey: "   " } },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
  });

  it.serial("does not fail settings reads for malformed config", async () => {
    const userId = await createUser("malformed-config");
    await sql`
      INSERT INTO source_integrations (
        id,
        user_id,
        integration_type,
        is_active,
        config_json
      )
      VALUES (
        ${crypto.randomUUID()},
        ${userId},
        ${"tmdb"},
        ${0},
        ${"not-json"}
      )
    `;

    const result = await sourceIntegrationService.getSettings(userId);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.data.find((item) => item.integration_type === "tmdb")?.config
    ).toEqual({});
  });

  it.serial(
    "registry selects OpenLibrary for book entries without user state",
    () => {
      const integration = sourceIntegrationRegistry.getIntegration(
        row({ media_type: "book" }),
        "openlibrary"
      );

      expect(integration?.sourceType).toBe("openlibrary");
    }
  );

  it.serial(
    "enrichment passes active user config to the source integration",
    async () => {
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
    }
  );

  it.serial(
    "inactive settings are stored but not used by enrichment",
    async () => {
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
    }
  );
});

describe.serial("AniListSourceIntegration", () => {
  it.serial("supports anime and manga entries", () => {
    const integration = new AniListSourceIntegration();

    expect(integration.supportsEntry(row({ media_type: "anime" }))).toBe(true);
    expect(integration.supportsEntry(row({ media_type: "manga" }))).toBe(true);
    expect(integration.supportsEntry(row({ media_type: "book" }))).toBe(false);
  });

  it.serial(
    "searches AniList with the entry title, media type, and optional bearer token",
    async () => {
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
    }
  );

  it.serial(
    "searches manga rows as MANGA without an Authorization header",
    async () => {
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

        expect((init as RequestInit).headers).not.toHaveProperty(
          "Authorization"
        );
        expect(body.variables.type).toBe("MANGA");
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );

  it.serial("maps AniList media into library enrichment data", () => {
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
      adult: false,
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

  it.serial("falls back across title, cover, and partial date values", () => {
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

  it.serial(
    "returns null when AniList has no usable media or the request fails",
    async () => {
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
    }
  );

  it.serial(
    "extends search rows and persists update rows through active AniList settings",
    async () => {
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
          updateResult[0]?.tags
            .map((tag) => `${tag.weight}:${tag.value}`)
            .sort()
        ).toEqual([
          "major:Action",
          "major:Drama",
          "minor:Adult Tag",
          "minor:Spoiler Tag",
        ]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );
});

describe.serial("TmdbSourceIntegration", () => {
  it.serial("supports movie and TV show entries", () => {
    const integration = new TmdbSourceIntegration();

    expect(integration.supportsEntry(row({ media_type: "movie" }))).toBe(true);
    expect(integration.supportsEntry(row({ media_type: "tv_show" }))).toBe(
      true
    );
    expect(integration.supportsEntry(row({ media_type: "game" }))).toBe(false);
  });

  it.serial(
    "searches TMDB with the entry title, media type, and API key",
    async () => {
      const integration = new TmdbSourceIntegration();
      const fetchMock = mock(
        async () => new Response(JSON.stringify(tmdbResponse()))
      );
      globalThis.fetch = fetchMock as typeof fetch;

      try {
        await integration.getEnrichmentData(row({ media_type: "movie" }), {
          command: { sourceType: "tmdb", mode: "add" },
          userId: "user-1",
          config: { apiKey: "tmdb-key" },
          sourceIntegrationId: "si-tmdb",
        });

        const [url] = fetchMock.mock.calls[0] ?? [];
        const parsedUrl = new URL(String(url));

        expect(parsedUrl.origin + parsedUrl.pathname).toBe(
          "https://api.themoviedb.org/3/search/movie"
        );
        expect(parsedUrl.searchParams.get("query")).toBe("Test Entry");
        expect(parsedUrl.searchParams.get("api_key")).toBe("tmdb-key");
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );

  it.serial("maps TMDB media into library enrichment data", () => {
    const integration = new TmdbSourceIntegration();
    const mapped = integration.mapToLibraryEntry(
      {
        media: tmdbMovie(),
        mediaType: "movie",
        genreNamesById: new Map([[28, "Action"]]),
        sourceIntegrationId: "si-tmdb",
      },
      row({ title: "Local Movie" })
    );

    expect(mapped).toMatchObject({
      title: "TMDB Movie",
      media_id: "501",
      source_id: "si-tmdb",
      media_type: "movie",
      image_src: "https://image.tmdb.org/t/p/w500/movie.jpg",
      public_rating: 8.3,
      released_at: "2024-05-06",
      tags: [{ value: "Action", weight: "major" }],
    });
  });

  it.serial("caches repeated TMDB search and genre requests", async () => {
    const integration = new TmdbSourceIntegration();
    const fetchMock = mock(async (url: URL | RequestInfo) => {
      const parsedUrl = new URL(String(url));
      if (parsedUrl.pathname === "/3/genre/movie/list") {
        return new Response(JSON.stringify(tmdbGenreResponse()));
      }

      return new Response(JSON.stringify(tmdbResponse()));
    });
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const params = {
        command: { sourceType: "tmdb" as const, mode: "add" as const },
        userId: "user-1",
        config: { apiKey: "tmdb-key" },
        sourceIntegrationId: "si-tmdb",
      };

      await integration.getEnrichmentData(row({ media_type: "movie" }), params);
      await integration.getEnrichmentData(row({ media_type: "movie" }), params);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe.serial("IgdbSourceIntegration", () => {
  it.serial("supports game entries", () => {
    const integration = new IgdbSourceIntegration();

    expect(integration.supportsEntry(row({ media_type: "game" }))).toBe(true);
    expect(integration.supportsEntry(row({ media_type: "movie" }))).toBe(false);
  });

  it.serial(
    "searches IGDB with client id, bearer token, and title",
    async () => {
      const integration = new IgdbSourceIntegration();
      const fetchMock = mock(
        async () => new Response(JSON.stringify([igdbGame()]))
      );
      globalThis.fetch = fetchMock as typeof fetch;

      try {
        await integration.getEnrichmentData(row({ media_type: "game" }), {
          command: { sourceType: "igdb", mode: "add" },
          userId: "user-1",
          config: { clientId: "client-1", apiKey: "token-1" },
          sourceIntegrationId: "si-igdb",
        });

        const [url, init] = fetchMock.mock.calls[0] ?? [];

        expect(url).toBe("https://api.igdb.com/v4/games");
        expect((init as RequestInit).method).toBe("POST");
        expect((init as RequestInit).headers).toMatchObject({
          "Client-ID": "client-1",
          Authorization: "Bearer token-1",
        });
        expect(String((init as RequestInit).body)).toContain(
          'search "Test Entry"'
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  );

  it.serial("maps IGDB games into library enrichment data", () => {
    const integration = new IgdbSourceIntegration();
    const mapped = integration.mapToLibraryEntry(
      {
        game: igdbGame(),
        sourceIntegrationId: "si-igdb",
      },
      row({ title: "Local Game" })
    );

    expect(mapped).toEqual({
      title: "IGDB Game",
      media_id: "701",
      source_id: "si-igdb",
      media_type: "game",
      image_src:
        "https://images.igdb.com/igdb/image/upload/t_cover_big/game.jpg",
      public_rating: 8.8,
      released_at: "2023-05-18",
      tags: [
        { value: "Adventure", weight: "major" },
        { value: "RPG", weight: "major" },
      ],
    });
  });
});

describe.serial("OpenLibrarySourceIntegration", () => {
  it.serial("supports book entries", () => {
    const integration = new OpenLibrarySourceIntegration();

    expect(integration.supportsEntry(row({ media_type: "book" }))).toBe(true);
    expect(integration.supportsEntry(row({ media_type: "anime" }))).toBe(false);
  });

  it.serial("searches OpenLibrary with the entry title", async () => {
    const integration = new OpenLibrarySourceIntegration();
    const fetchMock = mock(
      async () => new Response(JSON.stringify(openLibraryResponse()))
    );
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      await integration.getEnrichmentData(row({ media_type: "book" }), {
        command: { sourceType: "openlibrary", mode: "add" },
        userId: "user-1",
        config: {},
        sourceIntegrationId: "si-openlibrary",
      });

      const [url] = fetchMock.mock.calls[0] ?? [];
      const parsedUrl = new URL(String(url));

      expect(parsedUrl.origin + parsedUrl.pathname).toBe(
        "https://openlibrary.org/search.json"
      );
      expect(parsedUrl.searchParams.get("title")).toBe("Test Entry");
      expect(parsedUrl.searchParams.get("limit")).toBe("1");
      expect(parsedUrl.searchParams.get("fields")).toBe(
        "key,title,cover_i,first_publish_year,ratings_average,subject"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it.serial("maps OpenLibrary books into library enrichment data", () => {
    const integration = new OpenLibrarySourceIntegration();
    const mapped = integration.mapToLibraryEntry(
      {
        doc: openLibraryDoc(),
        sourceIntegrationId: "si-openlibrary",
      },
      row({ title: "Local Book" })
    );

    expect(mapped).toEqual({
      title: "OpenLibrary Book",
      media_id: "/works/OL1W",
      source_id: "si-openlibrary",
      media_type: "book",
      image_src: "https://covers.openlibrary.org/b/id/12345-L.jpg",
      public_rating: 9.2,
      released_at: "2017-01-01",
      tags: [
        { value: "Fantasy", weight: "major" },
        { value: "Magic", weight: "major" },
        { value: "Adventure", weight: "major" },
        { value: "Children's fiction", weight: "major" },
      ],
    });
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
    adult: false,
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
    isAdult: false,
    genres: ["Action", "Drama"],
    tags: [{ name: "Spoiler Tag" }, { name: "Adult Tag" }],
    ...overrides,
  };
}

function tmdbResponse(media = tmdbMovie()) {
  return {
    results: [media],
  };
}

function tmdbGenreResponse() {
  return {
    genres: [{ id: 28, name: "Action" }],
  };
}

function tmdbMovie(overrides: Record<string, unknown> = {}) {
  return {
    id: 501,
    title: "TMDB Movie",
    original_title: "Original TMDB Movie",
    poster_path: "/movie.jpg",
    vote_average: 8.3,
    release_date: "2024-05-06",
    genre_ids: [28],
    ...overrides,
  };
}

function igdbGame(overrides: Record<string, unknown> = {}) {
  return {
    id: 701,
    name: "IGDB Game",
    cover: {
      url: "//images.igdb.com/igdb/image/upload/t_thumb/game.jpg",
    },
    rating: 88,
    first_release_date: 1_684_368_000,
    genres: [{ name: "Adventure" }, { name: "RPG" }],
    ...overrides,
  };
}

function openLibraryResponse(doc = openLibraryDoc()) {
  return {
    docs: [doc],
  };
}

function openLibraryDoc(overrides: Record<string, unknown> = {}) {
  return {
    key: "/works/OL1W",
    title: "OpenLibrary Book",
    cover_i: 12_345,
    first_publish_year: 2017,
    ratings_average: 4.6,
    subject: ["Fantasy", "Magic", "Adventure", "Children's fiction"],
    ...overrides,
  };
}
