import { execFileSync } from "node:child_process";
import { type APIRequestContext, expect } from "@playwright/test";
import { TEST_AUTH_PASSWORD, TEST_AUTH_USERNAME } from "../test-user";

export async function signIn(
  request: APIRequestContext,
  username = TEST_AUTH_USERNAME,
  password = TEST_AUTH_PASSWORD
) {
  const response = await request.post("/auth/sign-in", {
    data: { username, password },
  });

  expect(response.ok()).toBeTruthy();
  return response;
}

export async function getLatestOtp(email: string) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for E2E OTP lookup");
  }

  const output = execFileSync(
    "bun",
    [
      "-e",
      `
        const { SQL } = await import("bun");
        const sql = new SQL(Bun.argv[1]);
        const rows = await sql\`
          SELECT otp_codes.otp_code
          FROM otp_codes
          JOIN users ON users.id = otp_codes.user_id
          WHERE users.email = \${Bun.argv[2]}
          ORDER BY otp_codes.created_at DESC
          LIMIT 1
        \`;
        console.log(rows[0]?.otp_code ?? "");
      `,
      databaseUrl,
      email,
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  ).trim();

  return output || undefined;
}
