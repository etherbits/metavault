import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

test("POST /ezq /delete removes matching entries", async ({ request }) => {
  await signIn(request);
  const tag = "e2e-delete";

  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create delete_test_entry tg:${tag}`,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()).rows[0] as { id: string };

  const deleteResponse = await request.post("/ezq", {
    data: {
      query: `/delete id:${created.id}`,
    },
  });
  expect(deleteResponse.ok()).toBeTruthy();
  const deleteBody = await deleteResponse.json();
  expect(deleteBody.rows).toEqual([]);

  const searchResponse = await request.post("/ezq", {
    data: {
      query: `/search tg:${tag}`,
    },
  });
  expect(searchResponse.ok()).toBeTruthy();
  const searchBody = await searchResponse.json();
  expect(searchBody.rows).toEqual([]);
});
