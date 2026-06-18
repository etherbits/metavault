import { z } from "zod";

export const signUpSchema = z
  .object({
    email: z.email("Invalid email address"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  username: z.string(),
  password: z.string().min(1, "Password is required"),
});

export const verifyUserSchema = z.object({
  email: z.email("Invalid email address"),
  otpCode: z.string().length(6, "OTP code must be 6 digits"),
});

export const resendVerificationSchema = z.object({
  email: z.email("Invalid email address"),
});

export const userIdSchema = z.object({
  id: z.uuid("Invalid user ID"),
});

export const updateProfileSchema = z.object({
  username: signUpSchema.shape.username,
});

export const passwordResetEmailRequestSchema = z.object({
  email: z.email("Invalid email address"),
});

export const passwordResetConfirmSchema = z
  .object({
    otpCode: z.string().length(6, "OTP code must be 6 digits"),
    password: signUpSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const passwordResetEmailConfirmSchema =
  passwordResetConfirmSchema.extend({
    email: z.email("Invalid email address"),
  });

export const publicUserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  avatar_url: z.string().nullable(),
  is_verified: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const authUserSnapshotSchema = publicUserProfileSchema.pick({
  id: true,
  username: true,
  email: true,
});

export const authApiResponseSchema = z.object({
  message: z.string().optional(),
  user: authUserSnapshotSchema.optional(),
});

export const logoutResponseSchema = z.object({
  message: z.string(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type VerifyUserInput = z.infer<typeof verifyUserSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type UserIdParams = z.infer<typeof userIdSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PasswordResetConfirmInput = z.infer<
  typeof passwordResetConfirmSchema
>;
export type PasswordResetEmailRequestInput = z.infer<
  typeof passwordResetEmailRequestSchema
>;
export type PasswordResetEmailConfirmInput = z.infer<
  typeof passwordResetEmailConfirmSchema
>;
export type PublicUserProfile = z.infer<typeof publicUserProfileSchema>;
export type AuthApiResponse = z.infer<typeof authApiResponseSchema>;
