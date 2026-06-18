import { beforeAll, describe, expect, it, mock } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { CommandDelegator } from "../../packages/server/commands/command-delegator";
import type {
  CommandExecutionParams,
  CommandExecutor,
} from "../../packages/server/commands/command-executor";
import {
  getFuzzyCandidates,
  normalizeCommandSegments,
  parseCommandUnion,
  parseCommandWithSchema,
  unwrapCommandSegmentSchema,
} from "../../packages/server/commands/command-schema";
import type {
  EnrichedLibraryEntryData,
  SourceIntegration,
} from "../../packages/server/enrichment/types";

process.env.JWT_SECRET ??= "unit-secret";
process.env.DATABASE_URL ??= `sqlite://${path.join(
  mkdtempSync(path.join(tmpdir(), "metavault-command-unit-")),
  "db.sqlite"
)}`;

let EnrichmentCommandExecutor: typeof import("../../packages/server/enrichment/enrichment-command-executor").EnrichmentCommandExecutor;
let EnrichmentService: typeof import("../../packages/server/enrichment/enrichment.service").EnrichmentService;
let SourceIntegrationRegistry: typeof import("../../packages/server/enrichment/source-integration-registry").SourceIntegrationRegistry;
let AliasCommandExecutor: typeof import("../../packages/server/aliases/alias-command-executor").AliasCommandExecutor;
let PullCommandExecutor: typeof import("../../packages/server/catalogue/pull-command-executor").PullCommandExecutor;
let sql: typeof import("../../packages/server/db").sql;

beforeAll(async () => {
  const db = await import("../../packages/server/db");
  const commandExecutor = await import(
    "../../packages/server/enrichment/enrichment-command-executor"
  );
  const aliasCommandExecutor = await import(
    "../../packages/server/aliases/alias-command-executor"
  );
  const pullCommandExecutor = await import(
    "../../packages/server/catalogue/pull-command-executor"
  );
  const enrichmentService = await import(
    "../../packages/server/enrichment/enrichment.service"
  );
  const sourceIntegrationRegistry = await import(
    "../../packages/server/enrichment/source-integration-registry"
  );

  EnrichmentCommandExecutor = commandExecutor.EnrichmentCommandExecutor;
  EnrichmentService = enrichmentService.EnrichmentService;
  SourceIntegrationRegistry =
    sourceIntegrationRegistry.SourceIntegrationRegistry;
  AliasCommandExecutor = aliasCommandExecutor.AliasCommandExecutor;
  PullCommandExecutor = pullCommandExecutor.PullCommandExecutor;
  sql = db.sql;

  await db.applySchema();
});

function row(overrides = {}) {
  return {
    id: "entry-1",
    title: "Attack on Titan",
    user_id: "user-1",
    media_id: null,
    source_id: null,
    image_src: null,
    media_type: "anime",
    status: "planning",
    adult: false,
    public_rating: null,
    personal_rating: null,
    released_at: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    tags: [],
    ...overrides,
  } as CommandExecutionParams["rows"][number];
}

function createExecutor({
  canExecute,
  execute,
}: {
  canExecute: (command: string) => boolean;
  execute?: CommandExecutor["execute"];
}): CommandExecutor & {
  canExecute: ReturnType<typeof mock>;
  execute: ReturnType<typeof mock>;
} {
  return {
    canExecute: mock(canExecute),
    execute: mock(execute ?? (async (params) => ({ rows: params.rows }))),
  };
}

async function ensureUser(userId: string) {
  await sql`
    INSERT OR IGNORE INTO users (id, username, email, password_hash, is_verified)
    VALUES (${userId}, ${userId}, ${`${userId}@test.local`}, 'hash', 1)
  `;
}

