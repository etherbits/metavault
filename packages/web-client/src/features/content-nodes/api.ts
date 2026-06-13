import { z } from "zod";
import { apiRequest } from "@/shared/api/client";
import type { ContentNode } from "./types";
import {
  createContentNodeSchema,
  updateContentNodeSchema,
} from "../../../../server/contentNode/contentNode.schema";

const contentNodeResponseSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  link: z.string().nullable(),
  order_index: z.number().int().nullable(),
  library_entry_id: z.string(),
});

const contentNodesResponseSchema = z.array(contentNodeResponseSchema);
const deleteResponseSchema = z.object({
  message: z.string(),
});

export async function fetchContentNodes(libraryEntryId: string) {
  const response = await apiRequest(
    `/content-nodes/library-entry/${libraryEntryId}`,
    contentNodesResponseSchema
  );

  return response.map(mapServerContentNode);
}

export async function createContentNode(payload: {
  libraryEntryId: string;
  title: string;
  link: string;
  orderIndex?: number;
}) {
  const body = createContentNodeSchema.parse({
    library_entry_id: payload.libraryEntryId,
    title: payload.title,
    link: payload.link,
    order_index: payload.orderIndex,
  });

  const response = await apiRequest(
    "/content-nodes",
    contentNodeResponseSchema,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  return mapServerContentNode(response);
}

export async function updateContentNode(payload: {
  id: string;
  title: string;
  link: string;
  orderIndex?: number;
}) {
  const body = updateContentNodeSchema.parse({
    title: payload.title,
    link: payload.link,
    order_index: payload.orderIndex,
  });

  const response = await apiRequest(
    `/content-nodes/${payload.id}`,
    contentNodeResponseSchema,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );

  return mapServerContentNode(response);
}

export async function deleteContentNode(id: string) {
  await apiRequest(`/content-nodes/${id}`, deleteResponseSchema, {
    method: "DELETE",
  });
}

function mapServerContentNode(
  node: z.infer<typeof contentNodeResponseSchema>
): ContentNode {
  return {
    id: node.id,
    title: node.title ?? "",
    link: node.link ?? "",
    orderIndex: node.order_index,
    libraryEntryId: node.library_entry_id,
  };
}
