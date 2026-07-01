import { z } from "zod";
import {
  ezqQuerySchema,
  ezqResponseSchema,
} from "@/features/library/contracts";
import { mapServerEntriesToMediaItems } from "@/features/library/mappers";
import type { MediaStatus } from "@/features/library/types";
import {
  API_BASE_URL,
  ApiError,
  apiRequest,
  getApiErrorMessage,
} from "@/shared/api/client";
import { LibraryEntrySchema } from "../../../../server/db/schema/libraryEntries";

const deleteResponseSchema = z.object({
  message: z.string(),
});

const serverStatusByMediaStatus: Record<MediaStatus, string> = {
  "In Progress": "in_progress",
  Dropped: "dropped",
  Planning: "planning",
  "On Hold": "on_hold",
  Finished: "finished",
};

export async function fetchLibraryEntries() {
  const response = await executeEzqQuery({ query: "/search" });
  return mapServerEntriesToMediaItems(response.rows);
}

export async function fetchLibraryEntry(id: string) {
  const response = await executeEzqQuery({ query: `/search id:${id}` });
  return response.rows[0]
    ? mapServerEntriesToMediaItems([response.rows[0]])[0]
    : null;
}

export async function updateLibraryEntryStatus(payload: {
  ids: string[];
  status?: MediaStatus;
}) {
  await Promise.all(
    payload.ids.map((id) =>
      apiRequest(`/library/${id}`, LibraryEntrySchema, {
        method: "PATCH",
        body: JSON.stringify({
          status: payload.status
            ? serverStatusByMediaStatus[payload.status]
            : null,
        }),
      })
    )
  );

  return fetchLibraryEntries();
}

export async function updateLibraryEntryPersonalRating(payload: {
  id: string;
  personalRating: number;
}) {
  await apiRequest(`/library/${payload.id}`, LibraryEntrySchema, {
    method: "PATCH",
    body: JSON.stringify({
      personal_rating: payload.personalRating,
    }),
  });

  return fetchLibraryEntry(payload.id);
}

export async function deleteLibraryEntries(ids: string[]) {
  await Promise.all(
    ids.map((id) =>
      apiRequest(`/library/${id}`, deleteResponseSchema, {
        method: "DELETE",
      })
    )
  );

  return fetchLibraryEntries();
}

export async function importLibraryEntries(file: File) {
  const form = new FormData();
  form.append("file", file);

  await apiFormRequest("/library/import/bundle", {
    method: "POST",
    body: form,
  });

  return fetchLibraryEntries();
}

export async function uploadLibraryEntryImage(payload: {
  id: string;
  file: File;
}) {
  const form = new FormData();
  form.append("image", payload.file);

  await apiFormRequest(`/library/${payload.id}`, {
    method: "PATCH",
    body: form,
  });

  return fetchLibraryEntries();
}

export async function exportLibraryEntries(ids: string[]) {
  return apiBlobRequest("/library/export/bundle", {
    method: "POST",
    body: JSON.stringify({ ids: ids.length > 0 ? ids : undefined }),
  });
}

export async function executeEzqQuery(payload: { query: string }) {
  const body = ezqQuerySchema.parse(payload);

  return apiRequest("/ezq", ezqResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function apiFormRequest(path: string, options: RequestInit) {
  return apiRawRequest(path, {
    credentials: "include",
    ...options,
  });
}

async function apiBlobRequest(path: string, options: RequestInit) {
  const response = await apiRawRequest(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  return response.blob();
}

async function apiRawRequest(path: string, options: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${normalizedPath}`, options);
  } catch {
    throw new Error("Unable to reach the API server. Please try again.");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as unknown;
    const message = getApiErrorMessage(payload, response.status);
    throw new ApiError(message, response.status);
  }

  return response;
}
