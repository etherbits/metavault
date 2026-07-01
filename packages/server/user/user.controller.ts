import { Router } from "express";
import { authCookieClearOptions } from "../auth/auth.cookies";
import { imageUpload } from "../middleware/upload";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import { updateProfileSchema } from "./user.schema";
import { userService } from "./user.service";

const userRouter = Router()
  .get(
    "/profile",
    ...validatedRoute({ auth: true }, async (req, res) => {
      const result = await userService.getProfile(req.user.userId);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .patch(
    "/profile",
    ...validatedRoute(
      { auth: true, body: updateProfileSchema },
      async (req, res) => {
        const result = await userService.updateProfile(
          req.user.userId,
          req.body
        );
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .post(
    "/profile/avatar",
    ...validatedRoute(
      { auth: true, middleware: [imageUpload.single("image")] },
      async (req, res) => {
        const result = await userService.updateAvatar(
          req.user.userId,
          req.file?.buffer
        );
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .delete(
    "/profile",
    ...validatedRoute({ auth: true }, async (req, res) => {
      const result = await userService.deleteUserById(req.user.userId);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      res.clearCookie("access_token", authCookieClearOptions);
      return res.json(result.data);
    })
  );

export default userRouter;
