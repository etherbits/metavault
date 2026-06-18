export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  contentNodes: {
    all: ["content-nodes"] as const,
    byLibraryEntry: (libraryEntryId: string) =>
      ["content-nodes", "library-entry", libraryEntryId] as const,
  },
  library: {
    all: ["library"] as const,
    entries: () => ["library", "entries"] as const,
    entry: (id: string) => ["library", "entry", id] as const,
    ezq: (query: string) => ["library", "ezq", query] as const,
  },
  collections: {
    all: ["collections"] as const,
  },
  sourceIntegrations: {
    all: ["source-integrations"] as const,
  },
  aiIntegrations: {
    all: ["ai-integrations"] as const,
  },
  aliases: {
    all: ["aliases"] as const,
  },
  assistant: {
    sessions: ["assistant", "sessions"] as const,
  },
} as const;
