import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import type { Request, Response } from "express";
import { UserModel } from "../user/user.model";
import { EmailService } from "../email/email.service";
import { sql } from "../db";
import { logger } from "../logger";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const OTP_EXPIRY_MINUTES = 3;

function generateOTP(): string {
  const otp = crypto.randomInt(0, 1000000);
  return otp.toString().padStart(6, "0");
}

function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "argon2id",
  });
}

function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

function generateJWT(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

async function createOTP(userId: string, otpCode: string) {
  const expiryDate = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO otp_codes (id, user_id, otp_code, otp_code_expiration_date)
    VALUES (${crypto.randomUUID()}, ${userId}, ${otpCode}, ${expiryDate.toISOString()})
  `;
}

async function getValidOTP(userId: string, otpCode: string) {
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

async function deleteOTP(userId: string) {
  await sql`
    DELETE FROM otp_codes WHERE user_id = ${userId}
  `;
}

async function signUp(req: Request, res: Response) {
  try {
    const { email, username, password } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await UserModel.createUser({
      email,
      username,
      password_hash: passwordHash,
    });

    // Generate and store OTP
    const otpCode = generateOTP();
    await createOTP(user.id, otpCode);

    // Send verification email
    await EmailService.sendOtpCode(email, otpCode);

    logger.info(`User signed up: ${email}`);
    res.json({
      message:
        "User created successfully. Please check your email for verification code.",
    });
  } catch (error) {
    logger.error("Sign up error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function signIn(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    const user = await UserModel.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if verified
    if (!user.is_verified) {
      return res
        .status(403)
        .json({ message: "Please verify your email first" });
    }

    // Generate JWT
    const token = generateJWT(user.id);

    // Set cookie
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60,
    });

    logger.info(`User signed in: ${user.email}`);
    res.json({
      message: "Sign in successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    logger.error("Sign in error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function verifyUser(req: Request, res: Response) {
  try {
    const { email, otpCode } = req.body;

    // Find user
    const user = await UserModel.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.is_verified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Find valid OTP
    const otp = await getValidOTP(user.id, otpCode);
    if (!otp) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    // Verify user
    await UserModel.verifyUser(user.id);

    // Delete OTP
    await deleteOTP(user.id);

    // Send welcome email
    await EmailService.sendWelcomeEmail(email);

    logger.info(`User verified: ${email}`);
    res.json({ message: "Account verified successfully" });
  } catch (error) {
    logger.error("Verify user error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function resendVerificationCode(req: Request, res: Response) {
  try {
    const { email } = req.body;

    const user = await UserModel.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.is_verified) {
      return res.status(400).json({ message: "User already verified" });
    }

    await deleteOTP(user.id);
    const otpCode = generateOTP();
    await createOTP(user.id, otpCode);

    await EmailService.sendOtpCode(email, otpCode);

    logger.info(`Verification code resent: ${email}`);
    res.json({ message: "Verification code sent to your email" });
  } catch (error) {
    logger.error("Resend verification error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const AuthService = {
  signUp,
  signIn,
  verifyUser,
  resendVerificationCode,
};
