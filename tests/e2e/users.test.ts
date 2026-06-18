import { expect, test } from "@playwright/test";
import { createVerifiedUser, signIn } from "../helpers/auth";
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
    avatar_url: null,
  });
  expect(user.password_hash).toBeUndefined();
});

test("PATCH /users/profile updates username", async ({ request }) => {
  const suffix = Date.now().toString(36);
  const username = `prof_${suffix}`;
  const email = `profile-${suffix}@test.local`;
  const nextUsername = `prof_next_${suffix}`;
  const duplicateUsername = `dupe_${suffix}`;

  await createVerifiedUser(
    request,
    duplicateUsername,
    `dupe-${suffix}@test.local`
  );
  await createVerifiedUser(request, username, email);
  await signIn(request, username);

  const response = await request.patch("/users/profile", {
    data: { username: nextUsername },
  });

  expect(response.ok()).toBeTruthy();
  const user = await response.json();
  expect(user).toMatchObject({
    username: nextUsername,
    email,
  });
  expect(user.password_hash).toBeUndefined();

  const duplicateResponse = await request.patch("/users/profile", {
    data: { username: duplicateUsername },
  });
  expect(duplicateResponse.status()).toBe(409);
});

test("POST /users/profile/avatar stores a profile image", async ({
  request,
}) => {
  const suffix = Date.now().toString(36);
  const username = `avatar_${suffix}`;
  const email = `avatar-${suffix}@test.local`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  );

  await createVerifiedUser(request, username, email);
  await signIn(request, username);

  const response = await request.post("/users/profile/avatar", {
    multipart: {
      image: {
        name: "avatar.png",
        mimeType: "image/png",
        buffer: png,
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  const user = await response.json();
  expect(user.avatar_url).toMatch(/^\/media\/users\/.+\/profile\/avatar\.webp/);
});

test("DELETE /users/profile deletes the authenticated account", async ({
  request,
}) => {
  const suffix = Date.now().toString(36);
  const username = `delete_${suffix}`;
  const email = `delete-${suffix}@test.local`;

  await createVerifiedUser(request, username, email);
  await signIn(request, username);

  const response = await request.delete("/users/profile");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({
    message: "User deleted successfully",
  });

  const profileResponse = await request.get("/users/profile");
  expect(profileResponse.status()).toBe(401);
});
