import type { SQL } from "bun";

export async function createAiIntegrationsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS ai_integrations (
      id TEXT PRIMARY KEY,
      is_active INTEGER NOT NULL DEFAULT 0,
      integration_type TEXT,
      user_id TEXT NOT NULL,
      config_json TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;
}
