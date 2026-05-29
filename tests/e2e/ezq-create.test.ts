import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";
import {
  executeQuery,
  expectQueryResult,
  openQueryPage,
} from "../helpers/queryPage";
import { TEST_AUTH_USER_ID } from "../test-user";

test("POST /ezq rejects unauthenticated requests", async ({ request }) => {
  const response = await request.post("/ezq", {
    data: { query: "/s" },
  });

  expect(response.status()).toBe(401);
});

test("POST /ezq /create returns the new entry with its tags", async ({
  request,
  page,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const title = `create test entry ${suffix}`;
  const titleToken = title.replace(/ /g, "_");
  const tag = `e2e-create-${suffix}`;

  const response = await request.post("/ezq", {
    data: {
      query: `/create ${titleToken} tg:${tag}`,
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

  await openQueryPage(page);
  await executeQuery(page, `/search tg:${tag}`);
  await expectQueryResult(page, title);
  await expect(page.getByText(tag, { exact: true })).toBeVisible();
});

test("query page /c can create multiple items at once", async ({
  request,
  page,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const firstTitleToken = `multi_create_first_${suffix}`;
  const secondTitleToken = `multi_create_second_${suffix}`;
  const firstTitle = firstTitleToken.replace(/_/g, " ");
  const secondTitle = secondTitleToken.replace(/_/g, " ");
  const query = `/c ${firstTitleToken} | ${secondTitleToken}`;

  const response = await request.post("/ezq", {
    data: { query },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.rows).toHaveLength(2);
  expect(body.rows.map((row: { title: string }) => row.title)).toEqual(
    expect.arrayContaining([firstTitle, secondTitle])
  );

  await openQueryPage(page);
  await executeQuery(page, query);
  await expectQueryResult(page, firstTitle);
  await expectQueryResult(page, secondTitle);
});
