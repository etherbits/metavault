import { z } from "zod";
import type {
  SourceIntegrationConfigField,
  SourceIntegrationConfigFieldMetadata,
} from "../types";

type SourceIntegrationConfigDefinition = Record<
  string,
  SourceIntegrationConfigField
>;

export const requiredString = z.string().trim().min(1).max(256);
export const optionalString = z
  .string()
  .trim()
  .max(256)
  .transform((value) => value || undefined)
  .optional();

export function defineConfig(definition: SourceIntegrationConfigDefinition): {
  schema: z.ZodObject<Record<string, z.ZodType>>;
  fields: SourceIntegrationConfigFieldMetadata[];
} {
  return {
    schema: z
      .object(
        Object.fromEntries(
          Object.entries(definition).map(([key, field]) => [key, field.schema])
        )
      )
      .catchall(z.unknown()),
    fields: Object.entries(definition).map(([key, field]) => {
      const { schema: _schema, ...metadata } = field;
      return {
        key,
        ...metadata,
      };
    }),
  };
}
