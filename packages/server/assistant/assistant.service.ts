import { z } from "zod";
import { aiIntegrationService } from "../ai-integrations/ai-integration.service";
import { logger } from "../logger";
import { err, ok, type Result } from "../utils/result";
import type {
  AssistantChatInput,
  AssistantChatResponse,
  AssistantSession,
  UpsertAssistantSessionInput,
} from "./assistant.schema";
import { assistantModel } from "./assistant.model";

// TODO: add markdown support with lib

const chatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({
            content: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
      })
    )
    .optional(),
});

const chatCompletionStreamChunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
      })
    )
    .optional(),
});

// Update system prompt to include ezq explanation and syntax
// update prompt to stop saying fluff like:  If you need further assistance or have more questions, feel free to ask!
const SYSTEM_PROMPT = [
  "You are the Metavault assistant.",
  "Help users understand their current library query results, explain entries, and write EZQ queries.",
  "Use only the provided current query context when discussing visible results.",
  "If the user asks for recommendations, explain that recommendations are not enabled yet.", // TODO: update this later
  "Keep answers concise and practical.",
].join(" ");

class AssistantService {
  async getSessions(userId: string): Promise<Result<AssistantSession[]>> {
    return ok(await assistantModel.getSessionsByUser(userId));
  }

  async upsertSession({
    id,
    userId,
    input,
  }: {
    id: string;
    userId: string;
    input: UpsertAssistantSessionInput;
  }): Promise<Result<AssistantSession>> {
    const session = await assistantModel.upsertSession({
      id,
      userId,
      title: input.title,
      messages: input.messages,
    });

    return ok(session);
  }

  async chat({
    userId,
    input,
  }: {
    userId: string;
    input: AssistantChatInput;
  }): Promise<Result<AssistantChatResponse>> {
    const requestResult = await this.buildChatCompletionRequest(userId, input);
    if (!requestResult.ok) return requestResult;

    const { config, messages, url } = requestResult.data;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages,
        }),
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status },
          "OpenAI-compatible chat completion request failed"
        );
        return err(response.status, "AI assistant request failed");
      }

      const parsed = chatCompletionResponseSchema.safeParse(
        await response.json()
      );
      if (!parsed.success) {
        logger.warn(
          { error: parsed.error },
          "OpenAI-compatible chat completion response was invalid"
        );
        return err(502, "AI assistant response was invalid");
      }

      const message = parsed.data.choices?.[0]?.message?.content?.trim();
      if (!message) {
        return err(502, "AI assistant returned an empty response");
      }

      return ok({ message });
    } catch (error) {
      logger.warn({ error }, "OpenAI-compatible chat completion request threw");
      return err(502, "AI assistant request failed");
    }
  }

  async streamChat({
    userId,
    input,
    onDelta,
  }: {
    userId: string;
    input: AssistantChatInput;
    onDelta: (delta: string) => void | Promise<void>;
  }): Promise<Result<{ message: string }>> {
    const requestResult = await this.buildChatCompletionRequest(userId, input);
    if (!requestResult.ok) return requestResult;

    const { config, messages, url } = requestResult.data;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        logger.warn(
          { status: response.status },
          "OpenAI-compatible streaming chat completion request failed"
        );
        return err(response.status || 502, "AI assistant request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let message = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const data = trimmed.slice("data:".length).trim();
          if (data === "[DONE]") {
            return ok({ message });
          }

          const parsedJson = safeJsonParse(data);
          const parsed = chatCompletionStreamChunkSchema.safeParse(parsedJson);
          if (!parsed.success) continue;

          const delta = parsed.data.choices?.[0]?.delta?.content;
          if (!delta) continue;

          message += delta;
          await onDelta(delta);
        }
      }

      if (!message.trim()) {
        return err(502, "AI assistant returned an empty response");
      }

      return ok({ message });
    } catch (error) {
      logger.warn(
        { error },
        "OpenAI-compatible streaming chat completion request threw"
      );
      return err(502, "AI assistant request failed");
    }
  }

  private async buildChatCompletionRequest(
    userId: string,
    input: AssistantChatInput
  ) {
    const configResult =
      await aiIntegrationService.getActiveOpenAiCompatibleConfig(userId);
    if (!configResult.ok) {
      return configResult;
    }

    const config = configResult.data;
    const url = new URL(
      "chat/completions",
      `${config.baseUrl.replace(/\/+$/, "")}/`
    );

    const contextText = this.formatContext(input.context);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(contextText ? [{ role: "system", content: contextText }] : []),
      ...(input.history ?? []).map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: "user",
        content: input.message,
      },
    ];

    return ok({ config, messages, url });
  }

  private formatContext(context: AssistantChatInput["context"]): string {
    if (!context) return "";

    const lines = ["Current Metavault context:"];
    if (context.currentQuery) {
      lines.push(`EZQ query: ${context.currentQuery}`);
    }
    if (context.canonicalQuery) {
      lines.push(`Canonical query: ${context.canonicalQuery}`);
    }

    const visibleResults = context.visibleResults ?? [];
    if (visibleResults.length > 0) {
      lines.push("Visible results:");
      for (const result of visibleResults) {
        const tags = result.tags.map((tag) => tag.value).join(", ") || "none";
        lines.push(
          `- ${result.title} (${result.media_type ?? "unknown"}): status ${result.status ?? "none"}, adult ${result.adult ? "yes" : "no"}, public rating ${result.public_rating ?? "unknown"}, personal rating ${result.personal_rating ?? "unknown"}, tags ${tags}`
        );
      }
    }

    return lines.join("\n");
  }
}

export const assistantService = new AssistantService();

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
