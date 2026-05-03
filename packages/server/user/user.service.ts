import type { Request, Response } from "express";
import { UserModel } from "./user.model";
import { deleteUserMediaDir } from "../storage/storage.service";
import { logger } from "../logger";

async function getUsers(req: Request, res: Response) {
  try {
    const users = await UserModel.getUsers();
    res.json(users);
  } catch (error) {
    logger.error("Get users error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getUserById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const user = await UserModel.getUserById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    logger.error("Get user by id error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteUserById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const deleted = await UserModel.deleteUser(id);

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    await deleteUserMediaDir(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Delete user error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const UserService = {
  getUsers,
  getUserById,
  deleteUserById,
};
