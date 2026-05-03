import { expect, test } from "@playwright/test";
import { TEST_USER_ID } from "../test-user";

test("POST /ezq /create returns the new entry with its tags", async ({
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = `create test ${suffix}`;
  const tag = `e2e-create-${suffix}`;

  const response = await request.post("/ezq", {
    data: {
      query: `/create ${title.replace(/ /g, "_")} tg:${tag}`,
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.rows).toHaveLength(1);
  const entry = body.rows[0];
  expect(entry).toMatchObject({ title, user_id: TEST_USER_ID });
  expect(typeof entry.id).toBe("string");
  expect(entry.tags).toEqual([
    expect.objectContaining({ value: tag, weight: "major" }),
  ]);
});
