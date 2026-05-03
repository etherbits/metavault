import { expect, test } from "@playwright/test";
import { TEST_USER_ID } from "../test-user";

test("POST /ezq /delete removes matching entries", async ({ request }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tag = `e2e-delete-${suffix}`;

  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create delete test ${suffix} tg:${tag}`,
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()).rows[0] as { id: string };

  const deleteResponse = await request.post("/ezq", {
    data: {
      query: `/delete id:${created.id}`,
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(deleteResponse.ok()).toBeTruthy();
  const deleteBody = await deleteResponse.json();
  expect(deleteBody.rows).toEqual([]);

  const searchResponse = await request.post("/ezq", {
    data: {
      query: `/search tg:${tag}`,
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(searchResponse.ok()).toBeTruthy();
  const searchBody = await searchResponse.json();
  expect(searchBody.rows).toEqual([]);
});
