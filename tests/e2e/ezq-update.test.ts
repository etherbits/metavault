import { expect, test } from "@playwright/test";
import { createVerifiedUser, signIn } from "../helpers/auth";
import {
  executeQuery,
  expectNoQueryResult,
  expectQueryResult,
  openQueryPage,
} from "../helpers/queryPage";
import { TEST_AUTH_PASSWORD } from "../test-user";

test("POST /ezq /u <title> > status:<value> updates the matched entry", async ({
  request,
  page,
}) => {
  await signIn(request);
  const titleToken = `update_status_entry_${Date.now()}`;
  const title = titleToken.replace(/_/g, " ");

  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create ${titleToken}`,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()).rows[0] as { id: string };

  const updateResponse = await request.post("/ezq", {
    data: {
      query: `/u ${titleToken} > status:progress`,
    },
  });
  expect(updateResponse.ok()).toBeTruthy();

  const body = await updateResponse.json();
  expect(body.rows).toHaveLength(1);
  expect(body.rows[0].id).toBe(created.id);
  expect(body.rows[0].status).toBe("in_progress");

  await openQueryPage(page);
  await executeQuery(page, `/u ${titleToken} > status:progress`);
  await expectQueryResult(page, title);
  await expect(page.getByText("In Progress")).toBeVisible();
});

test("POST /ezq /update applies scalar set and tag insert, returning updated row", async ({
  request,
  page,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const tag = `e2e-update-${suffix}`;
  const extraTag = `e2e-update-extra-${suffix}`;
  const title = `update test entry ${suffix}`;
  const titleToken = title.replace(/ /g, "_");

  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create ${titleToken} tg:${tag}`,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()).rows[0] as { id: string };

  const updateResponse = await request.post("/ezq", {
    data: {
      query: `/update id:${created.id} > status:finished tg:${extraTag}`,
    },
  });
  expect(updateResponse.ok()).toBeTruthy();

  const body = await updateResponse.json();
  expect(body.rows).toHaveLength(1);
  const updated = body.rows[0];
  expect(updated.id).toBe(created.id);
  expect(updated.status).toBe("finished");
  expect(updated.tags).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ value: tag, weight: "major" }),
      expect.objectContaining({ value: extraTag, weight: "major" }),
    ])
  );

  await openQueryPage(page);
  await executeQuery(
    page,
    `/update id:${created.id} > status:finished tg:${extraTag}`
  );
  await expectQueryResult(page, title);
  await expect(page.getByText("Finished")).toBeVisible();
  await expect(page.getByText(extraTag)).toBeVisible();
});

test("POST /ezq /u with empty target updates all user entries", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = "a";
  const uniqueTag = `e2e-update-all-${Date.now()}`;
  const firstTitle = `${uniqueTag}_first`;
  const secondTitle = `${uniqueTag}_second`;
  const firstDisplayTitle = firstTitle.replace(/_/g, " ");
  const secondDisplayTitle = secondTitle.replace(/_/g, " ");

  const firstCreate = await request.post("/ezq", {
    data: {
      query: `/create ${firstTitle} tg:${uniqueTag}`,
    },
  });
  expect(firstCreate.ok()).toBeTruthy();

  const secondCreate = await request.post("/ezq", {
    data: {
      query: `/create ${secondTitle} tg:${uniqueTag}`,
    },
  });
  expect(secondCreate.ok()).toBeTruthy();

  const updateResponse = await request.post("/ezq", {
    data: {
      query: `/u > tag:${tag}`,
    },
  });
  expect(updateResponse.ok()).toBeTruthy();

  const searchResponse = await request.post("/ezq", {
    data: {
      query: `/s tg:${tag}`,
    },
  });
  expect(searchResponse.ok()).toBeTruthy();

  const body = await searchResponse.json();
  const titles = body.rows.map((row: { title: string }) => row.title);
  expect(titles).toEqual(
    expect.arrayContaining([firstDisplayTitle, secondDisplayTitle])
  );

  await openQueryPage(page);
  await executeQuery(page, `/u > tag:${tag}`);
  await executeQuery(page, `/s tg:${uniqueTag}`);
  await expectQueryResult(page, firstDisplayTitle);
  await expectQueryResult(page, secondDisplayTitle);
  await expect(page.getByText(tag).first()).toBeVisible();
});

