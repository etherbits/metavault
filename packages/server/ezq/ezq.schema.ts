import z from "zod";
import { LibraryEntrySchema } from "../db/schema/libraryEntries";
import { EmbeddedTagSchema } from "../db/schema/tags";

export const ezqQuerySchema = z.object({
  query: z.string().transform((query) => (query.trim() === "" ? "/s" : query)),
});

export const TagsColumnSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}, z.array(EmbeddedTagSchema));

export const LibraryEntryWithTagsSchema = LibraryEntrySchema.extend({
  tags: TagsColumnSchema,
});
export type LibraryEntryWithTags = z.infer<typeof LibraryEntryWithTagsSchema>;

export const LibraryEntryRowsSchema = z.array(LibraryEntryWithTagsSchema);
