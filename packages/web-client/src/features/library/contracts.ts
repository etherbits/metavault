import {
  ezqQuerySchema,
  LibraryEntryRowsSchema,
  LibraryEntryWithTagsSchema,
  type LibraryEntryWithTags,
} from "../../../../server/ezq/ezq.schema";
import { z } from "zod";

export { ezqQuerySchema, LibraryEntryRowsSchema, LibraryEntryWithTagsSchema };
export type { LibraryEntryWithTags };

export const ezqResponseSchema = z.object({
  rows: LibraryEntryRowsSchema,
  query: z.string().optional(),
  duration_ms: z.number().optional(),
});

export type EzqResponse = z.infer<typeof ezqResponseSchema>;

export function parseEzqResponse(raw: unknown): EzqResponse {
  return ezqResponseSchema.parse(raw);
}
