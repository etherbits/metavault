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

    const config = configSchema.parse(body.config);
    const row = await sourceIntegrationModel.upsert({
      userId,
      integrationType,
      isActive: body.is_active,
      config,
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

    const raw = row.config_json ? (JSON.parse(row.config_json) as unknown) : {};
    return configSchema.parse(raw);
  }
}

export const sourceIntegrationService = new SourceIntegrationService();
