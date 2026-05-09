import { Router } from "express";
import { authMiddleware } from "../middleware/isAuth";
import { UserModel } from "./user.model";

const userRouter = Router();

userRouter.get("/profile", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await UserModel.getUserById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    is_verified: user.is_verified,
  });
});

export default userRouter;
