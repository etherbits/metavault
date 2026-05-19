import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";
import { TEST_AUTH_USER_ID } from "../test-user";

test("GET /users/profile rejects unauthenticated requests", async ({
  request,
}) => {
  const response = await request.get("/users/profile");

  expect(response.status()).toBe(401);
});

test("GET /users/profile returns the authenticated user", async ({
  request,
}) => {
  await signIn(request);
  const response = await request.get("/users/profile");

  expect(response.ok()).toBeTruthy();
  const user = await response.json();
  expect(user).toMatchObject({
    id: TEST_AUTH_USER_ID,
    username: "e2e-auth",
    email: "e2e-auth@test.local",
  });
  expect(user.password_hash).toBeUndefined();
});
