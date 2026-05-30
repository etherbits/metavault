import { sql } from "../db";
import type { SourceIntegrationType } from "./source-integration.schema";

export type SourceIntegrationRow = {
  id: string;
  is_active: number;
  integration_type: SourceIntegrationType;
  user_id: string;
  config_json: string | null;
};

class SourceIntegrationModel {
  async getAll(): Promise<SourceIntegrationRow[]> {
    const rows = await sql`
      SELECT *
      FROM source_integrations
    `;

    return rows as SourceIntegrationRow[];
  }

  async getByUser(userId: string): Promise<SourceIntegrationRow[]> {
    const rows = await sql`
      SELECT *
      FROM source_integrations
      WHERE user_id = ${userId}
    `;

    return rows as SourceIntegrationRow[];
  }

  async getByUserAndType(
    userId: string,
    integrationType: SourceIntegrationType
  ): Promise<SourceIntegrationRow | null> {
    const rows = await sql`
      SELECT *
      FROM source_integrations
      WHERE user_id = ${userId}
      AND integration_type = ${integrationType}
      LIMIT 1
    `;

    return (rows[0] as SourceIntegrationRow | undefined) ?? null;
  }

  async upsert(data: {
    userId: string;
    integrationType: SourceIntegrationType;
    isActive: boolean;
    config: Record<string, unknown>;
  }): Promise<SourceIntegrationRow> {
    const updatedRows = await sql`
      UPDATE source_integrations
      SET
        is_active = ${data.isActive ? 1 : 0},
        config_json = ${JSON.stringify(data.config)}
      WHERE user_id = ${data.userId}
      AND integration_type = ${data.integrationType}
      RETURNING *
    `;

    if (updatedRows[0]) {
      return updatedRows[0] as SourceIntegrationRow;
    }

    const insertedRows = await sql`
      INSERT INTO source_integrations (
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

    return insertedRows[0] as SourceIntegrationRow;
  }
}

export const sourceIntegrationModel = new SourceIntegrationModel();
