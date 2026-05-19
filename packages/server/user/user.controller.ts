import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import { userService } from "./user.service";

const userRouter = Router().get(
  "/profile",
  ...validatedRoute({ auth: true }, async (req, res) => {
    const result = await userService.getProfile(req.user.userId);
    if (!result.ok) {
      return sendServiceError(res, result.error);
    }

    return res.json(result.data);
  })
);

export default userRouter;
