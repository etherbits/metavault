import type { Migration } from "./types";

export const aiIntegrationProfilesMigration: Migration = {
  id: "003",
  name: "ai_integration_profiles",
  async up(sql) {
    const columns = (await sql`PRAGMA table_info(ai_integrations)`) as Array<{
      name: string;
    }>;
    const columnNames = new Set(columns.map((column) => column.name));

    if (!columnNames.has("name")) {
      await sql`ALTER TABLE ai_integrations ADD COLUMN name TEXT`;
    }

    if (!columnNames.has("created_at")) {
      await sql`ALTER TABLE ai_integrations ADD COLUMN created_at DATETIME`;
    }

    if (!columnNames.has("updated_at")) {
      await sql`ALTER TABLE ai_integrations ADD COLUMN updated_at DATETIME`;
    }

    await sql`
      UPDATE ai_integrations
      SET name = 'OpenAI Compatible'
      WHERE name IS NULL
    `;

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

    await sql`
      CREATE INDEX IF NOT EXISTS idx_ai_integrations_user_id
      ON ai_integrations(user_id)
    `;
  },
};
