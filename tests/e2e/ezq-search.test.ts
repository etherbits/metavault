import { type APIRequestContext, expect, test } from "@playwright/test";
import { createVerifiedUser, signIn } from "../helpers/auth";
import {
  executeQuery,
  expectQueryResult,
  expectQueryResultOnAnyPage,
  openQueryPage,
} from "../helpers/queryPage";

async function seedEntry(
  request: APIRequestContext,
  tag: string,
  title: string
) {
  const response = await request.post("/ezq", {
    data: {
      query: `/create ${title.replace(/ /g, "_")} tg:${tag}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).rows[0] as { id: string };
}

test("POST /ezq /search by tag returns matching entries with tags", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = `e2e-search-${Date.now()}`;
  const title = "search test entry";
  const seeded = await seedEntry(request, tag, title);

  const response = await request.post("/ezq", {
    data: {
      query: `/search tg:${tag}`,
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.rows).toHaveLength(1);
  expect(body.rows[0].id).toBe(seeded.id);
  expect(body.rows[0].tags).toEqual([
    expect.objectContaining({ value: tag, weight: "major" }),
  ]);

  await openQueryPage(page);
  await executeQuery(page, `/search tg:${tag}`);
  await expectQueryResult(page, title);
  await expect(page.getByText(tag, { exact: true })).toBeVisible();
});

test("POST /ezq /s returns all of the user's entries", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = `e2e-search-all-${Date.now()}`;
  const title = "search all entry";
  const seeded = await seedEntry(request, tag, title);

  const response = await request.post("/ezq", {
    data: {
      query: "/s",
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const ids = body.rows.map((row: { id: string }) => row.id);
  expect(ids).toContain(seeded.id);

  await openQueryPage(page);
  await executeQuery(page, "/s");
  await expectQueryResultOnAnyPage(page, title);
});

test("query page empty input searches all and matches /s", async ({
  request,
  page,
}) => {
  const userSuffix = `${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const username = `search_${userSuffix}`;
  const email = `${username}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username);
  const tag = `e2e-search-empty-${Date.now()}`;
  const firstTitle = `${tag} first`;
  const secondTitle = `${tag} second`;
  await seedEntry(request, tag, firstTitle);
  await seedEntry(request, tag, secondTitle);
  const allResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(allResponse.ok()).toBeTruthy();
  const allCount = (await allResponse.json()).rows.length;

  await openQueryPage(page, username);
  await executeQuery(page, "");
  await expect(page.getByText(`Retrieved ${allCount} results`)).toBeVisible();

  await executeQuery(page, "/s");
  await expect(page.getByText(`Retrieved ${allCount} results`)).toBeVisible();

  await executeQuery(page, `/s tg:${tag}`);
  await expectQueryResult(page, firstTitle);
  await expectQueryResult(page, secondTitle);
});

test("query page executes search query params on load", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = `e2e-search-param-${Date.now()}`;
  const title = `${tag} result`;
  await seedEntry(request, tag, title);

  await openQueryPage(
    page,
    undefined,
    undefined,
    `/app/query?query=${encodeURIComponent(`/s tg:${tag}`)}`
  );

  await expect(
    page.getByPlaceholder("Query your library with EZQ")
  ).toHaveValue(`/s tg:${tag}`);
  await expectQueryResult(page, title);
});
