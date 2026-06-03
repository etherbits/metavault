import { z } from "zod";
import {
  EntryMediaTypeSchema,
  EntryStatusSchema,
} from "../db/schema/libraryEntries";
import { EmbeddedTagSchema } from "../db/schema/tags";

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
  content: z.string().trim().min(1).max(4000),
});

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(assistantMessageSchema).max(30).optional(),
  context: z
    .object({
      currentQuery: z.string().max(1000).optional(),
      canonicalQuery: z.string().max(2000).optional(),
      visibleResults: z.array(assistantVisibleResultSchema).max(25).optional(),
    })
    .optional(),
});

export const assistantChatResponseSchema = z.object({
  message: z.string(),
});

export type AssistantChatInput = z.infer<typeof assistantChatSchema>;
export type AssistantChatResponse = z.infer<typeof assistantChatResponseSchema>;
