const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3435";

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(options.body),
  });

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
