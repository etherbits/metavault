import type { z } from "zod";
import {
  aliasMappingSchema,
  aliasMappingsSchema,
  upsertAliasMappingSchema,
} from "../../../../server/aliases/alias.schema";

export { aliasMappingSchema, aliasMappingsSchema, upsertAliasMappingSchema };

export type AliasMapping = z.infer<typeof aliasMappingSchema>;
export type UpsertAliasMappingInput = z.infer<typeof upsertAliasMappingSchema>;
