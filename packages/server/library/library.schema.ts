import { z } from "zod";

const optionalRatingSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().min(0).max(10).optional()
);

const libraryEntryFieldsSchema = z.object({
  title: z.string().min(1),

  media_id: z.string().optional(),
  source_id: z.string().optional(),

  media_type: z
    .enum(["movie", "tv_show", "anime", "game", "book", "manga", "other"])
    .optional(),

  status: z
    .enum(["in_progress", "dropped", "planning", "on_hold", "finished"])
    .optional(),

  released_at: z.string().optional(),

  public_rating: optionalRatingSchema,
  personal_rating: optionalRatingSchema,
});

export const createLibraryEntrySchema = libraryEntryFieldsSchema;
export const updateLibraryEntrySchema = libraryEntryFieldsSchema
  .partial()
  .extend({
    status: libraryEntryFieldsSchema.shape.status.nullable(),
  });

export const libraryIdSchema = z.object({
  id: z.string().min(1),
});

const exportIdsSchema = z.preprocess((value) => {
  if (value === "" || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const ids = value.filter(
      (id) => typeof id !== "string" || id.trim() !== ""
    );
    return ids.length > 0 ? ids : undefined;
  }

  return value;
}, z.union([z.string().min(1), z.array(z.string().min(1))]).optional());

export const exportLibraryEntriesSchema = z.object({
  ids: exportIdsSchema,
});

export type CreateLibraryEntryInput = z.infer<typeof createLibraryEntrySchema>;
export type UpdateLibraryEntryInput = z.infer<typeof updateLibraryEntrySchema>;
export type LibraryIdParams = z.infer<typeof libraryIdSchema>;
export type ExportLibraryEntriesInput = z.infer<
  typeof exportLibraryEntriesSchema
>;
