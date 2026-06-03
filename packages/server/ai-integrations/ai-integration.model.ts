import { sql } from "../db";
import type { AiIntegrationType } from "./ai-integration.schema";

export type AiIntegrationRow = {
  id: string;
  is_active: number;
  integration_type: AiIntegrationType;
  user_id: string;
  config_json: string | null;
};

class AiIntegrationModel {
  async getByUser(userId: string): Promise<AiIntegrationRow[]> {
    const rows = await sql`
      SELECT *
      FROM ai_integrations
      WHERE user_id = ${userId}
    `;

    return rows as AiIntegrationRow[];
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
    const updatedRows = await sql`
      UPDATE ai_integrations
      SET
        is_active = ${data.isActive ? 1 : 0},
        config_json = ${JSON.stringify(data.config)}
      WHERE user_id = ${data.userId}
      AND integration_type = ${data.integrationType}
      RETURNING *
    `;

    if (updatedRows[0]) {
      return updatedRows[0] as AiIntegrationRow;
    }

    const insertedRows = await sql`
      INSERT INTO ai_integrations (
        id,
        user_id,
        integration_type,
        is_active,
        config_json
      )
      VALUES (
        ${crypto.randomUUID()},
        ${data.userId},
        ${data.integrationType},
        ${data.isActive ? 1 : 0},
        ${JSON.stringify(data.config)}
      )
      RETURNING *
    `;

    return insertedRows[0] as AiIntegrationRow;
  }
}

export const aiIntegrationModel = new AiIntegrationModel();
