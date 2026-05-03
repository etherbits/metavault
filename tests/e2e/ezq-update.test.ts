import { expect, test } from "@playwright/test";
import { TEST_USER_ID } from "../test-user";

test("POST /ezq /u <title> > status:<value> updates the matched entry", async ({
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const titleToken = `attack-${suffix}`;

  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create ${titleToken}`,
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()).rows[0] as { id: string };

  const updateResponse = await request.post("/ezq", {
    data: {
      query: `/u ${titleToken} > status:progress`,
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(updateResponse.ok()).toBeTruthy();

  const body = await updateResponse.json();
  expect(body.rows).toHaveLength(1);
  expect(body.rows[0].id).toBe(created.id);
  expect(body.rows[0].status).toBe("in_progress");
});

test("POST /ezq /update applies scalar set and tag insert, returning updated row", async ({
  request,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tag = `e2e-update-${suffix}`;
  const extraTag = `e2e-update-extra-${suffix}`;

  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create update test ${suffix} tg:${tag}`,
      extras: { user_id: TEST_USER_ID },
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()).rows[0] as { id: string };

  const updateResponse = await request.post("/ezq", {
    data: {
      query: `/update id:${created.id} > status:finished tg:${extraTag}`,
      extras: { user_id: TEST_USER_ID },
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
});
