import { describe, expect, it, mock } from "bun:test";
import { z } from "zod";
import { CommandDelegator } from "../../packages/server/commands/command-delegator";
import type {
  CommandExecutionParams,
  CommandExecutor,
} from "../../packages/server/commands/command-executor";
import { EnrichmentCommandExecutor } from "../../packages/server/enrichment/enrichment-command-executor";
import { EnrichmentService } from "../../packages/server/enrichment/enrichment.service";
import { SourceIntegrationRegistry } from "../../packages/server/enrichment/source-integration-registry";
import type {
  EnrichedLibraryEntryData,
  SourceIntegration,
} from "../../packages/server/enrichment/types";

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

const params: Omit<CommandExecutionParams, "command"> = {
  action: "update",
  userId: "user-1",
  rows: [row()],
};

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

  it("rejects unrelated or unsupported enrich commands", () => {
    const executor = new EnrichmentCommandExecutor();

    expect(executor.canExecute("foo")).toBe(false);
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
        command: "enrich",
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
        command: "enrich:override",
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
        command: { mode: "add" },
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
      command: { mode: "add" },
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
      command: { mode: "override" },
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
