import type {
  EntryMediaType,
  EntryStatus,
} from "../../../../server/db/schema/libraryEntries";

export type MediaType =
  | "Movie"
  | "TV Show"
  | "Anime"
  | "Game"
  | "Book"
  | "Manga"
  | "Other";

export type MediaStatus =
  | "On Hold"
  | "In Progress"
  | "Planning"
  | "Dropped"
  | "Finished";

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status?: MediaStatus;
  releasedAt: string;
  rating: string;
  tags: string[];
  posterUrl?: string;
}

export type ServerMediaType = EntryMediaType;
export type ServerEntryStatus = EntryStatus;
