import { z } from "zod";
import { aiIntegrationService } from "../ai-integrations/ai-integration.service";
import type { EntryMediaType } from "../db/schema/libraryEntries";
import { logger } from "../logger";
import { generateRecommendationsSchema } from "../recommendations/recommendation.schema";
import { recommendationService } from "../recommendations/recommendation.service";
import { err, ok, type Result } from "../utils/result";
import { assistantModel } from "./assistant.model";
import type {
  AssistantChatInput,
  AssistantChatResponse,
  AssistantRecommendationRun,
  AssistantSession,
  UpsertAssistantSessionInput,
} from "./assistant.schema";

// TODO: add markdown support with lib

const chatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({
            content: z.string().nullable().optional(),
            tool_calls: z
              .array(
                z.object({
                  id: z.string(),
                  type: z.literal("function"),
                  function: z.object({
                    name: z.string(),
                    arguments: z.string(),
                  }),
                })
              )
              .optional(),
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
            tool_calls: z
              .array(
                z.object({
                  index: z.number(),
                  id: z.string().optional(),
                  type: z.literal("function").optional(),
                  function: z
                    .object({
                      name: z.string().optional(),
                      arguments: z.string().optional(),
                    })
                    .optional(),
                })
              )
              .optional(),
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
  "When the user asks for recommendations, call the generate_recommendations tool instead of inventing recommendations.",
  "After recommendation tool results are available, explain each strongest match in one or two concise sentences.",
  "Prioritize cosine_score: it measures how closely the user's prompt embedding points in the same semantic direction as the catalogue entry embedding. Then mention a concrete genre, tag, rating, release year, or media-type signal when useful.",
  "Describe cosine similarity as an approximate semantic match, not certainty.",
  "Keep answers concise and practical.",
].join(" ");

const RECOMMENDATION_TOOL = {
  type: "function",
  function: {
    name: "generate_recommendations",
    description:
      "Generate Metavault recommendations from the catalogue using the user's prompt and structured filters.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["prompt"],
      properties: {
        prompt: {
          type: "string",
          description:
            "Natural-language recommendation intent, including mood and preferences.",
        },
        count: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          default: 10,
        },
        filters: {
          type: "object",
          additionalProperties: false,
          properties: {
            excludedMediaTypes: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "movie",
                  "tv_show",
                  "anime",
                  "game",
                  "book",
                  "manga",
                  "other",
                ],
              },
            },
            adult: {
              type: "string",
              enum: ["exclude", "include", "only"],
              default: "exclude",
            },
            releaseYearFrom: { type: "integer" },
            releaseYearTo: { type: "integer" },
            minPublicRating: {
              type: "number",
              minimum: 0,
              maximum: 10,
            },
            excludeExistingLibrary: {
              type: "boolean",
              default: true,
            },
          },
        },
      },
    },
  },
} as const;

type ChatCompletionMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

type StreamingToolCall = NonNullable<
  ChatCompletionMessage["tool_calls"]
>[number];

