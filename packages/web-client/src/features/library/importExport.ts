import { z } from "zod";
import { LibraryEntryRowsSchema } from "@/features/library/contracts";
import {
  isMediaStatus,
  isMediaType,
  mapMediaItemToServerEntry,
  mapServerEntriesToMediaItems,
} from "@/features/library/mappers";
import type { MediaItem } from "@/features/library/types";
import { TagsColumnSchema } from "../../../../server/ezq/ezq.schema";

const LegacyMediaItemSchema = z.object({
  title: z.string(),
  type: z.string().optional(),
  status: z.string().optional(),
  date: z.string().optional(),
  rating: z.string().optional(),
  tags: TagsColumnSchema,
  posterUrl: z.string().optional(),
});

const LegacyImportSchema = z.array(LegacyMediaItemSchema);

export function normalizeImportedItems(raw: unknown): Omit<MediaItem, "id">[] {
  const serverRows = LibraryEntryRowsSchema.safeParse(raw);
  if (serverRows.success) {
    return mapServerEntriesToMediaItems(serverRows.data).map(
      ({ id, ...item }) => item
    );
  }

  const legacyItems = LegacyImportSchema.parse(raw);
  const normalized: Omit<MediaItem, "id">[] = [];

  for (const entry of legacyItems) {
    const title = entry.title.trim();
    if (!title) continue;

    normalized.push({
      title,
      type: entry.type && isMediaType(entry.type) ? entry.type : "Other",
      status:
        entry.status && isMediaStatus(entry.status) ? entry.status : undefined,
      adult: false,
      releasedAt: entry.date ?? "-",
      rating: entry.rating ?? "-",
      personalRating: null,
      tags: entry.tags ?? [],
      posterUrl: entry.posterUrl,
    });
  }

  return normalized;
}

export function toServerExportPayload(items: MediaItem[]) {
  return LibraryEntryRowsSchema.parse(
    items.map((item) => mapMediaItemToServerEntry(item))
  );
}
