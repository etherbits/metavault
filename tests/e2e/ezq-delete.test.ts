import { expect, test } from "@playwright/test";
import { createVerifiedUser, signIn } from "../helpers/auth";
import {
  executeQuery,
  expectNoQueryResult,
  expectQueryResult,
  openQueryPage,
} from "../helpers/queryPage";
import { TEST_AUTH_PASSWORD } from "../test-user";

test("POST /ezq /delete removes matching entries", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = `e2e-delete-${Date.now()}`;
  const title = "delete test entry";

  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create ${title.replace(/ /g, "_")} tg:${tag}`,
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
  expect(deleteBody.rows).toHaveLength(1);
  expect(deleteBody.rows[0]).toMatchObject({ id: created.id, title });

  const searchResponse = await request.post("/ezq", {
    data: {
      query: `/search tg:${tag}`,
    },
  });
  expect(searchResponse.ok()).toBeTruthy();
  const searchBody = await searchResponse.json();
  expect(searchBody.rows).toEqual([]);

  await openQueryPage(page);
  await executeQuery(page, `/search tg:${tag}`);
  await expectNoQueryResult(page, title);
});

test("POST /ezq /d deletes all user entries", async ({ request, page }) => {
  const suffix = Date.now();
  const username = `del${String(suffix).slice(-10)}`;
  const email = `delete-all-${suffix}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username, TEST_AUTH_PASSWORD);

  const firstTitle = `delete all first ${suffix}`;
  const secondTitle = `delete all second ${suffix}`;
  for (const title of [firstTitle, secondTitle]) {
    const createResponse = await request.post("/ezq", {
      data: { query: `/create ${title.replace(/ /g, "_")}` },
    });
    expect(createResponse.ok()).toBeTruthy();
  }

  const deleteResponse = await request.post("/ezq", {
    data: { query: "/d" },
  });
  expect(deleteResponse.ok()).toBeTruthy();
  const deletedRows = (await deleteResponse.json()).rows as Array<{
    title: string;
  }>;
  expect(deletedRows.map((row) => row.title)).toEqual(
    expect.arrayContaining([firstTitle, secondTitle])
  );

  const searchResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(searchResponse.ok()).toBeTruthy();
  expect((await searchResponse.json()).rows).toEqual([]);

  for (const title of [firstTitle, secondTitle]) {
    const createResponse = await request.post("/ezq", {
      data: { query: `/create ${title.replace(/ /g, "_")}` },
    });
    expect(createResponse.ok()).toBeTruthy();
  }

  await openQueryPage(page, username, TEST_AUTH_PASSWORD);
  await executeQuery(page, "/d");
  await expectQueryResult(page, firstTitle);
  await expectQueryResult(page, secondTitle);
  await executeQuery(page, "/s");
  await expectNoQueryResult(page, firstTitle);
  await expectNoQueryResult(page, secondTitle);
  await expect(page.getByText("No results found")).toBeVisible();
});

