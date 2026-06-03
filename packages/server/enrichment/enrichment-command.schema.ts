import z from "zod";

const sourceTypeSchema = z.enum(["anilist", "tmdb", "igdb", "openlibrary"]);

export const enrichCommandSchema = z
  .tuple([
    z.literal("enrich"),
    z.enum(["add", "override"]).default("add"),
    sourceTypeSchema.optional(),
  ])
  .transform(([, mode, sourceType]) => ({
    sourceType,
    mode,
  }));

export const enrichmentCommandSchemas = [enrichCommandSchema] as const;

export type EnrichmentCommandSchema = z.infer<typeof enrichCommandSchema>;