const ALL_MEDIA_TYPES: EntryMediaType[] = [
  "movie",
  "tv_show",
  "anime",
  "game",
  "book",
  "manga",
  "other",
];

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
      const firstResult = await this.requestChatCompletion({
        config,
        messages,
        url,
        tools: [RECOMMENDATION_TOOL],
      });
      if (!firstResult.ok) return firstResult;

      const finalResult = await this.resolveRecommendationToolCalls({
        userId,
        config,
        url,
        messages,
        assistantMessage: firstResult.data,
        recommendationCount: input.recommendationCount,
        recommendationMediaTypes: input.recommendationMediaTypes,
      });
      if (!finalResult.ok) return finalResult;

      const message = finalResult.data.message.content?.trim();
      if (!message) {
        return err(502, "AI assistant returned an empty response");
      }

      return ok({
        message,
        ...(input.includeRecommendationDetails
          ? { recommendation_runs: finalResult.data.recommendationRuns }
          : {}),
      });
    } catch (error) {
      logger.warn({ error }, "OpenAI-compatible chat completion request threw");
      return err(502, "AI assistant request failed");
    }
  }

  async streamChat({
    userId,
    input,
    onDelta,
    onRecommendations,
  }: {
    userId: string;
    input: AssistantChatInput;
    onDelta: (delta: string) => void | Promise<void>;
    onRecommendations?: (
      runs: AssistantRecommendationRun[]
    ) => void | Promise<void>;
  }): Promise<Result<{ message: string }>> {
    const requestResult = await this.buildChatCompletionRequest(userId, input);
    if (!requestResult.ok) return requestResult;

    const { config, messages, url } = requestResult.data;

    try {
      const firstResult = await this.requestChatCompletionStream({
        config,
        messages,
        url,
        tools: [RECOMMENDATION_TOOL],
        onDelta,
      });
      if (!firstResult.ok) return firstResult;

      const toolMessagesResult = await this.buildRecommendationToolMessages({
        userId,
        assistantMessage: firstResult.data,
        recommendationCount: input.recommendationCount,
        recommendationMediaTypes: input.recommendationMediaTypes,
      });
      if (!toolMessagesResult.ok) return toolMessagesResult;

      if (
        input.includeRecommendationDetails &&
        toolMessagesResult.data.recommendationRuns.length > 0
      ) {
        await onRecommendations?.(toolMessagesResult.data.recommendationRuns);
      }

      if (toolMessagesResult.data.messages.length === 0) {
        const content = firstResult.data.content?.trim();
        if (!content) {
          return err(502, "AI assistant returned an empty response");
        }
        return ok({ message: content });
      }

      const finalMessages = [
        ...messages,
        {
          role: "assistant" as const,
          content: firstResult.data.content ?? null,
          tool_calls: firstResult.data.tool_calls,
        },
        ...toolMessagesResult.data.messages,
      ];

      const finalResult = await this.requestChatCompletionStream({
        config,
        messages: finalMessages,
        url,
        onDelta,
      });
      if (!finalResult.ok) return finalResult;

      const message = finalResult.data.content?.trim();
      if (!message) {
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
    const messages: ChatCompletionMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(contextText
        ? ([
            { role: "system", content: contextText },
          ] satisfies ChatCompletionMessage[])
        : []),
      ...(input.history ?? []).map(
        (message) =>
          ({
            role: message.role,
            content: message.content,
          }) satisfies ChatCompletionMessage
      ),
      {
        role: "user",
        content: input.message,
      },
    ];

    return ok({ config, messages, url });
  }

  private async requestChatCompletion({
    config,
    messages,
    url,
    tools,
  }: {
    config: { apiKey: string; model: string };
    messages: ChatCompletionMessage[];
    url: URL;
    tools?: unknown[];
  }): Promise<Result<ChatCompletionMessage>> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        ...(tools ? { tools, tool_choice: "auto" } : {}),
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

    const message = parsed.data.choices?.[0]?.message;
    if (!message) {
      return err(502, "AI assistant returned an empty response");
    }

    return ok({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: message.tool_calls,
    });
  }

  private async requestChatCompletionStream({
    config,
    messages,
    url,
    tools,
    onDelta,
  }: {
    config: { apiKey: string; model: string };
    messages: ChatCompletionMessage[];
    url: URL;
    tools?: unknown[];
    onDelta: (delta: string) => void | Promise<void>;
  }): Promise<Result<ChatCompletionMessage>> {
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
        ...(tools ? { tools, tool_choice: "auto" } : {}),
      }),
    });

    if (!response.ok || !response.body) {
      logger.warn(
        { status: response.status },
        "OpenAI-compatible streaming chat completion request failed"
      );
      return err(response.status || 502, "AI assistant request failed");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      const parsed = chatCompletionResponseSchema.safeParse(
        await response.json().catch(() => null)
      );
      if (!parsed.success) {
        logger.warn(
          { error: parsed.error },
          "OpenAI-compatible streaming chat completion response was invalid"
        );
        return err(502, "AI assistant response was invalid");
      }

      const message = parsed.data.choices?.[0]?.message;
      if (!message) {
        return err(502, "AI assistant returned an empty response");
      }

      return ok({
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const streamedToolCalls = new Map<number, StreamingToolCall>();
    let buffer = "";
    let content = "";

    const finish = () =>
      ok({
        role: "assistant" as const,
        content,
        tool_calls:
          streamedToolCalls.size > 0
            ? Array.from(streamedToolCalls.entries())
                .sort(([left], [right]) => left - right)
                .map(([, toolCall]) => toolCall)
            : undefined,
      });

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
          return finish();
        }

        const parsedJson = safeJsonParse(data);
        const parsed = chatCompletionStreamChunkSchema.safeParse(parsedJson);
        if (!parsed.success) continue;

        const delta = parsed.data.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          content += delta.content;
          await onDelta(delta.content);
        }

        for (const toolCallDelta of delta.tool_calls ?? []) {
          const current = streamedToolCalls.get(toolCallDelta.index) ?? {
            id: toolCallDelta.id ?? "",
            type: "function" as const,
            function: {
              name: "",
              arguments: "",
            },
          };

          streamedToolCalls.set(toolCallDelta.index, {
            id: toolCallDelta.id ?? current.id,
            type: "function",
            function: {
              name:
                toolCallDelta.function?.name === undefined
                  ? current.function.name
                  : current.function.name + toolCallDelta.function.name,
              arguments:
                toolCallDelta.function?.arguments === undefined
                  ? current.function.arguments
                  : current.function.arguments +
                    toolCallDelta.function.arguments,
            },
          });
        }
      }
    }

    return finish();
  }

  private async resolveRecommendationToolCalls(input: {
    userId: string;
    config: { apiKey: string; model: string };
    url: URL;
    messages: ChatCompletionMessage[];
    assistantMessage: ChatCompletionMessage;
    recommendationCount?: number;
    recommendationMediaTypes?: EntryMediaType[];
  }): Promise<
    Result<{
      message: ChatCompletionMessage;
      recommendationRuns: AssistantRecommendationRun[];
    }>
  > {
    const toolMessagesResult = await this.buildRecommendationToolMessages({
      userId: input.userId,
      assistantMessage: input.assistantMessage,
      recommendationCount: input.recommendationCount,
      recommendationMediaTypes: input.recommendationMediaTypes,
    });
    if (!toolMessagesResult.ok) return toolMessagesResult;

    if (toolMessagesResult.data.messages.length === 0) {
      return ok({
        message: input.assistantMessage,
        recommendationRuns: [],
      });
    }

    const finalResult = await this.requestChatCompletion({
      config: input.config,
      url: input.url,
      messages: [
        ...input.messages,
        input.assistantMessage,
        ...toolMessagesResult.data.messages,
      ],
    });
    if (!finalResult.ok) return finalResult;

    return ok({
      message: finalResult.data,
      recommendationRuns: toolMessagesResult.data.recommendationRuns,
    });
  }

  private async buildRecommendationToolMessages(input: {
    userId: string;
    assistantMessage: ChatCompletionMessage;
    recommendationCount?: number;
    recommendationMediaTypes?: EntryMediaType[];
  }): Promise<
    Result<{
      messages: ChatCompletionMessage[];
      recommendationRuns: AssistantRecommendationRun[];
    }>
  > {
    const toolCalls =
      input.assistantMessage.tool_calls?.filter(
        (toolCall) => toolCall.function.name === "generate_recommendations"
      ) ?? [];

    const messages: ChatCompletionMessage[] = [];
    const recommendationRuns: AssistantRecommendationRun[] = [];
    for (const toolCall of toolCalls) {
      const args = safeJsonParse(toolCall.function.arguments);
      const parsed = generateRecommendationsSchema.safeParse(args);
      if (!parsed.success) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: "Invalid recommendation tool arguments",
          }),
        });
        continue;
      }

      const recommendationInput = {
        ...parsed.data,
        ...(input.recommendationCount === undefined
          ? {}
          : { count: input.recommendationCount }),
        ...(input.recommendationMediaTypes
          ? {
              filters: {
                ...parsed.data.filters,
                excludedMediaTypes: ALL_MEDIA_TYPES.filter(
                  (mediaType) =>
                    !input.recommendationMediaTypes?.includes(mediaType)
                ),
              },
            }
          : {}),
      };
      const result = await recommendationService.generate({
        userId: input.userId,
        input: recommendationInput,
      });
      if (result.ok) {
        recommendationRuns.push({
          input: recommendationInput,
          items: result.data.items,
        });
      }
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(
          result.ok ? result.data : { error: result.error.message }
        ),
      });
    }

    return ok({ messages, recommendationRuns });
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
