import { apiRequest } from "@/shared/api/client";
import {
  assistantChatResponseSchema,
  assistantChatSchema,
  type AssistantChatInput,
} from "../../../../server/assistant/assistant.schema";

export { assistantChatSchema };
export type { AssistantChatInput };

export function sendAssistantMessage(input: AssistantChatInput) {
  return apiRequest("/assistant/chat", assistantChatResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
