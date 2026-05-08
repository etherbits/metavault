import { type APIRequestContext, expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

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
}) => {
  await signIn(request);
  const tag = "e2e-search";
  const seeded = await seedEntry(request, tag, "search test entry");

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
});

test("POST /ezq /s returns all of the user's entries", async ({ request }) => {
  await signIn(request);
  const tag = "e2e-search-all";
  const seeded = await seedEntry(request, tag, "search all entry");

  const response = await request.post("/ezq", {
    data: {
      query: "/s",
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const ids = body.rows.map((row: { id: string }) => row.id);
  expect(ids).toContain(seeded.id);
});
