import {
  API_BASE_URL,
  ApiError,
  apiRequest,
  getApiErrorMessage,
} from "@/shared/api/client";
import {
  type AssistantChatInput,
  type AssistantRecommendationRun,
  assistantChatResponseSchema,
  assistantChatSchema,
  assistantRecommendationRunSchema,
  assistantSessionSchema,
  assistantSessionsResponseSchema,
  type UpsertAssistantSessionInput,
} from "../../../../server/assistant/assistant.schema";

export type { AssistantChatInput, UpsertAssistantSessionInput };
export { assistantChatSchema };

export function sendAssistantMessage(input: AssistantChatInput) {
  return apiRequest("/assistant/chat", assistantChatResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function streamAssistantMessage({
  input,
  onDelta,
  onRecommendations,
}: {
  input: AssistantChatInput;
  onDelta: (delta: string) => void;
  onRecommendations?: (runs: AssistantRecommendationRun[]) => void;
}) {
  const response = await fetch(`${API_BASE_URL}/assistant/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as unknown;
    const message = getApiErrorMessage(payload, response.status);
    throw new ApiError(message, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let message = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventText of events) {
      const event = parseServerSentEvent(eventText);
      if (!event) continue;

      if (event.event === "error") {
        throw new Error("Unable to stream assistant reply");
      }

      if (event.event === "done") {
        return event.data.message ?? message;
      }

      if (event.event === "recommendations") {
        onRecommendations?.(event.data.recommendationRuns ?? []);
        continue;
      }

      if (event.data.delta !== undefined) {
        message += event.data.delta;
        onDelta(event.data.delta);
      }
    }
  }

  return message;
}

export function fetchAssistantSessions() {
  return apiRequest("/assistant/sessions", assistantSessionsResponseSchema);
}

export function saveAssistantSession({
  id,
  input,
}: {
  id: string;
  input: UpsertAssistantSessionInput;
}) {
  return apiRequest(`/assistant/sessions/${id}`, assistantSessionSchema, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

function parseServerSentEvent(eventText: string) {
  const lines = eventText.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  if (dataLines.length === 0) return null;

  try {
    const parsed = JSON.parse(dataLines.join("\n")) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const data = {
      message:
        "message" in parsed && typeof parsed.message === "string"
          ? parsed.message
          : undefined,
      delta:
        "delta" in parsed && typeof parsed.delta === "string"
          ? parsed.delta
          : undefined,
      recommendationRuns:
        "recommendation_runs" in parsed
          ? assistantRecommendationRunSchema
              .array()
              .safeParse(parsed.recommendation_runs).data
          : undefined,
    };
    return { event, data };
  } catch {
    return null;
  }
}