test("query page /u with negated tag removes that tag from all user entries", async ({
  request,
  page,
}) => {
  const suffix = Date.now();
  const username = `utag${String(suffix).slice(-9)}`;
  const email = `update-remove-tag-${suffix}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username, TEST_AUTH_PASSWORD);

  const uniqueTag = `e2e-remove-tag-${suffix}`;
  const firstTitle = `remove tag first ${suffix}`;
  const secondTitle = `remove tag second ${suffix}`;
  for (const title of [firstTitle, secondTitle]) {
    const createResponse = await request.post("/ezq", {
      data: {
        query: `/create ${title.replace(/ /g, "_")} tag:a:major tg:${uniqueTag}`,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
  }

  const updateResponse = await request.post("/ezq", {
    data: { query: "/u > !tag:a" },
  });
  expect(updateResponse.ok()).toBeTruthy();
  const updatedRows = (await updateResponse.json()).rows as Array<{
    title: string;
    tags: Array<{ value: string; weight: string }>;
  }>;
  expect(updatedRows.map((row) => row.title)).toEqual(
    expect.arrayContaining([firstTitle, secondTitle])
  );
  for (const row of updatedRows) {
    expect(row.tags).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "a", weight: "major" }),
      ])
    );
  }

  const searchRemovedResponse = await request.post("/ezq", {
    data: { query: "/s tg:a" },
  });
  expect(searchRemovedResponse.ok()).toBeTruthy();
  expect((await searchRemovedResponse.json()).rows).toEqual([]);

  for (const title of [firstTitle, secondTitle]) {
    const readdResponse = await request.post("/ezq", {
      data: { query: `/u ${title.replace(/ /g, "_")} > tag:a` },
    });
    expect(readdResponse.ok()).toBeTruthy();
  }

  await openQueryPage(page, username, TEST_AUTH_PASSWORD);
  await executeQuery(page, "/u > !tag:a");
  await executeQuery(page, "/s tg:a");
  await expectNoQueryResult(page, firstTitle);
  await expectNoQueryResult(page, secondTitle);
  await expect(page.getByText("No results found")).toBeVisible();

  await executeQuery(page, `/s tg:${uniqueTag}`);
  await expectQueryResult(page, firstTitle);
  await expectQueryResult(page, secondTitle);
});

test("POST /ezq /update can remove grouped tags while changing title", async ({
  request,
  page,
}) => {
  const suffix = Date.now();
  const username = `ugroup${String(suffix).slice(-8)}`;
  const email = `update-grouped-remove-${suffix}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username, TEST_AUTH_PASSWORD);

  const originalTitle = "home alone";
  const updatedTitle = "not home alone";
  const uniqueTag = `e2e-grouped-remove-${suffix}`;
  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create title:home_alone tag:cringe:major tag:family:major tg:${uniqueTag}`,
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  const updateQuery =
    "/update title:home_alone > !(tag:cringe:major tag:family:major) title:not_home_alone";
  const updateResponse = await request.post("/ezq", {
    data: { query: updateQuery },
  });
  expect(updateResponse.ok()).toBeTruthy();
  const updatedRows = (await updateResponse.json()).rows as Array<{
    title: string;
    tags: Array<{ value: string; weight: string }>;
  }>;
  expect(updatedRows).toHaveLength(1);
  expect(updatedRows[0].title).toBe(updatedTitle);
  expect(updatedRows[0].tags).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ value: "cringe", weight: "major" }),
      expect.objectContaining({ value: "family", weight: "major" }),
    ])
  );

  const pageUsername = `ugroupp${String(suffix).slice(-7)}`;
  const pageEmail = `update-grouped-remove-page-${suffix}@test.local`;
  await createVerifiedUser(request, pageUsername, pageEmail);
  await signIn(request, pageUsername, TEST_AUTH_PASSWORD);

  const createForPageResponse = await request.post("/ezq", {
    data: {
      query: `/create title:home_alone tag:cringe:major tag:family:major tg:${uniqueTag}`,
    },
  });
  expect(createForPageResponse.ok()).toBeTruthy();

  await openQueryPage(page, pageUsername, TEST_AUTH_PASSWORD);
  await executeQuery(page, updateQuery);
  await expectQueryResult(page, updatedTitle);
  await executeQuery(page, "/s tg:cringe");
  await expectNoQueryResult(page, originalTitle);
});
