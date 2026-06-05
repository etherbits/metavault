import type { Migration } from "./types";

export const backfillAiIntegrationTimestampsMigration: Migration = {
  id: "004",
  name: "backfill_ai_integration_timestamps",
  async up(sql) {
    await sql`
      UPDATE ai_integrations
      SET created_at = CURRENT_TIMESTAMP
      WHERE created_at IS NULL
    `;

    await sql`
      UPDATE ai_integrations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE updated_at IS NULL
    `;
  },
};
