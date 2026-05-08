import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

test("POST /ezq /u <title> > status:<value> updates the matched entry", async ({
  request,
}) => {
  await signIn(request);
  const titleToken = "update_status_entry";

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
});

test("POST /ezq /update applies scalar set and tag insert, returning updated row", async ({
  request,
}) => {
  await signIn(request);
  const tag = "e2e-update";
  const extraTag = "e2e-update-extra";

  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create update_test_entry tg:${tag}`,
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
});
