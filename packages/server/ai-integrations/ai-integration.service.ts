import { err, ok, type Result } from "../utils/result";
import {
  type AiIntegrationRow,
  aiIntegrationModel,
} from "./ai-integration.model";
import {
  type AiIntegrationProfile,
  type AiIntegrationSettings,
  type AiIntegrationType,
  type CreateAiIntegrationProfileInput,
  type OpenAiCompatibleConfig,
  type UpdateAiIntegrationProfileInput,
  type UpdateAiIntegrationInput,
  openAiCompatibleDraftConfigSchema,
  openAiCompatibleConfigSchema,
} from "./ai-integration.schema";

const OPENAI_COMPATIBLE_FIELDS = [
  {
    key: "baseUrl",
    label: "Base URL",
    secret: false,
    required: true,
    defaultValue: "https://api.openai.com/v1",
    placeholder: "https://api.openai.com/v1",
  },
  {
    key: "apiKey",
    label: "API Key",
    secret: true,
    required: true,
    placeholder: "Enter API key",
  },
  {
    key: "model",
    label: "Model",
    secret: false,
    required: true,
    placeholder: "gpt-4o-mini",
  },
] satisfies AiIntegrationSettings["config_fields"];

const AI_INTEGRATIONS = [
  {
    integration_type: "openai_compatible" as const,
    config_fields: OPENAI_COMPATIBLE_FIELDS,
  },
];

class AiIntegrationService {
  async getProfiles(userId: string): Promise<
    Result<{
      config_fields: typeof OPENAI_COMPATIBLE_FIELDS;
      integrations: AiIntegrationProfile[];
    }>
  > {
    const rows = await aiIntegrationModel.getByUser(userId);

    return ok({
      config_fields: OPENAI_COMPATIBLE_FIELDS,
      integrations: rows.map((row) => this.toProfile(row)),
    });
  }

  async createProfile({
    userId,
    body,
  }: {
    userId: string;
    body: CreateAiIntegrationProfileInput;
  }): Promise<Result<AiIntegrationProfile>> {
    const row = await aiIntegrationModel.create({
      userId,
      name: body.name,
      integrationType: body.integration_type,
      config: body.config,
    });

    return ok(this.toProfile(row));
  }

  async updateProfile({
    userId,
    id,
    body,
  }: {
    userId: string;
    id: string;
    body: UpdateAiIntegrationProfileInput;
  }): Promise<Result<AiIntegrationProfile>> {
    const row = await aiIntegrationModel.update({
      userId,
      id,
      name: body.name,
      config: body.config,
    });

    if (!row) {
      return err(404, "AI integration not found");
    }

    return ok(this.toProfile(row));
  }

  async setActiveProfile({
    userId,
    id,
  }: {
    userId: string;
    id: string;
  }): Promise<Result<AiIntegrationProfile>> {
    const existing = await aiIntegrationModel.getById(userId, id);
    if (!existing) {
      return err(404, "AI integration not found");
    }

    const parsed = openAiCompatibleConfigSchema.safeParse(
      this.parseRawConfig(existing.config_json)
    );
    if (!parsed.success) {
      return err(400, "Complete the AI integration config before selecting it");
    }

    const row = await aiIntegrationModel.setActive(userId, id);
    if (!row) {
      return err(404, "AI integration not found");
    }

    return ok(this.toProfile(row));
  }

  async deleteProfile({
    userId,
    id,
  }: {
    userId: string;
    id: string;
  }): Promise<Result<{ id: string }>> {
    const deleted = await aiIntegrationModel.delete(userId, id);
    if (!deleted) {
      return err(404, "AI integration not found");
    }

    return ok({ id });
  }

  async getSettings(userId: string): Promise<Result<AiIntegrationSettings[]>> {
    const rows = await aiIntegrationModel.getByUser(userId);
    const rowsByType = new Map(rows.map((row) => [row.integration_type, row]));

    return ok(
      AI_INTEGRATIONS.map((integration) => {
        const row = rowsByType.get(integration.integration_type);
        if (!row || row.is_active !== 1) {
          return {
            integration_type: integration.integration_type,
            is_active: false,
            config: undefined,
            config_fields: integration.config_fields,
          };
        }

        return {
          integration_type: integration.integration_type,
          is_active: true,
          config: this.parseConfig(row),
          config_fields: integration.config_fields,
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
    integrationType: AiIntegrationType;
    body: UpdateAiIntegrationInput;
  }): Promise<Result<AiIntegrationSettings>> {
    const integration = this.getKnownIntegration(integrationType);
    if (!integration) {
      return err(404, "AI integration not found");
    }

    const row = await aiIntegrationModel.upsert({
      userId,
      integrationType,
      isActive: body.is_active,
      config: body.is_active ? body.config : {},
    });

    if (row.is_active !== 1) {
      return ok({
        integration_type: integrationType,
        is_active: false,
        config: undefined,
        config_fields: integration.config_fields,
      });
    }

    return ok({
      integration_type: integrationType,
      is_active: true,
      config: this.parseConfig(row),
      config_fields: integration.config_fields,
    });
  }

  async getActiveOpenAiCompatibleConfig(
    userId: string
  ): Promise<Result<OpenAiCompatibleConfig>> {
    const row = await aiIntegrationModel.getByUserAndType(
      userId,
      "openai_compatible"
    );

    if (!row || row.is_active !== 1) {
      return err(400, "OpenAI-compatible AI integration is not active");
    }

    const parsed = openAiCompatibleConfigSchema.safeParse(
      this.parseRawConfig(row.config_json)
    );
    if (!parsed.success) {
      return err(400, "OpenAI-compatible AI integration config is invalid");
    }

    return ok(parsed.data);
  }

  private getKnownIntegration(integrationType: AiIntegrationType) {
    return AI_INTEGRATIONS.find(
      (integration) => integration.integration_type === integrationType
    );
  }

  private parseConfig(row: AiIntegrationRow): OpenAiCompatibleConfig {
    return openAiCompatibleConfigSchema.parse(
      this.parseRawConfig(row.config_json)
    );
  }

  private toProfile(row: AiIntegrationRow): AiIntegrationProfile {
    return {
      id: row.id,
      name: row.name ?? "OpenAI Compatible",
      integration_type: row.integration_type,
      is_active: row.is_active === 1,
      config: openAiCompatibleDraftConfigSchema.parse(
        this.parseRawConfig(row.config_json)
      ),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
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

export const aiIntegrationService = new AiIntegrationService();