async function insertCatalogueEntry(input: {
  id: string;
  sourceType?: string;
  sourceMediaId: string;
  mediaType: string;
  title: string;
  popularity: number | null;
  publicRating?: number | null;
  genres?: string[];
  tags?: string[];
}) {
  await sql`
    INSERT INTO catalogue_entries (
      id,
      source_type,
      source_media_id,
      media_type,
      title,
      adult,
      public_rating,
      popularity,
      genres_json,
      tags_json,
      metadata_json,
      embedding_text_hash
    )
    VALUES (
      ${input.id},
      ${input.sourceType ?? "anilist"},
      ${input.sourceMediaId},
      ${input.mediaType},
      ${input.title},
      0,
      ${input.publicRating ?? null},
      ${input.popularity},
      ${JSON.stringify(input.genres ?? [])},
      ${JSON.stringify(input.tags ?? [])},
      '{}',
      ${`hash-${input.id}`}
    )
    ON CONFLICT(source_type, source_media_id, media_type) DO UPDATE SET
      title = excluded.title,
      popularity = excluded.popularity,
      public_rating = excluded.public_rating,
      genres_json = excluded.genres_json,
      tags_json = excluded.tags_json
  `;
}

const params: Omit<CommandExecutionParams, "command"> = {
  action: "update",
  userId: "user-1",
  rows: [row()],
  filterRowsByExpression: mock(async (_expression, rows) => rows),
};

describe("command schema parser", () => {
  const commandSchema = z
    .tuple([
      z.literal("enrich"),
      z.enum(["add", "override"]).default("add"),
      z.enum(["anilist", "tmdb", "igdb", "openlibrary"]).optional(),
    ])
    .transform(([, mode, sourceType]) => ({ mode, sourceType }));

  it("extracts fuzzy candidates from literals and enums", () => {
    expect(getFuzzyCandidates(z.literal("enrich"))).toEqual(["enrich"]);
    expect(getFuzzyCandidates(z.enum(["add", "override"]))).toEqual([
      "add",
      "override",
    ]);
  });

  it("unwraps optional and default segment schemas for candidate lookup", () => {
    const schema = z.enum(["add", "override"]).optional().default("add");

    expect(
      unwrapCommandSegmentSchema(schema).safeParse("override").success
    ).toBe(true);
    expect(getFuzzyCandidates(schema)).toEqual(["add", "override"]);
  });

  it("skips fuzzy matching for unsupported segment schemas", () => {
    const schema = z.tuple([z.literal("set"), z.number()]);

    expect(getFuzzyCandidates(z.number())).toBe(null);
    expect(normalizeCommandSegments(schema, "set:42")).toEqual(["set", "42"]);
    expect(parseCommandWithSchema(schema, "set:42")).toBe(null);
  });

  it("normalizes exact, fuzzy, defaulted, and empty command segments", () => {
    expect(parseCommandWithSchema(commandSchema, "enrich")).toEqual({
      mode: "add",
      sourceType: undefined,
    });
    expect(parseCommandWithSchema(commandSchema, "enr")).toEqual({
      mode: "add",
      sourceType: undefined,
    });
    expect(parseCommandWithSchema(commandSchema, "enr:ovr:ani")).toEqual({
      mode: "override",
      sourceType: "anilist",
    });
    expect(parseCommandWithSchema(commandSchema, "en:add:openlib")).toEqual({
      mode: "add",
      sourceType: "openlibrary",
    });
    expect(parseCommandWithSchema(commandSchema, "enrich::tmdb")).toEqual({
      mode: "add",
      sourceType: "tmdb",
    });
  });

  it("parses command unions in order", () => {
    const fallbackSchema = z
      .tuple([z.literal("fallback")])
      .transform(() => ({ mode: "fallback" }));

    expect(
      parseCommandUnion([commandSchema, fallbackSchema], "fallback")
    ).toEqual({ mode: "fallback" });
  });

  it("rejects unsupported command names and segments", () => {
    expect(parseCommandWithSchema(commandSchema, "foo")).toBe(null);
    expect(parseCommandWithSchema(commandSchema, "zzzz")).toBe(null);
    expect(parseCommandWithSchema(commandSchema, "enrich:unknown")).toBe(null);
    expect(parseCommandWithSchema(commandSchema, "enrich:anilist")).toBe(null);
    expect(parseCommandWithSchema(commandSchema, "enrich:full:anilist")).toBe(
      null
    );
    expect(parseCommandWithSchema(commandSchema, "enrich:add:unknown")).toBe(
      null
    );
  });
});

