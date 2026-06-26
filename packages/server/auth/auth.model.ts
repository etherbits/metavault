import crypto from "node:crypto";
import { sql } from "../db";
import { parsedEnv } from "../env";

const OTP_EXPIRY_MINUTES = 3;
const OTP_HASH_PREFIX = "sha256:";

type OtpRow = {
  otp_code: string;
};

function hashOtp(userId: string, otpCode: string) {
  return `${OTP_HASH_PREFIX}${crypto
    .createHmac("sha256", parsedEnv.JWT_SECRET)
    .update(`${userId}:${otpCode}`)
    .digest("hex")}`;
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

class AuthModel {
  async createOTP(userId: string, otpCode: string) {
    const expiryDate = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await sql`
      INSERT INTO otp_codes (id, user_id, otp_code, otp_code_expiration_date)
      VALUES (${crypto.randomUUID()}, ${userId}, ${hashOtp(userId, otpCode)}, ${expiryDate.toISOString()})
    `;
  }

  async getValidOTP(userId: string, otpCode: string) {
    const rows = (await sql`
      SELECT * FROM otp_codes
      WHERE user_id = ${userId}
      AND otp_code_expiration_date > ${new Date().toISOString()}
      ORDER BY created_at DESC
    `) as OtpRow[];

    return (
      rows.find((row) => {
        const storedOtp = row.otp_code;
        if (typeof storedOtp !== "string") return false;

        const expectedOtp = storedOtp.startsWith(OTP_HASH_PREFIX)
          ? hashOtp(userId, otpCode)
          : otpCode;

        return constantTimeEqual(storedOtp, expectedOtp);
      }) ?? null
    );
  }

  async deleteOTP(userId: string) {
    await sql`
      DELETE FROM otp_codes WHERE user_id = ${userId}
    `;
  }
}

export const authModel = new AuthModel();
