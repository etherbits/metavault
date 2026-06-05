import type { SQL } from "bun";

export async function createAiIntegrationsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS ai_integrations (
      id TEXT PRIMARY KEY,
      name TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      integration_type TEXT,
      user_id TEXT NOT NULL,
      config_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ai_integrations_user_id
    ON ai_integrations(user_id)
  `;
}
