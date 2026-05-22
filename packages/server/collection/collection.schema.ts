import { z } from "zod";

const collectionEntrySchema = z.object({
  library_entry_id: z.string().min(1),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1),
  entries: z.array(collectionEntrySchema).optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).optional(),
  entries: z.array(collectionEntrySchema).optional(),
});

export const collectionIdSchema = z.object({
  id: z.string().min(1),
});

export const removeCollectionEntriesSchema = z.object({
  library_entry_ids: z.array(z.string().min(1)).min(1),
});

export const collectionEntryResponseSchema = z.object({
  id: z.string(),
  collection_id: z.string(),
  library_entry_id: z.string(),
});

export const collectionResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const collectionWithEntriesResponseSchema =
  collectionResponseSchema.extend({
    entries: z.string(),
  });

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type RemoveCollectionEntriesInput = z.infer<
  typeof removeCollectionEntriesSchema
>;
export type CollectionWithEntriesResponse = z.infer<
  typeof collectionWithEntriesResponseSchema
>;
