import type { z } from "zod";

const rawApiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3435";
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
    throw new Error(
      `Cannot reach API server at ${API_BASE_URL}. Make sure backend is running.`
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Request failed";
    throw new ApiError(message, response.status);
  }

  return responseSchema.parse(payload);
}
