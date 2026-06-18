import { apiRequest } from "@/shared/api/client";
import {
  aliasMappingSchema,
  aliasMappingsSchema,
  type UpsertAliasMappingInput,
} from "./contracts";

const deleteAliasMappingResponseSchema = aliasMappingSchema.pick({
  alias: true,
});

export function fetchAliasMappings() {
  return apiRequest("/aliases", aliasMappingsSchema);
}

export function upsertAliasMapping(input: UpsertAliasMappingInput) {
  return apiRequest(`/aliases/${input.alias}`, aliasMappingSchema, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteAliasMapping(alias: string) {
  return apiRequest(`/aliases/${alias}`, deleteAliasMappingResponseSchema, {
    method: "DELETE",
  });
}
