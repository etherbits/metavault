import nodemailer from "nodemailer";
import "dotenv/config";
import { parsedEnv } from "../env";

const transporter =
  parsedEnv.NODE_ENV === "test"
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: parsedEnv.EMAIL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: parsedEnv.EMAIL_USER,
          pass: parsedEnv.EMAIL_PASS,
        },
      });

class EmailService {
  async sendOtpCode(to: string, otpCode: string) {
    return transporter.sendMail({
      from: parsedEnv.EMAIL_FROM,
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
}

export const emailService = new EmailService();
