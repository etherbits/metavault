import z from "zod";

const sourceTypeSchema = z.enum(["anilist", "tmdb", "igdb", "openlibrary"]);
const modeSchema = z.enum(["add", "override"]);

function skippable<Schema extends z.ZodType>(schema: Schema) {
  return z
    .union([schema, z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value));
}

export const enrichCommandSchema = z
  .tuple([
    z.literal("enrich"),
    skippable(modeSchema),
    skippable(sourceTypeSchema),
  ])
  .transform(([, mode, sourceType]) => ({
    sourceType,
    mode: mode ?? "add",
  }));

export const enrichmentCommandSchema = z.union([enrichCommandSchema]);

export type EnrichmentCommandSchema = z.infer<typeof enrichCommandSchema>;
