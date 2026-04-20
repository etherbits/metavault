import { Router } from "express";
import { validateMiddleware } from "../middleware/validation";
import {
  resendVerificationSchema,
  signInSchema,
  signUpSchema,
  verifyUserSchema,
} from "../user/user.validation";
import { AuthService } from "./auth.service";

const authRouter = Router();

authRouter.post(
  "/sign-up",
  validateMiddleware(signUpSchema),
  AuthService.signUp,
);
authRouter.post(
  "/sign-in",
  validateMiddleware(signInSchema),
  AuthService.signIn,
);
authRouter.post(
  "/verify-user",
  validateMiddleware(verifyUserSchema),
  AuthService.verifyUser,
);
authRouter.post(
  "/resend-verification-code",
  validateMiddleware(resendVerificationSchema),
  AuthService.resendVerificationCode,
);

export default authRouter;
