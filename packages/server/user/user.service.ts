import { logger } from "../logger";
import { deleteUserMediaDir } from "../storage/storage.service";
import { err, ok, type Result } from "../utils/result";
import type { User } from "./user.model";
import { userModel } from "./user.model";

export type PublicUser = Omit<User, "password_hash">;

function toPublicUser({
  password_hash: _passwordHash,
  ...user
}: User): PublicUser {
  return user;
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
