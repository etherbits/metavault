import { Router } from "express";
import { UserService } from "./user.service";
import { validateParamsMiddleware } from "../middleware/validation";
import { userIdSchema } from "./user.validation";

const userRouter = Router();

userRouter.get("/", UserService.getUsers);
userRouter.get(
  "/:id",
  validateParamsMiddleware(userIdSchema),
  UserService.getUserById
);
userRouter.delete(
  "/:id",
  validateParamsMiddleware(userIdSchema),
  UserService.deleteUserById
);

export default userRouter;
