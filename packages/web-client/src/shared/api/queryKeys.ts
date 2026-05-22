export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
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
} as const;
