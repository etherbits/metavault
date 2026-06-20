import { parsedEnv } from "../env";

export const authCookieOptions = {
  httpOnly: true,
  secure: parsedEnv.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60 * 24,
};
