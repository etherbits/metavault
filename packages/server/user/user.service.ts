import crypto from "node:crypto";
import { authModel } from "../auth/auth.model";
import { emailService } from "../email/email.service";
import { parsedEnv } from "../env";
import { logger } from "../logger";
import {
  InvalidImageError,
  processAndSaveAvatar,
} from "../storage/image.service";
import { deleteUserMediaDir } from "../storage/storage.service";
import { err, ok, type Result } from "../utils/result";
import type {
  PasswordResetEmailConfirmInput,
  PasswordResetEmailRequestInput,
  PasswordResetConfirmInput,
  UpdateProfileInput,
} from "./user.schema";
import type { User } from "./user.model";
import { userModel } from "./user.model";

export type PublicUser = Omit<User, "password_hash">;

function toPublicUser({
  password_hash: _passwordHash,
  ...user
}: User): PublicUser {
  return user;
}

function generateOTP(): string {
  if (parsedEnv.NODE_ENV === "test") {
    return "123456";
  }

  const otp = crypto.randomInt(0, 1000000);
  return otp.toString().padStart(6, "0");
}

function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "argon2id",
  });
}

class UserService {
  async getUsers(): Promise<Result<User[]>> {
    const users = await userModel.getUsers();
    return ok(users);
  }

  async getUserById(id: string): Promise<Result<User>> {
    const user = await userModel.getUserById(id);

    if (!user) {
      return err(404, "User not found");
    }

    return ok(user);
  }

  async getProfile(id: string): Promise<Result<PublicUser>> {
    const user = await userModel.getUserById(id);

    if (!user) {
      return err(404, "User not found");
    }

    return ok(toPublicUser(user));
  }

  async updateProfile(
    id: string,
    input: UpdateProfileInput
  ): Promise<Result<PublicUser>> {
    const existing = await userModel.getUserByUsername(input.username);
    if (existing && existing.id !== id) {
      return err(409, "Username is already taken");
    }

    const user = await userModel.updateUser(id, { username: input.username });
    if (!user) {
      return err(404, "User not found");
    }

    return ok(toPublicUser(user));
  }

  async updateAvatar(
    id: string,
    imageBuffer?: Buffer
  ): Promise<Result<PublicUser>> {
    if (!imageBuffer) {
      return err(400, "Profile image is required");
    }

    const current = await userModel.getUserById(id);
    if (!current) {
      return err(404, "User not found");
    }

    let avatarUrl: string;
    try {
      avatarUrl = await processAndSaveAvatar(imageBuffer, id);
    } catch (error) {
      if (error instanceof InvalidImageError) {
        return err(400, "Unsupported image file");
      }

      throw error;
    }

    const user = await userModel.updateUser(id, { avatar_url: avatarUrl });
    if (!user) {
      return err(404, "User not found");
    }

    return ok(toPublicUser(user));
  }

  async requestPasswordResetByEmail(
    input: PasswordResetEmailRequestInput
  ): Promise<Result<{ message: string }>> {
    const user = await userModel.getUserByEmail(input.email);
    if (!user) {
      logger.warn(
        { email: input.email },
        "Password reset requested for unknown email"
      );
      return ok({ message: "Password reset code sent to your email" });
    }

    return this.sendPasswordResetCode(user);
  }

  async confirmPasswordResetByEmail(
    input: PasswordResetEmailConfirmInput
  ): Promise<Result<{ message: string }>> {
    const user = await userModel.getUserByEmail(input.email);
    if (!user) {
      logger.warn(
        { email: input.email },
        "Password reset confirmation attempted for unknown email"
      );
      return err(400, "Invalid or expired OTP code");
    }

    return this.updatePasswordWithOtp(user.id, input);
  }

  private async sendPasswordResetCode(
    user: Pick<User, "id" | "email">
  ): Promise<Result<{ message: string }>> {
    await authModel.deleteOTP(user.id);
    const otpCode = generateOTP();
    await authModel.createOTP(user.id, otpCode);
    await emailService.sendPasswordResetCode(user.email, otpCode);

    return ok({ message: "Password reset code sent to your email" });
  }

  private async updatePasswordWithOtp(
    userId: string,
    input: PasswordResetConfirmInput
  ): Promise<Result<{ message: string }>> {
    const otp = await authModel.getValidOTP(userId, input.otpCode);
    if (!otp) {
      return err(400, "Invalid or expired OTP code");
    }

    const passwordHash = await hashPassword(input.password);
    await userModel.updateUser(userId, { password_hash: passwordHash });
    await authModel.deleteOTP(userId);

    return ok({ message: "Password updated successfully" });
  }

  async deleteUserById(id: string): Promise<Result<{ message: string }>> {
    const deleted = await userModel.deleteUser(id);

    if (!deleted) {
      return err(404, "User not found");
    }

    await deleteUserMediaDir(id);
    logger.info(`User deleted: ${id}`);
    return ok({ message: "User deleted successfully" });
  }
}

export const userService = new UserService();
