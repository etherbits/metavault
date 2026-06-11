import { sql } from "../db";
import type { AssistantSession } from "./assistant.schema";

type AssistantSessionRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type AssistantMessageRow = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  position: number;
};

class AssistantModel {
  async getSessionsByUser(userId: string): Promise<AssistantSession[]> {
    const sessionRows = (await sql`
      SELECT *
      FROM assistant_sessions
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `) as AssistantSessionRow[];

    if (sessionRows.length === 0) {
      return [];
    }

    const sessionIds = sessionRows.map((session) => session.id);
    const messageRows = (await sql`
      SELECT *
      FROM assistant_messages
      WHERE session_id IN ${sql(sessionIds)}
      ORDER BY position ASC
    `) as AssistantMessageRow[];

    const messagesBySessionId = new Map<string, AssistantSession["messages"]>();
    for (const message of messageRows) {
      const messages = messagesBySessionId.get(message.session_id) ?? [];
      messages.push({
        id: message.id,
        role: message.role,
        content: message.content,
      });
      messagesBySessionId.set(message.session_id, messages);
    }

    return sessionRows.map((session) => ({
      id: session.id,
      title: session.title,
      messages: messagesBySessionId.get(session.id) ?? [],
      created_at: session.created_at,
      updated_at: session.updated_at,
    }));
  }

  async upsertSession({
    id,
    userId,
    title,
    messages,
  }: {
    id: string;
    userId: string;
    title: string;
    messages: AssistantSession["messages"];
  }): Promise<AssistantSession> {
    const updatedRows = (await sql`
      UPDATE assistant_sessions
      SET
        title = ${title},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      AND user_id = ${userId}
      RETURNING *
    `) as AssistantSessionRow[];

    const session =
      updatedRows[0] ??
      (
        (await sql`
          INSERT INTO assistant_sessions (id, user_id, title)
          VALUES (${id}, ${userId}, ${title})
          RETURNING *
        `) as AssistantSessionRow[]
      )[0];

    if (!session) {
      throw new Error("Failed to persist assistant session");
    }

    await sql`
      DELETE FROM assistant_messages
      WHERE session_id = ${id}
    `;

    for (const [index, message] of messages.entries()) {
      await sql`
        INSERT INTO assistant_messages (
          id,
          session_id,
          role,
          content,
          position
        )
        VALUES (
          ${message.id},
          ${id},
          ${message.role},
          ${message.content},
          ${index}
        )
      `;
    }

    return {
      id: session.id,
      title: session.title,
      messages,
      created_at: session.created_at,
      updated_at: session.updated_at,
    };
  }
}

export const assistantModel = new AssistantModel();