test("query page does not execute destructive query params on load", async ({
  request,
  page,
}) => {
  const suffix = Date.now();
  const username = `dnoload${String(suffix).slice(-7)}`;
  const email = `delete-no-load-${suffix}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username, TEST_AUTH_PASSWORD);

  const firstTitle = `query param delete first ${suffix}`;
  const secondTitle = `query param delete second ${suffix}`;
  for (const title of [firstTitle, secondTitle]) {
    const createResponse = await request.post("/ezq", {
      data: { query: `/create ${title.replace(/ /g, "_")}` },
    });
    expect(createResponse.ok()).toBeTruthy();
  }

  await openQueryPage(
    page,
    username,
    TEST_AUTH_PASSWORD,
    `/app/query?query=${encodeURIComponent("/d")}`
  );
  await expect(
    page.getByPlaceholder("Query your library with EZQ")
  ).toHaveValue("/d");
  await expect(page.getByText("No results found")).toBeVisible();

  await executeQuery(page, "/s");
  await expectQueryResult(page, firstTitle);
  await expectQueryResult(page, secondTitle);
});

test("query page /delete tag:action:major deletes matching tagged entries", async ({
  request,
  page,
}) => {
  const suffix = Date.now();
  const username = `dtag${String(suffix).slice(-9)}`;
  const email = `delete-tag-${suffix}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username, TEST_AUTH_PASSWORD);

  const taggedTitle = `delete tagged action ${suffix}`;
  const survivorTitle = `delete tagged survivor ${suffix}`;

  const taggedCreate = await request.post("/ezq", {
    data: {
      query: `/create ${taggedTitle.replace(/ /g, "_")} tag:action:major`,
    },
  });
  expect(taggedCreate.ok()).toBeTruthy();

  const survivorCreate = await request.post("/ezq", {
    data: {
      query: `/create ${survivorTitle.replace(/ /g, "_")} tag:keeper:major`,
    },
  });
  expect(survivorCreate.ok()).toBeTruthy();

  const deleteResponse = await request.post("/ezq", {
    data: { query: "/delete tag:action:major" },
  });
  expect(deleteResponse.ok()).toBeTruthy();
  const deletedRows = (await deleteResponse.json()).rows as Array<{
    title: string;
  }>;
  expect(deletedRows.map((row) => row.title)).toContain(taggedTitle);
  expect(deletedRows.map((row) => row.title)).not.toContain(survivorTitle);

  const searchResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(searchResponse.ok()).toBeTruthy();
  const titles = (await searchResponse.json()).rows.map(
    (row: { title: string }) => row.title
  );
  expect(titles).not.toContain(taggedTitle);
  expect(titles).toContain(survivorTitle);

  const recreateResponse = await request.post("/ezq", {
    data: {
      query: `/create ${taggedTitle.replace(/ /g, "_")} tag:action:major`,
    },
  });
  expect(recreateResponse.ok()).toBeTruthy();

  await openQueryPage(page, username, TEST_AUTH_PASSWORD);
  await executeQuery(page, "/delete tag:action:major");
  await executeQuery(page, "/search tag:keeper:major");
  await expectQueryResult(page, survivorTitle);
  await executeQuery(page, "/search tag:action:major");
  await expectNoQueryResult(page, taggedTitle);
});

test("query page /delete !(attack on titan) deletes non-matching title entries", async ({
  request,
  page,
}) => {
  const suffix = Date.now();
  const username = `dnot${String(suffix).slice(-9)}`;
  const email = `delete-not-${suffix}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username, TEST_AUTH_PASSWORD);

  const keptTitle = `attack on titan ${suffix}`;
  const deletedTitle = `not attack ${suffix}`;

  const keptCreate = await request.post("/ezq", {
    data: { query: `/create ${keptTitle.replace(/ /g, "_")}` },
  });
  expect(keptCreate.ok()).toBeTruthy();

  const deletedCreate = await request.post("/ezq", {
    data: { query: `/create ${deletedTitle.replace(/ /g, "_")}` },
  });
  expect(deletedCreate.ok()).toBeTruthy();

  const deleteResponse = await request.post("/ezq", {
    data: { query: `/delete !(${keptTitle})` },
  });
  expect(deleteResponse.ok()).toBeTruthy();
  const deletedRows = (await deleteResponse.json()).rows as Array<{
    title: string;
  }>;
  expect(deletedRows.map((row) => row.title)).toContain(deletedTitle);
  expect(deletedRows.map((row) => row.title)).not.toContain(keptTitle);

  const searchResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(searchResponse.ok()).toBeTruthy();
  const titles = (await searchResponse.json()).rows.map(
    (row: { title: string }) => row.title
  );
  expect(titles).toContain(keptTitle);
  expect(titles).not.toContain(deletedTitle);

  const recreateResponse = await request.post("/ezq", {
    data: { query: `/create ${deletedTitle.replace(/ /g, "_")}` },
  });
  expect(recreateResponse.ok()).toBeTruthy();

  await openQueryPage(page, username, TEST_AUTH_PASSWORD);
  await executeQuery(page, `/delete !(${keptTitle})`);
  await executeQuery(page, "/s");
  await expect(page.getByRole("heading", { name: keptTitle })).toBeVisible();
  await expectNoQueryResult(page, deletedTitle);
});
