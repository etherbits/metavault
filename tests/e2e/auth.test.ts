import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";
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

test("auth logout clears the session", async ({ request }) => {
  await signIn(request);

  const response = await request.post("/auth/logout");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ message: "Logged out successfully" });

  const profileResponse = await request.get("/users/profile");
  expect(profileResponse.status()).toBe(401);
});
