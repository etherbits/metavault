import crypto from "node:crypto";
import { sql } from "../db";

const OTP_EXPIRY_MINUTES = 3;

class AuthModel {
  async createOTP(userId: string, otpCode: string) {
    const expiryDate = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await sql`
      INSERT INTO otp_codes (id, user_id, otp_code, otp_code_expiration_date)
      VALUES (${crypto.randomUUID()}, ${userId}, ${otpCode}, ${expiryDate.toISOString()})
    `;
  }

  async getValidOTP(userId: string, otpCode: string) {
    const result = await sql`
      SELECT * FROM otp_codes
      WHERE user_id = ${userId}
      AND otp_code = ${otpCode}
      AND otp_code_expiration_date > ${new Date().toISOString()}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return result[0] || null;
  }

  async deleteOTP(userId: string) {
    await sql`
      DELETE FROM otp_codes WHERE user_id = ${userId}
    `;
  }
}

export const authModel = new AuthModel();
