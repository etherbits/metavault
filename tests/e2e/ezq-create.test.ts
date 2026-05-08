import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";
import { TEST_AUTH_USER_ID } from "../test-user";

test("POST /ezq rejects unauthenticated requests", async ({ request }) => {
  const response = await request.post("/ezq", {
    data: { query: "/s" },
  });

  expect(response.status()).toBe(401);
});

test("POST /ezq /create returns the new entry with its tags", async ({
  request,
}) => {
  await signIn(request);
  const title = "create test entry";
  const tag = "e2e-create";

  const response = await request.post("/ezq", {
    data: {
      query: `/create ${title.replace(/ /g, "_")} tg:${tag}`,
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.rows).toHaveLength(1);
  const entry = body.rows[0];
  expect(entry).toMatchObject({ title, user_id: TEST_AUTH_USER_ID });
  expect(typeof entry.id).toBe("string");
  expect(entry.tags).toEqual([
    expect.objectContaining({ value: tag, weight: "major" }),
  ]);
});
