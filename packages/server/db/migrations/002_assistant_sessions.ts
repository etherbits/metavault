import {
  createAssistantMessagesTable,
  createAssistantSessionsTable,
} from "../schema/assistantSessions";
import type { Migration } from "./types";

export const assistantSessionsMigration: Migration = {
  id: "002",
  name: "assistant_sessions",
  async up(sql) {
    await createAssistantSessionsTable(sql);
    await createAssistantMessagesTable(sql);
  },
};
