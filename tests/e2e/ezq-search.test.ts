import { expect, test } from "@playwright/test";
import { TEST_USER_ID } from "../test-user";

async function seedEntry(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  tag: string,
  title: string
) {
  const response = await request.post("/ezq", {
    data: {
      query: `/create ${title.replace(/ /g, "_")} tg:${tag}`,
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).rows[0] as { id: string };
}

test("POST /ezq /search by tag returns matching entries with tags", async ({
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tag = `e2e-search-${suffix}`;
  const seeded = await seedEntry(request, tag, `search test ${suffix}`);

  const response = await request.post("/ezq", {
    data: {
      query: `/search tg:${tag}`,
      extras: { user_id: TEST_USER_ID },
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
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tag = `e2e-search-all-${suffix}`;
  const seeded = await seedEntry(request, tag, `search all ${suffix}`);

  const response = await request.post("/ezq", {
    data: {
      query: "/s",
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const ids = body.rows.map((row: { id: string }) => row.id);
  expect(ids).toContain(seeded.id);
});
