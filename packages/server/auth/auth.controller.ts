import { Router } from "express";
import { parsedEnv } from "../env";
import { rateLimit } from "../middleware/rateLimit";
import { validatedRoute } from "../middleware/validation";
import {
  passwordResetEmailConfirmSchema,
  passwordResetEmailRequestSchema,
  resendVerificationSchema,
  signInSchema,
  signUpSchema,
  verifyUserSchema,
} from "../user/user.schema";
import { userService } from "../user/user.service";
import { sendServiceError } from "../utils/http";
import { authService } from "./auth.service";

const authCookieOptions = {
  httpOnly: true,
  secure: parsedEnv.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60 * 24,
};

const authRouter = Router()
  .use(
    rateLimit({
      windowMs: parsedEnv.RATE_LIMIT_WINDOW_MS,
      max: parsedEnv.AUTH_RATE_LIMIT_MAX,
    })
  )
  .post(
    "/sign-up",
    ...validatedRoute({ body: signUpSchema }, async (req, res) => {
      const result = await authService.signUp(req.body);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .post(
    "/sign-in",
    ...validatedRoute({ body: signInSchema }, async (req, res) => {
      const result = await authService.signIn(req.body);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      res.cookie("access_token", result.data.token, authCookieOptions);
      return res.json({
        message: result.data.message,
        user: result.data.user,
      });
    })
  )
  .post(
    "/verify-user",
    ...validatedRoute({ body: verifyUserSchema }, async (req, res) => {
      const result = await authService.verifyUser(req.body);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .post(
    "/resend-verification-code",
    ...validatedRoute({ body: resendVerificationSchema }, async (req, res) => {
      const result = await authService.resendVerificationCode(req.body);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .post(
    "/password-reset/request",
    ...validatedRoute(
      { body: passwordResetEmailRequestSchema },
      async (req, res) => {
        const result = await userService.requestPasswordResetByEmail(req.body);
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .post(
    "/password-reset/confirm",
    ...validatedRoute(
      { body: passwordResetEmailConfirmSchema },
      async (req, res) => {
        const result = await userService.confirmPasswordResetByEmail(req.body);
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .post(
    "/logout",
    ...validatedRoute({ auth: true }, async (_req, res) => {
      res.clearCookie("access_token", authCookieOptions);
      return res.json({ message: "Logged out successfully" });
    })
  );

export default authRouter;
