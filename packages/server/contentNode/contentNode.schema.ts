import { z } from "zod";

const libraryEntrySelectorSchema = z
  .object({
    library_entry_id: z.string().min(1).optional(),
    library_entry_title: z.string().min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.library_entry_id || value.library_entry_title),
    {
      message: "Either library_entry_id or library_entry_title is required",
      path: ["library_entry_id"],
    }
  );

export const createContentNodeSchema = z
  .object({
    title: z.string().min(1).optional(),
    link: z.string().url().optional(),
    order_index: z.coerce.number().int().min(0).optional(),
  })
  .merge(libraryEntrySelectorSchema);

export const updateContentNodeSchema = z.object({
  title: z.string().min(1).optional(),
  link: z.string().url().optional(),
  order_index: z.coerce.number().int().min(0).optional(),
});

export const contentNodeIdSchema = z.object({
  id: z.string().min(1),
});

export type CreateContentNodeInput = z.infer<typeof createContentNodeSchema>;
export type UpdateContentNodeInput = z.infer<typeof updateContentNodeSchema>;
