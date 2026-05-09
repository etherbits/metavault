import nodemailer from "nodemailer";
import "dotenv/config";

const emailPort = Number(process.env.EMAIL_PORT ?? "587");
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number.isNaN(emailPort) ? 587 : emailPort,
  secure: false,
  auth:
    emailUser && emailPass ? { user: emailUser, pass: emailPass } : undefined,
});

async function sendOtpCode(to: string, otpCode: string) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  return transporter.sendMail({
    from: "Metavault",
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

async function sendWelcomeEmail(to: string) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  return transporter.sendMail({
    from: "Metavault",
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

export const EmailService = {
  sendOtpCode,
  sendWelcomeEmail,
};
