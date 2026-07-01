import { parsedEnv } from "../env";

export const authCookieOptions = {
  httpOnly: true,
  secure: parsedEnv.AUTH_COOKIE_SECURE ?? parsedEnv.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60,
};

export const authCookieClearOptions = {
  httpOnly: authCookieOptions.httpOnly,
  secure: authCookieOptions.secure,
  sameSite: authCookieOptions.sameSite,
};
