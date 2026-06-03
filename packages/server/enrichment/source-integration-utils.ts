import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import { logger } from "../logger";
import type { EnrichedLibraryEntryData, EnrichmentSourceType } from "./types";

export function dedupeEnrichedTags(
  tags: NonNullable<EnrichedLibraryEntryData["tags"]>
): NonNullable<EnrichedLibraryEntryData["tags"]> {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = `${tag.weight}:${tag.value.trim().toLowerCase()}`;
    if (!tag.value.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function logSourceCallSkipped(
  sourceType: EnrichmentSourceType,
  row: LibraryEntryWithTags,
  reason: string
) {
  logger.info(
    {
      sourceType,
      rowId: row.id,
      title: row.title,
      mediaType: row.media_type,
      reason,
    },
    "Source integration call skipped"
  );
}
