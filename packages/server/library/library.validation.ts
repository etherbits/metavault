import { z } from "zod";

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

  public_rating: z.number().min(0).max(10).optional(),
  personal_rating: z.number().min(0).max(10).optional(),
});

export const createLibraryEntrySchema = baseLibraryEntrySchema;
export const updateLibraryEntrySchema = baseLibraryEntrySchema;

export const libraryIdSchema = z.object({
  id: z.string().min(1),
});
