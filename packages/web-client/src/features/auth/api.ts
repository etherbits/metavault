import { apiRequest } from "@/shared/api/client";
import {
  authApiResponseSchema,
  logoutResponseSchema,
  type PasswordResetEmailConfirmInput,
  passwordResetEmailConfirmSchema,
  type PasswordResetEmailRequestInput,
  passwordResetEmailRequestSchema,
  type PublicUserProfile,
  publicUserProfileSchema,
  type ResendVerificationInput,
  resendVerificationSchema,
  type SignInInput,
  type SignUpInput,
  signInSchema,
  signUpSchema,
  type UpdateProfileInput,
  updateProfileSchema,
  type VerifyUserInput,
  verifyUserSchema,
} from "../../../../server/user/user.schema";

export type ProfileUser = PublicUserProfile;

export async function signUp(payload: SignUpInput) {
  const body = signUpSchema.parse(payload);
  return apiRequest("/auth/sign-up", authApiResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function signIn(payload: SignInInput) {
  const body = signInSchema.parse(payload);
  return apiRequest("/auth/sign-in", authApiResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getProfile() {
  return apiRequest("/users/profile", publicUserProfileSchema);
}

export async function updateProfile(payload: UpdateProfileInput) {
  const body = updateProfileSchema.parse(payload);
  return apiRequest("/users/profile", publicUserProfileSchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updateProfileAvatar(file: File) {
  const body = new FormData();
  body.append("image", file);

  return apiRequest("/users/profile/avatar", publicUserProfileSchema, {
    method: "POST",
    body,
  });
}

export async function requestPasswordReset(
  payload: PasswordResetEmailRequestInput
) {
  const body = passwordResetEmailRequestSchema.parse(payload);
  return apiRequest("/auth/password-reset/request", logoutResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function confirmPasswordReset(
  payload: PasswordResetEmailConfirmInput
) {
  const body = passwordResetEmailConfirmSchema.parse(payload);
  return apiRequest("/auth/password-reset/confirm", logoutResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteProfile() {
  return apiRequest("/users/profile", logoutResponseSchema, {
    method: "DELETE",
  });
}

export async function logout() {
  return apiRequest("/auth/logout", logoutResponseSchema, {
    method: "POST",
  });
}

export async function verifyUser(payload: VerifyUserInput) {
  const body = verifyUserSchema.parse(payload);
  return apiRequest("/auth/verify-user", authApiResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function resendVerificationCode(payload: ResendVerificationInput) {
  const body = resendVerificationSchema.parse(payload);
  return apiRequest("/auth/resend-verification-code", authApiResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
