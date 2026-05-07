import { z } from "zod";

const collectionEntryIdSchema = z.object({
  library_entry_id: z.string().min(1),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1),
  entries: z.array(collectionEntryIdSchema).optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).optional(),
  entries: z.array(collectionEntryIdSchema).optional(),
});

export const collectionIdSchema = z.object({
  id: z.string().min(1),
});

export const removeCollectionEntriesSchema = z.object({
  library_entry_ids: z.array(z.string().min(1)).min(1),
});
