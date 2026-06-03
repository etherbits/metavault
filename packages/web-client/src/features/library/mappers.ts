import type { LibraryEntryWithTags } from "@/features/library/contracts";
import type {
  MediaItem,
  MediaStatus,
  MediaType,
  ServerEntryStatus,
  ServerMediaType,
} from "@/features/library/types";

const serverToUiType: Record<ServerMediaType, MediaType> = {
  movie: "Movie",
  tv_show: "TV Show",
  anime: "Anime",
  game: "Game",
  book: "Book",
  manga: "Manga",
  other: "Other",
};

const uiToServerType: Record<MediaType, ServerMediaType> = {
  Movie: "movie",
  "TV Show": "tv_show",
  Anime: "anime",
  Game: "game",
  Book: "book",
  Manga: "manga",
  Other: "other",
};

const serverToUiStatus: Record<ServerEntryStatus, MediaStatus> = {
  in_progress: "In Progress",
  dropped: "Dropped",
  planning: "Planning",
  on_hold: "On Hold",
  finished: "Finished",
};

const uiToServerStatus: Record<MediaStatus, ServerEntryStatus> = {
  "In Progress": "in_progress",
  Dropped: "dropped",
  Planning: "planning",
  "On Hold": "on_hold",
  Finished: "finished",
};

export function mapServerEntryToMediaItem(
  entry: LibraryEntryWithTags
): MediaItem {
  const rating =
    typeof entry.public_rating === "number"
      ? `${Number.isInteger(entry.public_rating) ? entry.public_rating.toFixed(0) : entry.public_rating.toFixed(1)} / 10`
      : "-";

  const releasedAt = entry.released_at?.slice(0, 10) || "-";

  return {
    id: entry.id,
    title: entry.title,
    type: entry.media_type ? serverToUiType[entry.media_type] : "Other",
    status: entry.status ? serverToUiStatus[entry.status] : undefined,
    adult: entry.adult,
    releasedAt,
    rating,
    tags: entry.tags,
    posterUrl: entry.image_src ?? undefined,
  };
}

export function mapMediaItemToServerEntry(
  item: MediaItem,
  userId = "mock-user"
): LibraryEntryWithTags {
  const numericRating = Number.parseFloat(item.rating.split("/")[0].trim());

  return {
    id: item.id,
    title: item.title,
    user_id: userId,
    media_id: null,
    source_id: null,
    image_src: item.posterUrl ?? null,
    media_type: uiToServerType[item.type],
    status: item.status ? uiToServerStatus[item.status] : null,
    adult: item.adult,
    public_rating: Number.isFinite(numericRating) ? numericRating : null,
    personal_rating: null,
    released_at: item.releasedAt === "-" ? null : item.releasedAt,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: item.tags,
  };
}

export function mapServerEntriesToMediaItems(entries: LibraryEntryWithTags[]) {
  return entries.map(mapServerEntryToMediaItem);
}

export function toServerMediaType(type: MediaType): ServerMediaType {
  return uiToServerType[type];
}

export function toServerStatus(status: MediaStatus): ServerEntryStatus {
  return uiToServerStatus[status];
}

export function isMediaStatus(value: string): value is MediaStatus {
  return Object.values(uiToServerStatus).some(
    (serverStatus) => serverToUiStatus[serverStatus] === value
  );
}

export function isMediaType(value: string): value is MediaType {
  return Object.values(uiToServerType).some(
    (serverType) => serverToUiType[serverType] === value
  );
}
