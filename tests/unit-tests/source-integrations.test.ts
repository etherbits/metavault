import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, mock } from "bun:test";

const testRoot = mkdtempSync(path.join(tmpdir(), "metavault-si-unit-"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "unit-secret";
process.env.DATABASE_URL = `sqlite://${path.join(testRoot, "db.sqlite")}`;

let sourceIntegrationService: typeof import("../../packages/server/source-integrations/source-integration.service").sourceIntegrationService;
let sourceIntegrationRegistry: typeof import("../../packages/server/enrichment/source-integration-registry").sourceIntegrationRegistry;
let EnrichmentService: typeof import("../../packages/server/enrichment/enrichment.service").EnrichmentService;
let sql: typeof import("../../packages/server/db").sql;

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

  sql = db.sql;
  sourceIntegrationService = service.sourceIntegrationService;
  sourceIntegrationRegistry = registry.sourceIntegrationRegistry;
  EnrichmentService = enrichment.EnrichmentService;

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

async function createUser(suffix: string) {
  const userId = `unit-source-${suffix}`;
  await sql`
    INSERT INTO users (id, username, email, password_hash, is_verified)
    VALUES (${userId}, ${userId}, ${`${userId}@test.local`}, 'hash', 1)
    ON CONFLICT DO NOTHING
  `;
  return userId;
}

function row(overrides = {}) {
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