describe("CommandDelegator", () => {
  it("delegates a supported command to the matching executor", async () => {
    const executor = createExecutor({
      canExecute: (command) => command === "a",
    });
    const delegator = new CommandDelegator([executor]);

    const result = await delegator.delegateCommands(["a"], params);

    expect(result.rows).toEqual(params.rows);
    expect(executor.canExecute).toHaveBeenCalledWith("a");
    expect(executor.execute).toHaveBeenCalledWith({
      ...params,
      command: "a",
    });
  });

  it("continues when no executor can handle a command", async () => {
    const executor = createExecutor({ canExecute: () => false });
    const delegator = new CommandDelegator([executor]);

    const result = await delegator.delegateCommands(["unknown"], params);

    expect(result.rows).toEqual(params.rows);
    expect(executor.canExecute).toHaveBeenCalledWith("unknown");
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it("uses the first executor that can execute the command", async () => {
    const first = createExecutor({ canExecute: () => true });
    const second = createExecutor({ canExecute: () => true });
    const delegator = new CommandDelegator([first, second]);

    expect(delegator.getExecutor("enrich")).toBe(first);
    await delegator.delegateCommands(["enrich"], params);

    expect(first.execute).toHaveBeenCalledWith({
      ...params,
      command: "enrich",
    });
    expect(second.canExecute).not.toHaveBeenCalled();
    expect(second.execute).not.toHaveBeenCalled();
  });

  it("chains returned rows between commands in order", async () => {
    const firstRows = [row({ id: "first" })];
    const secondRows = [row({ id: "second" })];
    const executor = createExecutor({
      canExecute: () => true,
      execute: async ({ command, rows }) => ({
        rows: command === "a" ? firstRows : [...rows, ...secondRows],
      }),
    });
    const delegator = new CommandDelegator([executor]);

    const result = await delegator.delegateCommands(["a", "b"], params);

    expect(result.rows).toEqual([...firstRows, ...secondRows]);
  });
});

describe("AliasCommandExecutor", () => {
  it("accepts alias commands", () => {
    const executor = new AliasCommandExecutor();

    expect(executor.canExecute("alias:favorite-w")).toBe(true);
    expect(executor.canExecute("alias")).toBe(false);
    expect(executor.canExecute("enrich")).toBe(false);
  });

  it("loads the user alias and filters rows through the command context", async () => {
    const userId = "alias-command-user";
    await sql`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, is_verified)
      VALUES (${userId}, 'alias-command-user', 'alias-command-user@test.local', 'hash', 1)
    `;
    await sql`
      INSERT INTO alias_mappings (id, user_id, alias, expansion)
      VALUES (${crypto.randomUUID()}, ${userId}, 'favorite-w', 'personal_rating:>7 media_type:anime')
      ON CONFLICT(user_id, alias) DO UPDATE SET
        expansion = excluded.expansion
    `;

    const filteredRows = [row({ id: "filtered" })];
    const filterRowsByExpression = mock(async () => filteredRows);
    const executor = new AliasCommandExecutor();

    const result = await executor.execute({
      ...params,
      command: "alias:favorite-w",
      userId,
      filterRowsByExpression,
    });

    expect(result.rows).toBe(filteredRows);
    expect(filterRowsByExpression).toHaveBeenCalledWith(
      {
        And: [{ Leaf: "personal_rating:>7" }, { Leaf: "media_type:anime" }],
      },
      params.rows
    );
  });
});

describe("PullCommandExecutor", () => {
  it("accepts valid pull commands", () => {
    const executor = new PullCommandExecutor();

    expect(executor.canExecute("pull:anime:200")).toBe(true);
    expect(executor.canExecute("pull:all:10")).toBe(true);
    expect(executor.canExecute("pull:other:10")).toBe(false);
    expect(executor.canExecute("pull:anime:0")).toBe(false);
    expect(executor.canExecute("pull:anime:501")).toBe(false);
    expect(executor.canExecute("pull:anime")).toBe(false);
  });

  it("previews top catalogue entries for search without creating library rows", async () => {
    const userId = "pull-search-user";
    await ensureUser(userId);
    const existingRows = [row({ id: "existing-search-row" })];
    await insertCatalogueEntry({
      id: "pull-search-low",
      sourceMediaId: "pull-search-low-media",
      mediaType: "anime",
      title: "Pull Search Low",
      popularity: 10,
    });
    await insertCatalogueEntry({
      id: "pull-search-high",
      sourceMediaId: "pull-search-high-media",
      mediaType: "anime",
      title: "Pull Search High",
      popularity: 100,
      genres: ["action"],
    });

    const executor = new PullCommandExecutor();
    const result = await executor.execute({
      ...params,
      action: "search",
      rows: existingRows,
      userId,
      command: "pull:anime:1",
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows).not.toEqual(existingRows);
    expect(result.rows[0]).toMatchObject({
      id: "catalogue:pull-search-high",
      title: "Pull Search High",
      media_id: "pull-search-high-media",
      media_type: "anime",
      status: null,
      tags: [expect.objectContaining({ value: "action", weight: "major" })],
    });

    const libraryRows = await sql`
      SELECT *
      FROM library_entries
      WHERE user_id = ${userId}
      AND media_id = 'pull-search-high-media'
    `;
    expect(libraryRows).toHaveLength(0);
  });

  it("creates pulled catalogue entries only for create actions and skips existing library media", async () => {
    const userId = "pull-create-user";
    await ensureUser(userId);
    await insertCatalogueEntry({
      id: "pull-create-game",
      sourceType: "igdb",
      sourceMediaId: "pull-create-game-media",
      mediaType: "game",
      title: "Pull Create Game",
      popularity: 100,
      tags: ["favorite"],
    });
    await insertCatalogueEntry({
      id: "pull-create-existing-game",
      sourceType: "igdb",
      sourceMediaId: "pull-create-existing-game-media",
      mediaType: "game",
      title: "Pull Create Existing Game",
      popularity: 90,
    });

    await sql`
      INSERT INTO library_entries (id, user_id, title, media_id, media_type)
      VALUES (
        'pull-create-existing',
        ${userId},
        'Existing Pull Create Game',
        'pull-create-existing-game-media',
        'game'
      )
    `;

    const executor = new PullCommandExecutor();
    const result = await executor.execute({
      ...params,
      action: "create",
      rows: [],
      userId,
      command: "pull:game:10",
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      title: "Pull Create Game",
      media_id: "pull-create-game-media",
      media_type: "game",
      status: null,
      tags: [expect.objectContaining({ value: "favorite", weight: "major" })],
    });

    const createdRows = await sql`
      SELECT *
      FROM library_entries
      WHERE user_id = ${userId}
      AND media_id IN ('pull-create-game-media', 'pull-create-existing-game-media')
      ORDER BY media_id ASC
    `;
    expect(createdRows).toHaveLength(2);
  });
});

describe("EnrichmentCommandExecutor", () => {
  it("accepts enrich commands", () => {
    const executor = new EnrichmentCommandExecutor();

    expect(executor.canExecute("enrich")).toBe(true);
    expect(executor.canExecute("enrich:add")).toBe(true);
    expect(executor.canExecute("enrich:override")).toBe(true);
    expect(executor.canExecute("enrich:add:anilist")).toBe(true);
    expect(executor.canExecute("enrich:override:anilist")).toBe(true);
    expect(executor.canExecute("enrich:add:openlibrary")).toBe(true);
    expect(executor.canExecute("enrich::anilist")).toBe(true);
  });

  it("accepts fuzzy enrich commands", () => {
    const executor = new EnrichmentCommandExecutor();

    expect(executor.canExecute("enr")).toBe(true);
    expect(executor.canExecute("enr:ovr:ani")).toBe(true);
    expect(executor.canExecute("en:add:openlib")).toBe(true);
    expect(executor.canExecute("enrich::tm")).toBe(true);
  });

  it("rejects unrelated or unsupported enrich commands", () => {
    const executor = new EnrichmentCommandExecutor();

    expect(executor.canExecute("foo")).toBe(false);
    expect(executor.canExecute("zzzz")).toBe(false);
    expect(executor.canExecute("enrich:unknown")).toBe(false);
    expect(executor.canExecute("enrich:anilist")).toBe(false);
    expect(executor.canExecute("enrich:full:anilist")).toBe(false);
    expect(executor.canExecute("enrich:add:unknown")).toBe(false);
  });

  it("routes search commands through extendResponse", async () => {
    const originalExtendResponse = EnrichmentService.prototype.extendResponse;
    const originalUpdateEntry = EnrichmentService.prototype.updateEntry;
    const extendResponse = mock(async ({ rows }) => [
      row({ ...rows[0], title: "Enriched Search" }),
    ]);
    const updateEntry = mock(async ({ rows }) => rows);
    EnrichmentService.prototype.extendResponse = extendResponse;
    EnrichmentService.prototype.updateEntry = updateEntry;

    try {
      const executor = new EnrichmentCommandExecutor();
      const result = await executor.execute({
        ...params,
        action: "search",
        command: "enr",
      });

      expect(result.rows[0]?.title).toBe("Enriched Search");
      expect(extendResponse).toHaveBeenCalledWith({
        command: { sourceType: undefined, mode: "add" },
        rows: params.rows,
        userId: params.userId,
      });
      expect(updateEntry).not.toHaveBeenCalled();
    } finally {
      EnrichmentService.prototype.extendResponse = originalExtendResponse;
      EnrichmentService.prototype.updateEntry = originalUpdateEntry;
    }
  });

  it("routes create and update commands through updateEntry", async () => {
    const originalExtendResponse = EnrichmentService.prototype.extendResponse;
    const originalUpdateEntry = EnrichmentService.prototype.updateEntry;
    const extendResponse = mock(async ({ rows }) => rows);
    const updateEntry = mock(async ({ rows }) => [
      row({ ...rows[0], title: "Saved Enrichment" }),
    ]);
    EnrichmentService.prototype.extendResponse = extendResponse;
    EnrichmentService.prototype.updateEntry = updateEntry;

    try {
      const executor = new EnrichmentCommandExecutor();
      const result = await executor.execute({
        ...params,
        command: "enr:ovr",
      });

      expect(result.rows[0]?.title).toBe("Saved Enrichment");
      expect(updateEntry).toHaveBeenCalledWith({
        command: { sourceType: undefined, mode: "override" },
        rows: params.rows,
        userId: params.userId,
      });
      expect(extendResponse).not.toHaveBeenCalled();
    } finally {
      EnrichmentService.prototype.extendResponse = originalExtendResponse;
      EnrichmentService.prototype.updateEntry = originalUpdateEntry;
    }
  });
});

describe("EnrichmentService", () => {
  it("leaves rows unchanged when no integration has data", async () => {
    const originalGetIntegration =
      SourceIntegrationRegistry.prototype.getIntegration;
    SourceIntegrationRegistry.prototype.getIntegration = mock(() => undefined);

    try {
      const service = new EnrichmentService();
      const result = await service.extendResponse({
        command: { sourceType: undefined, mode: "add" },
        rows: params.rows,
        userId: "user-1",
      });

      expect(result).toEqual(params.rows);
    } finally {
      SourceIntegrationRegistry.prototype.getIntegration =
        originalGetIntegration;
    }
  });

  it("leaves rows unchanged when user has no active source setting", async () => {
    const originalGetIntegration =
      SourceIntegrationRegistry.prototype.getIntegration;
    SourceIntegrationRegistry.prototype.getIntegration = mock(() =>
      fakeIntegration({
        title: "Enriched Attack",
        tags: [{ value: "action", weight: "major" }],
      })
    );

    try {
      const service = new EnrichmentService();
      const result = await service.extendResponse({
        command: { sourceType: "anilist", mode: "add" },
        rows: params.rows,
        userId: "user-1",
      });

      expect(result).toEqual(params.rows);
    } finally {
      SourceIntegrationRegistry.prototype.getIntegration =
        originalGetIntegration;
    }
  });

  it("has an OpenLibrary integration for book entries", () => {
    const registry = new SourceIntegrationRegistry();
    const integration = registry.getIntegration(
      row({ media_type: "book" }),
      "openlibrary"
    );

    expect(integration?.sourceType).toBe("openlibrary");
  });

  it("registry exposes exactly four provider instances", () => {
    const registry = new SourceIntegrationRegistry();

    expect(
      registry.getKnownIntegrations().map((item) => item.sourceType)
    ).toEqual(["anilist", "tmdb", "igdb", "openlibrary"]);
  });

  it("does not save create/update enrichment without a user id", async () => {
    const mappedData: EnrichedLibraryEntryData = {
      title: "Saved Attack",
      tags: [{ value: "classic", weight: "minor" }],
    };
    const originalGetIntegration =
      SourceIntegrationRegistry.prototype.getIntegration;
    SourceIntegrationRegistry.prototype.getIntegration = mock(() =>
      fakeIntegration(mappedData)
    );

    try {
      const service = new EnrichmentService();
      const result = await service.updateEntry({
        command: { sourceType: "anilist", mode: "override" },
        rows: params.rows,
        userId: null,
      });

      expect(result).toEqual(params.rows);
    } finally {
      SourceIntegrationRegistry.prototype.getIntegration =
        originalGetIntegration;
    }
  });

  it("adds search enrichment without replacing populated fields or tags", async () => {
    const service = new EnrichmentService();
    const getMappedData = mock(async () => ({
      title: "Enriched Attack",
      image_src: "https://example.test/poster.jpg",
      public_rating: 9,
      tags: [
        { value: "action", weight: "major" as const },
        { value: "classic", weight: "minor" as const },
      ],
    }));
    (
      service as unknown as {
        getMappedData: typeof getMappedData;
      }
    ).getMappedData = getMappedData;

    const result = await service.extendResponse({
      command: { sourceType: undefined, mode: "add" },
      rows: [
        row({
          title: "Existing Attack",
          image_src: null,
          public_rating: 8,
          tags: [{ id: "tag-1", value: "action", weight: "major" as const }],
        }),
      ],
      userId: "user-1",
    });

    expect(result[0]?.title).toBe("Existing Attack");
    expect(result[0]?.image_src).toBe("https://example.test/poster.jpg");
    expect(result[0]?.public_rating).toBe(8);
    expect(result[0]?.tags.map((tag) => tag.value)).toEqual([
      "action",
      "classic",
    ]);
  });

  it("overrides search enrichment fields and tags when requested", async () => {
    const service = new EnrichmentService();
    const getMappedData = mock(async () => ({
      title: "Enriched Attack",
      tags: [{ value: "classic", weight: "minor" as const }],
    }));
    (
      service as unknown as {
        getMappedData: typeof getMappedData;
      }
    ).getMappedData = getMappedData;

    const result = await service.extendResponse({
      command: { sourceType: undefined, mode: "override" },
      rows: [
        row({
          title: "Existing Attack",
          tags: [{ id: "tag-1", value: "action", weight: "major" as const }],
        }),
      ],
      userId: "user-1",
    });

    expect(result[0]?.title).toBe("Enriched Attack");
    expect(result[0]?.tags.map((tag) => tag.value)).toEqual(["classic"]);
  });
});

function fakeIntegration(
  mappedData: EnrichedLibraryEntryData
): SourceIntegration<{ ok: true }> {
  return {
    sourceType: "anilist",
    configSchema: z.record(z.string(), z.unknown()),
    supportsEntry: () => true,
    getEnrichmentData: async () => ({ ok: true }),
    mapToLibraryEntry: () => mappedData,
  };
}
