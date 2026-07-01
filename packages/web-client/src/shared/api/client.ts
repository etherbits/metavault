import type { z } from "zod";

const rawApiBaseUrl = import.meta.env.VITE_API_URL ?? "/api";
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export async function apiRequest<T>(
  path: string,
  responseSchema: z.ZodType<T>,
  options: RequestInit = {}
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isFormData = options.body instanceof FormData;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
      credentials: "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error("Unable to reach the API server. Please try again.");
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message = getApiErrorMessage(payload, response.status);
    throw new ApiError(message, response.status);
  }

  return responseSchema.parse(payload);
}

export function getApiErrorMessage(payload: unknown, status?: number) {
  if (status && status >= 500) {
    return "Something went wrong. Please try again.";
  }

  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return "Request failed";
  }

  const { message } = payload;
  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    const messages = message.filter(
      (item): item is string => typeof item === "string"
    );
    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  return "Request failed";
}
