import { expect, test } from "@playwright/test";
import { getLatestOtp, signIn } from "../helpers/auth";

test("common API flow registers, manages EZQ content, and logs out", async ({
  request,
}) => {
  const email = "core-user@test.local";
  const username = "core_user";
  const password = "Password123";

  const signUpResponse = await request.post("/auth/sign-up", {
    data: {
      email,
      username,
      password,
      confirmPassword: password,
    },
  });
  expect(signUpResponse.ok()).toBeTruthy();

  const otpCode = await getLatestOtp(email);
  expect(otpCode).toBeDefined();

  const verifyResponse = await request.post("/auth/verify-user", {
    data: { email, otpCode },
  });
  expect(verifyResponse.ok()).toBeTruthy();

  await signIn(request, username, password);

  const firstTitle = "core first entry";
  const secondTitle = "core second entry";
  const firstTag = "core-first";
  const secondTag = "core-second";

  const firstCreate = await request.post("/ezq", {
    data: {
      query: `/create ${firstTitle.replace(/ /g, "_")} tg:${firstTag}`,
    },
  });
  expect(firstCreate.ok()).toBeTruthy();
  const first = (await firstCreate.json()).rows[0] as { id: string };

  const secondCreate = await request.post("/ezq", {
    data: {
      query: `/create ${secondTitle.replace(/ /g, "_")} tg:${secondTag}`,
    },
  });
  expect(secondCreate.ok()).toBeTruthy();
  const second = (await secondCreate.json()).rows[0] as { id: string };

  const updateResponse = await request.post("/ezq", {
    data: { query: `/update id:${first.id} > status:finished` },
  });
  expect(updateResponse.ok()).toBeTruthy();

  const searchResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(searchResponse.ok()).toBeTruthy();
  const searchRows = (await searchResponse.json()).rows as Array<{
    id: string;
    title: string;
    status: string | null;
  }>;

  expect(searchRows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: first.id,
        title: firstTitle,
        status: "finished",
      }),
      expect.objectContaining({ id: second.id, title: secondTitle }),
    ])
  );

  const deleteResponse = await request.post("/ezq", {
    data: { query: `/delete id:${first.id}` },
  });
  expect(deleteResponse.ok()).toBeTruthy();

  const finalSearchResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(finalSearchResponse.ok()).toBeTruthy();
  const finalRows = (await finalSearchResponse.json()).rows as Array<{
    id: string;
  }>;
  const finalIds = finalRows.map((row) => row.id);

  expect(finalIds).not.toContain(first.id);
  expect(finalIds).toContain(second.id);

  const logoutResponse = await request.post("/auth/logout");
  expect(logoutResponse.ok()).toBeTruthy();

  const rejectedResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(rejectedResponse.status()).toBe(401);
});
