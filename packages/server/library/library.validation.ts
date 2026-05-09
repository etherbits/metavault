import { z } from "zod";

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().min(0).max(10).optional());

const baseLibraryEntrySchema = z.object({
  title: z.string().min(1).optional(),

  media_id: z.string().optional(),
  source_id: z.string().optional(),

  media_type: z
    .enum(["movie", "tv", "anime", "manga", "game", "book"])
    .optional(),

  status: z
    .enum(["planning", "in_progress", "completed", "dropped", "paused"])
    .optional(),

  public_rating: optionalNumber,
  personal_rating: optionalNumber,
});

export const createLibraryEntrySchema = baseLibraryEntrySchema;
export const updateLibraryEntrySchema = baseLibraryEntrySchema;

export const libraryIdSchema = z.object({
  id: z.string().min(1),
});
