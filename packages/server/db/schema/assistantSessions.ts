import type { SQL } from "bun";

export async function createAssistantSessionsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS assistant_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_assistant_sessions_user_id
    ON assistant_sessions(user_id)
  `;
}

export async function createAssistantMessagesTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS assistant_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES assistant_sessions(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_assistant_messages_session_id
    ON assistant_messages(session_id)
  `;
}
