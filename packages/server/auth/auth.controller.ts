import { Router } from "express";
import { validateMiddleware } from "../middleware/validation";
import {
  resendVerificationSchema,
  signInSchema,
  signUpSchema,
  verifyUserSchema,
} from "../user/user.validation";
import { authMiddleware } from "../middleware/isAuth";
import { AuthService } from "./auth.service";

const authRouter = Router();

authRouter.post(
  "/sign-up",
  validateMiddleware(signUpSchema),
  AuthService.signUp
);
authRouter.post(
  "/sign-in",
  validateMiddleware(signInSchema),
  AuthService.signIn
);
authRouter.post(
  "/verify-user",
  validateMiddleware(verifyUserSchema),
  AuthService.verifyUser
);
authRouter.post(
  "/resend-verification-code",
  validateMiddleware(resendVerificationSchema),
  AuthService.resendVerificationCode
);
authRouter.post("/logout", authMiddleware, (_req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60,
  });
  res.json({ message: "Logged out successfully" });
});

export default authRouter;
