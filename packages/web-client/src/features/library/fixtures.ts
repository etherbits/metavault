import BatmanPoster from "@/assets/download.jpeg"; // TODO: move testing to /tests
import {
  LibraryEntryRowsSchema,
  type LibraryEntryWithTags,
} from "@/features/library/contracts";

const sampleServerRows: LibraryEntryWithTags[] = [
  makeEntry("1", "Attack on Titan", "anime", "finished", "2023-11-04", 9.5, [
    "action",
    "drama",
    "fantasy",
  ]),
  makeEntry("2", "The Last of Us", "game", "finished", "2023-06-12", 10, [
    "survival",
    "story",
  ]),
  makeEntry("3", "Dune", "movie", "finished", "2024-03-01", 8.8, [
    "sci-fi",
    "epic",
  ]),
  makeEntry("4", "Chainsaw Man", "manga", "in_progress", "2024-01-10", 9, [
    "action",
    "horror",
  ]),
  makeEntry("5", "Breaking Bad", "tv_show", "finished", "2022-09-30", 10, [
    "crime",
    "drama",
  ]),
  makeEntry("6", "Elden Ring", "game", "on_hold", "2024-02-14", 9.2, [
    "rpg",
    "souls-like",
  ]),
];

export const mockLibraryRows = LibraryEntryRowsSchema.parse(
  Array.from({ length: 18 }, (_, index) => {
    const source = sampleServerRows[index % sampleServerRows.length];
    return {
      ...source,
      id: `query-${index + 1}`,
      image_src: BatmanPoster,
      title: source.title,
      tags: source.tags.map((tag) => ({
        ...tag,
        id: `${source.id}-${index}-${tag.value}`,
      })),
    };
  })
);

function makeEntry(
  id: string,
  title: string,
  mediaType: LibraryEntryWithTags["media_type"],
  status: LibraryEntryWithTags["status"],
  releasedAt: string,
  rating: number,
  tags: string[]
): LibraryEntryWithTags {
  return {
    id,
    title,
    user_id: "mock-user",
    media_id: null,
    source_id: null,
    image_src: null,
    media_type: mediaType,
    status,
    adult: false,
    public_rating: rating,
    personal_rating: null,
    released_at: releasedAt,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    tags: tags.map((value, index) => ({
      id: `${id}-tag-${index + 1}`,
      value,
      weight: "major",
    })),
  };
}
