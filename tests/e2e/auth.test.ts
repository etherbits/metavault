import { expect, test } from "@playwright/test";
import { createVerifiedUser, getLatestOtp, signIn } from "../helpers/auth";
import { WEB_BASE_URL } from "../helpers/queryPage";
import {
  TEST_AUTH_PASSWORD,
  TEST_AUTH_USERNAME,
  TEST_UNVERIFIED_EMAIL,
  TEST_UNVERIFIED_OTP,
} from "../test-user";

test("auth sign-up creates an unverified user", async ({ request }) => {
  const response = await request.post("/auth/sign-up", {
    data: {
      email: "signup-user@test.local",
      username: "signup_user",
      password: "Password123",
      confirmPassword: "Password123",
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({
    message:
      "User created successfully. Please check your email for verification code.",
  });
});

test("auth sign-up rejects duplicate usernames cleanly", async ({
  request,
}) => {
  const suffix = Date.now().toString(36);
  const username = `signup_dupe_${suffix}`;

  const firstResponse = await request.post("/auth/sign-up", {
    data: {
      email: `signup-dupe-a-${suffix}@test.local`,
      username,
      password: "Password123",
      confirmPassword: "Password123",
    },
  });
  expect(firstResponse.ok()).toBeTruthy();

  const duplicateResponse = await request.post("/auth/sign-up", {
    data: {
      email: `signup-dupe-b-${suffix}@test.local`,
      username,
      password: "Password123",
      confirmPassword: "Password123",
    },
  });

  expect(duplicateResponse.status()).toBe(409);
  expect(await duplicateResponse.json()).toEqual({
    message: "Username is already taken",
  });
});

test("auth sign-in sets the access cookie and returns the user", async ({
  request,
}) => {
  const response = await request.post("/auth/sign-in", {
    data: {
      username: TEST_AUTH_USERNAME,
      password: TEST_AUTH_PASSWORD,
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["set-cookie"]).toContain("access_token=");

  const body = await response.json();
  expect(body).toMatchObject({
    message: "Sign in successful",
    user: {
      email: "e2e-auth@test.local",
      username: TEST_AUTH_USERNAME,
    },
  });
});

test("auth verify-user verifies a pending user", async ({ request }) => {
  const response = await request.post("/auth/verify-user", {
    data: {
      email: TEST_UNVERIFIED_EMAIL,
      otpCode: TEST_UNVERIFIED_OTP,
    },
  });

  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({
    message: "Account verified successfully",
  });
});

test("auth resend-verification-code sends a fresh code", async ({
  request,
}) => {
  const email = "resend-user@test.local";

  const signUpResponse = await request.post("/auth/sign-up", {
    data: {
      email,
      username: "resend_user",
      password: "Password123",
      confirmPassword: "Password123",
    },
  });
  expect(signUpResponse.ok()).toBeTruthy();

  const response = await request.post("/auth/resend-verification-code", {
    data: { email },
  });

  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({
    message: "Verification code sent to your email",
  });
});

test("auth password reset uses email OTP and updates credentials", async ({
  request,
}) => {
  const suffix = Date.now().toString(36);
  const username = `forgot_${suffix}`;
  const email = `forgot-${suffix}@test.local`;
  const nextPassword = "Password456";

  await createVerifiedUser(request, username, email);

  const requestResponse = await request.post("/auth/password-reset/request", {
    data: { email },
  });
  expect(requestResponse.ok()).toBeTruthy();
  expect(await requestResponse.json()).toEqual({
    message: "Password reset code sent to your email",
  });

  const otpCode = await getLatestOtp(email);
  expect(otpCode).toBeTruthy();

  const confirmResponse = await request.post("/auth/password-reset/confirm", {
    data: {
      email,
      otpCode,
      password: nextPassword,
      confirmPassword: nextPassword,
    },
  });
  expect(confirmResponse.ok()).toBeTruthy();

  const oldPasswordResponse = await request.post("/auth/sign-in", {
    data: { username, password: TEST_AUTH_PASSWORD },
  });
  expect(oldPasswordResponse.status()).toBe(401);

  const newPasswordResponse = await request.post("/auth/sign-in", {
    data: { username, password: nextPassword },
  });
  expect(newPasswordResponse.ok()).toBeTruthy();
});

test("auth password reset request does not reveal unknown emails", async ({
  request,
}) => {
  const response = await request.post("/auth/password-reset/request", {
    data: { email: `missing-${Date.now()}@test.local` },
  });

  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({
    message: "Password reset code sent to your email",
  });
});

test("auth password reset confirm does not reveal unknown emails", async ({
  request,
}) => {
  const response = await request.post("/auth/password-reset/confirm", {
    data: {
      email: `missing-confirm-${Date.now()}@test.local`,
      otpCode: "000000",
      password: "Password456",
      confirmPassword: "Password456",
    },
  });

  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({
    message: "Invalid or expired OTP code",
  });
});

test("auth verification resend does not reveal unknown or verified emails", async ({
  request,
}) => {
  const unknownResponse = await request.post("/auth/resend-verification-code", {
    data: { email: `missing-resend-${Date.now()}@test.local` },
  });
  expect(unknownResponse.ok()).toBeTruthy();
  expect(await unknownResponse.json()).toEqual({
    message: "Verification code sent to your email",
  });

  const verifiedResponse = await request.post(
    "/auth/resend-verification-code",
    {
      data: { email: "e2e-auth@test.local" },
    }
  );
  expect(verifiedResponse.ok()).toBeTruthy();
  expect(await verifiedResponse.json()).toEqual({
    message: "Verification code sent to your email",
  });
});

test("forgot password uses a dedicated reset page", async ({ page }) => {
  await page.goto(`${WEB_BASE_URL}/login`);

  await expect(
    page.getByRole("heading", { name: "Log In", exact: true })
  ).toBeVisible();
  await expect(page.getByLabel("Reset password")).toHaveCount(0);

  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(`${WEB_BASE_URL}/forgot-password`);
  await expect(
    page.getByRole("heading", { name: "Reset password" })
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Reset code")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send code" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Back to login" })
  ).toBeVisible();
});

test("auth logout clears the session", async ({ request }) => {
  await signIn(request);

  const response = await request.post("/auth/logout");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ message: "Logged out successfully" });

  const profileResponse = await request.get("/users/profile");
  expect(profileResponse.status()).toBe(401);
});
