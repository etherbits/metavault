import { z } from "zod";

export const openLibraryDocSchema = z.object({
  key: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  cover_i: z.number().nullable().optional(),
  first_publish_year: z.number().nullable().optional(),
  ratings_average: z.number().nullable().optional(),
  subject: z.array(z.string()).nullable().optional(),
});

// OpenLibrary search result fields used for mapping:
// https://openlibrary.org/dev/docs/api/search
export const openLibrarySearchResponseSchema = z.object({
  docs: z.array(openLibraryDocSchema).optional(),
});

export type OpenLibraryDoc = z.infer<typeof openLibraryDocSchema>;

export type OpenLibraryDocWithContext = {
  doc: OpenLibraryDoc;
  sourceIntegrationId?: string;
};
