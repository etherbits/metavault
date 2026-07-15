import { parsedEnv } from "../env";
import { AUTH_SESSION_DURATION_SECONDS } from "./auth.constants";

export const authCookieOptions = {
  httpOnly: true,
  secure: parsedEnv.AUTH_COOKIE_SECURE ?? parsedEnv.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: AUTH_SESSION_DURATION_SECONDS * 1000,
};

export const authCookieClearOptions = {
  httpOnly: authCookieOptions.httpOnly,
  secure: authCookieOptions.secure,
  sameSite: authCookieOptions.sameSite,
};
