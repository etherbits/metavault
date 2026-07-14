import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

test("tag selectors are case-insensitive across search, update, and delete", async ({
  request,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const storedTag = `AdventureCase${suffix}`;
  const queriedTag = storedTag.toLowerCase();
  const title = `tag case insensitive ${suffix}`;
  const titleToken = title.replaceAll(" ", "_");

  const createResponse = await request.post("/ezq", {
    data: { query: `/create ${titleToken} tag:${storedTag}:major` },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()).rows[0] as { id: string };

  const searchResponse = await request.post("/ezq", {
    data: { query: `/search tag:${queriedTag}:major` },
  });
  expect(searchResponse.ok()).toBeTruthy();
  expect((await searchResponse.json()).rows).toEqual([
    expect.objectContaining({ id: created.id, title }),
  ]);

  const updateResponse = await request.post("/ezq", {
    data: {
      query: `/update tag:${queriedTag}:major > status:finished`,
    },
  });
  expect(updateResponse.ok()).toBeTruthy();
  expect((await updateResponse.json()).rows).toEqual([
    expect.objectContaining({ id: created.id, status: "finished" }),
  ]);

  const deleteResponse = await request.post("/ezq", {
    data: { query: `/delete tag:${queriedTag}:major` },
  });
  expect(deleteResponse.ok()).toBeTruthy();
  expect((await deleteResponse.json()).rows).toEqual([
    expect.objectContaining({ id: created.id }),
  ]);

  const missingResponse = await request.post("/ezq", {
    data: { query: `/search id:${created.id}` },
  });
  expect(missingResponse.ok()).toBeTruthy();
  expect((await missingResponse.json()).rows).toEqual([]);
});
