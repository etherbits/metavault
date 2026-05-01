const rawApiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3435";
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

type RequestOptions = {
  method: "POST";
  body: Record<string, unknown>;
};

type ApiSuccessResponse = {
  message?: string;
  user?: {
    id: string;
    email: string;
    username: string;
  };
};

async function request(path: string, options: RequestOptions): Promise<ApiSuccessResponse> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(options.body),
    });
  } catch {
    throw new Error(
      `Cannot reach API server at ${API_BASE_URL}. Make sure backend is running.`
    );
  }

  const data = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed");
  }

  return (data ?? {}) as ApiSuccessResponse;
}

export function signUp(payload: {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}) {
  return request("/auth/sign-up", { method: "POST", body: payload });
}

export function signIn(payload: { username: string; password: string }) {
  return request("/auth/sign-in", { method: "POST", body: payload });
}

export function verifyUser(payload: { email: string; otpCode: string }) {
  return request("/auth/verify-user", { method: "POST", body: payload });
}

export function resendVerificationCode(payload: { email: string }) {
  return request("/auth/resend-verification-code", {
    method: "POST",
    body: payload,
  });
}

export const AUTH_STORAGE_KEY = "metavault.authenticated";
export const AUTH_USER_STORAGE_KEY = "metavault.auth.user";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
};
