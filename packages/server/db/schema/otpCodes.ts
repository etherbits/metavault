import type { SQL } from "bun";

export async function createOtpCodesTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      otp_code_expiration_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;
}
