import type { ZodType, z } from "zod";
import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import type { LibraryTagWeight } from "../library/library.model";
import type { EnrichmentCommandSchema } from "./enrichment-command.schema";

export type EnrichmentCommand = EnrichmentCommandSchema;
export type EnrichmentSourceType = NonNullable<EnrichmentCommand["sourceType"]>;
export type EnrichmentMode = EnrichmentCommand["mode"];
export type SourceIntegrationConfig = Record<string, unknown>;

export type SourceIntegrationConfigField = {
  label: string;
  schema: ZodType;
  secret: boolean;
  required: boolean;
  defaultValue?: string;
  placeholder?: string;
};

export type SourceIntegrationConfigFieldMetadata = Omit<
  SourceIntegrationConfigField,
  "schema"
> & {
  key: string;
};

export type EnrichedLibraryTagData = {
  value: string;
  weight: LibraryTagWeight;
};

export type EnrichedLibraryEntryData = {
  title?: string;
  media_id?: string | null;
  source_id?: string | null;
  media_type?: LibraryEntryWithTags["media_type"];
  adult?: boolean;
  image_src?: string | null;
  public_rating?: number | null;
  released_at?: string | null;
  tags?: EnrichedLibraryTagData[];
};

export type SourceIntegrationContext = {
  command: EnrichmentCommand;
  userId: string | null;
  config: SourceIntegrationConfig;
  sourceIntegrationId?: string;
};

export interface SourceIntegration<SourceData = unknown> {
  sourceType: EnrichmentSourceType;
  configSchema: z.ZodObject<Record<string, z.ZodType>>;
  configFields: SourceIntegrationConfigFieldMetadata[];
  supportsEntry(row: LibraryEntryWithTags): boolean;
  getEnrichmentData(
    row: LibraryEntryWithTags,
    context: SourceIntegrationContext
  ): Promise<SourceData | null>;
  mapToLibraryEntry(
    data: SourceData,
    row: LibraryEntryWithTags
  ): EnrichedLibraryEntryData | null;
}
