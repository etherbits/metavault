import { sourceIntegrationRegistry } from "../enrichment/source-integration-registry";
import type { SourceIntegrationConfigFieldMetadata } from "../enrichment/types";
import { err, ok, type Result } from "../utils/result";
import {
  type SourceIntegrationRow,
  sourceIntegrationModel,
} from "./source-integration.model";
import type {
  SourceIntegrationSettings,
  SourceIntegrationType,
  UpdateSourceIntegrationInput,
} from "./source-integration.schema";

const SAVED_SECRET_PLACEHOLDER = "Saved - leave blank to keep existing value";

class SourceIntegrationService {
  async getSettings(
    userId: string
  ): Promise<Result<SourceIntegrationSettings[]>> {
    const rows = await sourceIntegrationModel.getByUser(userId);
    const rowsByType = new Map(rows.map((row) => [row.integration_type, row]));

    return ok(
      sourceIntegrationRegistry.getKnownIntegrations().map((integration) => {
        const row = rowsByType.get(integration.sourceType);
        return {
          integration_type: integration.sourceType,
          is_active: row?.is_active === 1,
          config: row ? this.maskConfig(integration.sourceType, row) : {},
          config_fields: this.configFieldsForClient(
            integration.configFields,
            row ? this.parseConfig(integration.sourceType, row) : {}
          ),
        };
      })
    );
  }

  async updateSettings({
    userId,
    integrationType,
    body,
  }: {
    userId: string;
    integrationType: SourceIntegrationType;
    body: UpdateSourceIntegrationInput;
  }): Promise<Result<SourceIntegrationSettings>> {
    const configSchema =
      sourceIntegrationRegistry.getConfigSchema(integrationType);
    if (!configSchema) {
      return err(404, "Source integration not found");
    }

    const existingRow = await sourceIntegrationModel.getByUserAndType(
      userId,
      integrationType
    );
    const parsedConfig = this.parseConfigInput(
      configSchema,
      sourceIntegrationRegistry.getKnownIntegration(integrationType)
        ?.configFields ?? [],
      body.config,
      body.is_active,
      existingRow
    );
    if (!parsedConfig) {
      return err(400, "Invalid source integration config");
    }

    const row = await sourceIntegrationModel.upsert({
      userId,
      integrationType,
      isActive: body.is_active,
      config: parsedConfig,
    });

    return ok({
      integration_type: integrationType,
      is_active: row.is_active === 1,
      config: this.maskConfig(integrationType, row),
      config_fields: this.configFieldsForClient(
        sourceIntegrationRegistry.getKnownIntegration(integrationType)
          ?.configFields ?? [],
        this.parseConfig(integrationType, row)
      ),
    });
  }

  private parseConfig(
    integrationType: SourceIntegrationType,
    row: SourceIntegrationRow
  ) {
    const configSchema =
      sourceIntegrationRegistry.getConfigSchema(integrationType);
    if (!configSchema) return {};

    const parsed = this.schemaForActiveState(
      configSchema,
      row.is_active === 1
    ).safeParse(this.parseRawConfig(row.config_json));

    return parsed.success ? parsed.data : {};
  }

  private parseConfigInput(
    configSchema: NonNullable<
      ReturnType<typeof sourceIntegrationRegistry.getConfigSchema>
    >,
    configFields: SourceIntegrationConfigFieldMetadata[],
    rawConfig: Record<string, unknown>,
    isActive: boolean,
    existingRow: SourceIntegrationRow | null
  ) {
    const config = this.mergeExistingSecrets({
      configFields,
      rawConfig,
      existingConfig: this.parseRawConfig(existingRow?.config_json ?? null),
      shouldKeepExistingSecrets: isActive || Object.keys(rawConfig).length > 0,
    });
    const parsed = this.schemaForActiveState(configSchema, isActive).safeParse(
      config
    );

    return parsed.success ? parsed.data : null;
  }

  private schemaForActiveState(
    configSchema: NonNullable<
      ReturnType<typeof sourceIntegrationRegistry.getConfigSchema>
    >,
    isActive: boolean
  ) {
    return isActive ? configSchema : configSchema.partial();
  }

  private parseRawConfig(configJson: string | null): Record<string, unknown> {
    if (!configJson) return {};

    try {
      const parsed = JSON.parse(configJson) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private mergeExistingSecrets({
    configFields,
    rawConfig,
    existingConfig,
    shouldKeepExistingSecrets,
  }: {
    configFields: SourceIntegrationConfigFieldMetadata[];
    rawConfig: Record<string, unknown>;
    existingConfig: Record<string, unknown>;
    shouldKeepExistingSecrets: boolean;
  }) {
    if (!shouldKeepExistingSecrets) {
      return rawConfig;
    }

    const merged = { ...rawConfig };
    for (const field of configFields) {
      if (!field.secret) continue;

      const nextValue = merged[field.key];
      const existingValue = existingConfig[field.key];
      if (
        (nextValue === undefined ||
          (typeof nextValue === "string" && nextValue.trim() === "")) &&
        typeof existingValue === "string" &&
        existingValue.trim().length > 0
      ) {
        merged[field.key] = existingValue;
      }
    }

    return merged;
  }

  private maskConfig(
    integrationType: SourceIntegrationType,
    row: SourceIntegrationRow
  ) {
    const config = this.parseConfig(integrationType, row);
    const fields =
      sourceIntegrationRegistry.getKnownIntegration(integrationType)
        ?.configFields ?? [];

    return this.maskSecretFields(config, fields);
  }

  private maskSecretFields(
    config: Record<string, unknown>,
    configFields: SourceIntegrationConfigFieldMetadata[]
  ) {
    const masked = { ...config };
    for (const field of configFields) {
      if (field.secret && typeof masked[field.key] === "string") {
        masked[field.key] = "";
      }
    }

    return masked;
  }

  private configFieldsForClient(
    configFields: SourceIntegrationConfigFieldMetadata[],
    config: Record<string, unknown>
  ) {
    return configFields.map((field) => {
      const value = config[field.key];
      if (
        !field.secret ||
        typeof value !== "string" ||
        value.trim().length === 0
      ) {
        return field;
      }

      return {
        ...field,
        placeholder: field.placeholder ?? SAVED_SECRET_PLACEHOLDER,
      };
    });
  }
}

export const sourceIntegrationService = new SourceIntegrationService();
