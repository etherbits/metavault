import { z } from "zod";
import {
  EntryMediaTypeSchema,
  EntryStatusSchema,
} from "../db/schema/libraryEntries";
import { EmbeddedTagSchema } from "../db/schema/tags";
import {
  generateRecommendationsSchema,
  recommendationItemSchema,
} from "../recommendations/recommendation.schema";

export const ASSISTANT_MESSAGE_MAX_LENGTH = 4000;

export const assistantVisibleResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  media_type: EntryMediaTypeSchema.nullable(),
  status: EntryStatusSchema.nullable(),
  adult: z.boolean(),
  public_rating: z.number().nullable(),
  personal_rating: z.number().nullable(),
  tags: z.array(EmbeddedTagSchema),
});

export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX_LENGTH),
});

export const assistantStoredMessageSchema = assistantMessageSchema.extend({
  id: z.string(),
});

export const assistantSessionSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(80),
  messages: z.array(assistantStoredMessageSchema).max(60),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const assistantSessionsResponseSchema = z.array(assistantSessionSchema);

export const assistantSessionParamsSchema = z.object({
  id: z.string().min(1),
});

export const upsertAssistantSessionSchema = z.object({
  title: z.string().trim().min(1).max(80),
  messages: z.array(assistantStoredMessageSchema).max(60),
});

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX_LENGTH),
  recommendationCount: z.number().int().min(1).max(50).optional(),
  recommendationMediaTypes: z.array(EntryMediaTypeSchema).min(1).optional(),
  includeRecommendationDetails: z.boolean().default(false),
  history: z.array(assistantMessageSchema).max(30).optional(),
  context: z
    .object({
      currentQuery: z.string().max(1000).optional(),
      canonicalQuery: z.string().max(2000).optional(),
      visibleResults: z.array(assistantVisibleResultSchema).max(25).optional(),
    })
    .optional(),
});

export const assistantRecommendationRunSchema = z.object({
  input: generateRecommendationsSchema,
  items: z.array(recommendationItemSchema),
});

export const assistantChatResponseSchema = z.object({
  message: z.string(),
  recommendation_runs: z.array(assistantRecommendationRunSchema).optional(),
});

export type AssistantChatInput = z.infer<typeof assistantChatSchema>;
export type AssistantChatResponse = z.infer<typeof assistantChatResponseSchema>;
export type AssistantRecommendationRun = z.infer<
  typeof assistantRecommendationRunSchema
>;
export type AssistantSession = z.infer<typeof assistantSessionSchema>;
export type UpsertAssistantSessionInput = z.infer<
  typeof upsertAssistantSessionSchema
>;
