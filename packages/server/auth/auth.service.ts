import "dotenv/config";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { emailService } from "../email/email.service";
import { parsedEnv } from "../env";
import { logger } from "../logger";
import { userModel, type User } from "../user/user.model";
import type {
  ResendVerificationInput,
  SignInInput,
  SignUpInput,
  VerifyUserInput,
} from "../user/user.schema";
import { err, ok, type Result } from "../utils/result";
import { authModel } from "./auth.model";

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
  return jwt.sign({ userId }, parsedEnv.JWT_SECRET, { expiresIn: "1h" });
}

export class AuthService {
  async signUp(input: SignUpInput): Promise<Result<{ message: string }>> {
    const { email, username, password } = input;

    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      return err(400, "User already exists");
    }

    const existingUsername = await userModel.getUserByUsername(username);
    if (existingUsername) {
      return err(400, "Username already taken");
    }

    const passwordHash = await hashPassword(password);

    let user: User;
    try {
      user = await userModel.createUser({
        email,
        username,
        password_hash: passwordHash,
      });
    } catch (error) {
      const maybeSqliteError = error as { code?: string; message?: string };
      if (
        maybeSqliteError.code === "SQLITE_CONSTRAINT_UNIQUE" ||
        maybeSqliteError.message?.includes("UNIQUE constraint failed")
      ) {
        if (maybeSqliteError.message?.includes("users.username")) {
          return err(400, "Username already taken");
        }

        if (maybeSqliteError.message?.includes("users.email")) {
          return err(400, "User already exists");
        }

        return err(400, "User already exists");
      }

      throw error;
    }

    const otpCode = generateOTP();
    await authModel.createOTP(user.id, otpCode);

    await emailService.sendOtpCode(email, otpCode);

    logger.info(`User signed up: ${email}`);
    return ok({
      message:
        "User created successfully. Please check your email for verification code.",
    });
  }

  async signIn(input: SignInInput): Promise<
    Result<{
      token: string;
      message: string;
      user: {
        id: string;
        email: string;
        username: string;
      };
    }>
  > {
    const { username, password } = input;

    const user = await userModel.getUserByUsername(username);
    if (!user) {
      return err(401, "Invalid credentials");
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return err(401, "Invalid credentials");
    }

    if (!user.is_verified) {
      return err(403, "Please verify your email first");
    }

    const token = generateJWT(user.id);

    logger.info(`User signed in: ${user.email}`);
    return ok({
      message: "Sign in successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  }

  async verifyUser(
    input: VerifyUserInput
  ): Promise<Result<{ message: string }>> {
    const { email, otpCode } = input;

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return err(404, "User not found");
    }

    if (user.is_verified) {
      return err(400, "User already verified");
    }

    const otp = await authModel.getValidOTP(user.id, otpCode);
    if (!otp) {
      return err(400, "Invalid or expired OTP code");
    }

    await userModel.verifyUser(user.id);

    await authModel.deleteOTP(user.id);

    await emailService.sendWelcomeEmail(email);

    logger.info(`User verified: ${email}`);
    return ok({ message: "Account verified successfully" });
  }

  async resendVerificationCode(
    input: ResendVerificationInput
  ): Promise<Result<{ message: string }>> {
    const { email } = input;

    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return err(404, "User not found");
    }
    if (user.is_verified) {
      return err(400, "User already verified");
    }

    await authModel.deleteOTP(user.id);
    const otpCode = generateOTP();
    await authModel.createOTP(user.id, otpCode);

    await emailService.sendOtpCode(email, otpCode);

    logger.info(`Verification code resent: ${email}`);
    return ok({ message: "Verification code sent to your email" });
  }
}

export const authService = new AuthService();
