import { sql } from "../db";
import type { AiIntegrationType } from "./ai-integration.schema";

export type AiIntegrationRow = {
  id: string;
  name: string | null;
  is_active: number;
  integration_type: AiIntegrationType;
  user_id: string;
  config_json: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

class AiIntegrationModel {
  async getByUser(userId: string): Promise<AiIntegrationRow[]> {
    const rows = await sql`
      SELECT *
      FROM ai_integrations
      WHERE user_id = ${userId}
      ORDER BY created_at ASC, id ASC
    `;

    return rows as AiIntegrationRow[];
  }

  async getById(userId: string, id: string): Promise<AiIntegrationRow | null> {
    const rows = await sql`
      SELECT *
      FROM ai_integrations
      WHERE user_id = ${userId}
      AND id = ${id}
      LIMIT 1
    `;

    return (rows[0] as AiIntegrationRow | undefined) ?? null;
  }

  async getByUserAndType(
    userId: string,
    integrationType: AiIntegrationType
  ): Promise<AiIntegrationRow | null> {
    const rows = await sql`
      SELECT *
      FROM ai_integrations
      WHERE user_id = ${userId}
      AND integration_type = ${integrationType}
      AND is_active = 1
      LIMIT 1
    `;

    return (rows[0] as AiIntegrationRow | undefined) ?? null;
  }

  async upsert(data: {
    userId: string;
    integrationType: AiIntegrationType;
    isActive: boolean;
    config: Record<string, unknown>;
  }): Promise<AiIntegrationRow> {
    const existingRows = (await sql`
      SELECT *
      FROM ai_integrations
      WHERE user_id = ${data.userId}
      AND integration_type = ${data.integrationType}
      ORDER BY is_active DESC, created_at ASC, id ASC
      LIMIT 1
    `) as AiIntegrationRow[];
    const existing = existingRows[0];

    if (data.isActive) {
      await this.deactivateAll(data.userId);
    }

    if (existing) {
      const updatedRows = await sql`
        UPDATE ai_integrations
        SET
          is_active = ${data.isActive ? 1 : 0},
          config_json = ${JSON.stringify(data.config)},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${data.userId}
        AND id = ${existing.id}
        RETURNING *
      `;

      return updatedRows[0] as AiIntegrationRow;
    }

    const insertedRows = await sql`
      INSERT INTO ai_integrations (
        id,
        name,
        user_id,
        integration_type,
        is_active,
        config_json
      )
      VALUES (
        ${crypto.randomUUID()},
        ${"OpenAI Compatible"},
        ${data.userId},
        ${data.integrationType},
        ${data.isActive ? 1 : 0},
        ${JSON.stringify(data.config)}
      )
      RETURNING *
    `;

    return insertedRows[0] as AiIntegrationRow;
  }

  async create(data: {
    userId: string;
    name: string;
    integrationType: AiIntegrationType;
    config: Record<string, unknown>;
  }): Promise<AiIntegrationRow> {
    const insertedRows = await sql`
      INSERT INTO ai_integrations (
        id,
        name,
        user_id,
        integration_type,
        is_active,
        config_json
      )
      VALUES (
        ${crypto.randomUUID()},
        ${data.name},
        ${data.userId},
        ${data.integrationType},
        0,
        ${JSON.stringify(data.config)}
      )
      RETURNING *
    `;

    return insertedRows[0] as AiIntegrationRow;
  }

  async update(data: {
    userId: string;
    id: string;
    name: string;
    config: Record<string, unknown>;
  }): Promise<AiIntegrationRow | null> {
    const rows = await sql`
      UPDATE ai_integrations
      SET
        name = ${data.name},
        config_json = ${JSON.stringify(data.config)},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${data.userId}
      AND id = ${data.id}
      RETURNING *
    `;

    return (rows[0] as AiIntegrationRow | undefined) ?? null;
  }

  async setActive(
    userId: string,
    id: string
  ): Promise<AiIntegrationRow | null> {
    const existing = await this.getById(userId, id);
    if (!existing) {
      return null;
    }

    await this.deactivateAll(userId);

    const rows = await sql`
      UPDATE ai_integrations
      SET
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
      AND id = ${id}
      RETURNING *
    `;

    return (rows[0] as AiIntegrationRow | undefined) ?? null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await sql`
      DELETE FROM ai_integrations
      WHERE user_id = ${userId}
      AND id = ${id}
      RETURNING id
    `;

    return rows.length > 0;
  }

  private async deactivateAll(userId: string) {
    await sql`
      UPDATE ai_integrations
      SET
        is_active = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `;
  }
}

export const aiIntegrationModel = new AiIntegrationModel();
