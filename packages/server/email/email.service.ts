import nodemailer from "nodemailer";
import "dotenv/config";
import { parsedEnv } from "../env";
import { logger } from "../logger";

type EmailMessage = {
  from?: string;
  to: string;
  subject: string;
  html: string;
};

const isDevelopmentEmail =
  parsedEnv.NODE_ENV !== "production" && !parsedEnv.EMAIL_HOST;
const transporter = isDevelopmentEmail
  ? {
      sendMail(message: EmailMessage) {
        logger.info(
          {
            to: message.to,
            subject: message.subject,
            html: message.html,
          },
          "Development email"
        );

        return Promise.resolve({
          messageId: `dev-${Date.now()}`,
        });
      },
    }
  : nodemailer.createTransport({
      host: parsedEnv.EMAIL_HOST,
      port: parsedEnv.EMAIL_PORT,
      secure: false,
      auth:
        parsedEnv.EMAIL_USER && parsedEnv.EMAIL_PASS
          ? {
              user: parsedEnv.EMAIL_USER,
              pass: parsedEnv.EMAIL_PASS,
            }
          : undefined,
    });

class EmailService {
  async sendOtpCode(to: string, otpCode: string) {
    return transporter.sendMail({
      from: parsedEnv.EMAIL_FROM,
      to,
      subject: "Verify your account",
      html: isDevelopmentEmail
        ? `OTP Code for ${to} is: ${otpCode}`
        : `
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
  }

  async sendWelcomeEmail(to: string) {
    return transporter.sendMail({
      from: parsedEnv.EMAIL_FROM,
      to,
      subject: "Welcome",
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Welcome!</h2>
        <p>Thanks for joining us. We are glad you are here.</p>
      </div>
    `.trim(),
    });
  }

  async sendPasswordResetCode(to: string, otpCode: string) {
    return transporter.sendMail({
      from: parsedEnv.EMAIL_FROM,
      to,
      subject: "Reset your password",
      html: isDevelopmentEmail
        ? `Password reset OTP Code for ${to} is: ${otpCode}`
        : `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Your password reset code is:</p>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #333; margin: 0; letter-spacing: 5px; font-size: 32px;">${otpCode}</h1>
        </div>
        <p>This code will expire in 3 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `.trim(),
    });
  }
}

export const emailService = new EmailService();
