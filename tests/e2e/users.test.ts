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

test("POST /users/profile/avatar rejects invalid image uploads", async ({
  request,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const username = `badav_${suffix}`;
  const email = `avatar-invalid-${suffix}@test.local`;

  await createVerifiedUser(request, username, email);
  await signIn(request, username);

  const response = await request.post("/users/profile/avatar", {
    multipart: {
      image: {
        name: "avatar.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("not an image"),
      },
    },
  });

  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ message: "Unsupported image file" });
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

test("DELETE /users/profile deletes an account with owned data", async ({
  request,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const username = `delown_${suffix}`;
  const email = `delete-owned-${suffix}@test.local`;

  await createVerifiedUser(request, username, email);
  await signIn(request, username);

  const entryResponse = await request.post("/library", {
    multipart: {
      title: `Delete Owned Entry ${suffix}`,
      media_type: "movie",
      status: "planning",
    },
  });
  expect(entryResponse.status()).toBe(201);
  const entry = (await entryResponse.json()) as { id: string };

  const collectionResponse = await request.post("/collections", {
    data: {
      name: `Delete Owned Collection ${suffix}`,
      entries: [{ library_entry_id: entry.id }],
    },
  });
  expect(collectionResponse.status()).toBe(201);

  const alias = `delete-owned-${suffix}`;
  const aliasResponse = await request.put(`/aliases/${alias}`, {
    data: {
      alias,
      expansion: "personal_rating:>7",
    },
  });
  expect(aliasResponse.ok()).toBeTruthy();

  const response = await request.delete("/users/profile");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({
    message: "User deleted successfully",
  });

  const profileResponse = await request.get("/users/profile");
  expect(profileResponse.status()).toBe(401);
});
