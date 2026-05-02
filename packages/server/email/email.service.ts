import nodemailer from "nodemailer";
import "dotenv/config";
import { logger } from "../logger";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT ?? 587),
  secure: false,
  ...(process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? {
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      }
    : {}),
});

async function sendOtpCode(to: string, otpCode: string) {
  try {
    if (!process.env.EMAIL_HOST) {
      logger.warn(
        { to, otpCode },
        "EMAIL_HOST is not configured. OTP email skipped; using logged OTP for development.",
      );
      return;
    }

    await transporter.sendMail({
      from: "Metavault <no-reply@metavault.local>",
      to,
      subject: "Verify your account",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Your OTP code is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #333; margin: 0; letter-spacing: 5px; font-size: 32px;">${otpCode}</h1>
          </div>
          <p>This code will expire in 3 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `.trim(),
    });
  } catch (error) {
    logger.warn(
      { to, otpCode, error: (error as Error).message },
      "Failed to send OTP email. Using logged OTP for development.",
    );
  }
}

async function sendWelcomeEmail(to: string) {
  try {
    if (!process.env.EMAIL_HOST) {
      logger.warn(
        { to },
        "EMAIL_HOST is not configured. Welcome email skipped.",
      );
      return;
    }

    await transporter.sendMail({
      from: "Metavault <no-reply@metavault.local>",
      to,
      subject: "Welcome",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Welcome!</h2>
          <p>Thanks for joining us. We are glad you are here.</p>
        </div>
      `.trim(),
    });
  } catch (error) {
    logger.warn(
      { to, error: (error as Error).message },
      "Failed to send welcome email. Continuing without email delivery.",
    );
  }
}

export const EmailService = {
  sendOtpCode,
  sendWelcomeEmail,
};
