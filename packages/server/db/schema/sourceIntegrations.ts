import type { SQL } from "bun";

export async function createSourceIntegrationsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS source_integrations (
      id TEXT PRIMARY KEY,
      is_active INTEGER NOT NULL DEFAULT 0,
      integration_type TEXT,
      user_id TEXT NOT NULL,
      config_json TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;
}
