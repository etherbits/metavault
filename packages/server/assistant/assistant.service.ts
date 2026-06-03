import { z } from "zod";
import { aiIntegrationService } from "../ai-integrations/ai-integration.service";
import { logger } from "../logger";
import { err, ok, type Result } from "../utils/result";
import type {
  AssistantChatInput,
  AssistantChatResponse,
} from "./assistant.schema";

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
  async chat({
    userId,
    input,
  }: {
    userId: string;
    input: AssistantChatInput;
  }): Promise<Result<AssistantChatResponse>> {
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
