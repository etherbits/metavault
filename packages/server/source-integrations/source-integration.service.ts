import { sourceIntegrationRegistry } from "../enrichment/source-integration-registry";
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
          config: row ? this.parseConfig(integration.sourceType, row) : {},
          config_fields: integration.configFields,
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

    const parsedConfig = this.parseConfigInput(
      configSchema,
      body.config,
      body.is_active
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
      config: this.parseConfig(integrationType, row),
      config_fields:
        sourceIntegrationRegistry.getKnownIntegration(integrationType)
          ?.configFields ?? [],
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
    rawConfig: Record<string, unknown>,
    isActive: boolean
  ) {
    const parsed = this.schemaForActiveState(configSchema, isActive).safeParse(
      rawConfig
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

  private parseRawConfig(configJson: string | null) {
    if (!configJson) return {};

    try {
      const parsed = JSON.parse(configJson) as unknown;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
}

export const sourceIntegrationService = new SourceIntegrationService();
