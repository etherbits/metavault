import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

test("library CRUD works for an authenticated user", async ({ request }) => {
  await signIn(request);

  const title = "Library E2E Entry";
  const updatedTitle = "Library E2E Entry Updated";
  const mediaId = "library-e2e-media";
  const createResponse = await request.post("/library", {
    multipart: {
      title,
      media_id: mediaId,
      media_type: "movie",
      status: "planning",
      public_rating: "",
      personal_rating: "5",
    },
  });

  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  expect(created).toMatchObject({
    title,
    media_id: mediaId,
    media_type: "movie",
    status: "planning",
    public_rating: null,
    personal_rating: 5,
  });

  const listResponse = await request.get("/library");
  expect(listResponse.ok()).toBeTruthy();
  const entries = (await listResponse.json()) as Array<{ id: string }>;
  expect(entries.map((entry) => entry.id)).toContain(created.id);

  const getResponse = await request.get(`/library/${created.id}`);
  expect(getResponse.ok()).toBeTruthy();
  expect(await getResponse.json()).toEqual(
    expect.objectContaining({ id: created.id })
  );

  const patchResponse = await request.patch(`/library/${created.id}`, {
    multipart: { status: "in_progress" },
  });
  expect(patchResponse.ok()).toBeTruthy();
  expect(await patchResponse.json()).toEqual(
    expect.objectContaining({ status: "in_progress" })
  );

  const putResponse = await request.put(`/library/${created.id}`, {
    multipart: { title: updatedTitle, status: "finished" },
  });
  expect(putResponse.ok()).toBeTruthy();
  expect(await putResponse.json()).toEqual(
    expect.objectContaining({
      title: updatedTitle,
      status: "finished",
    })
  );

  const deleteResponse = await request.delete(`/library/${created.id}`);
  expect(deleteResponse.ok()).toBeTruthy();
  expect(await deleteResponse.json()).toEqual({
    message: "Entry deleted successfully",
  });

  const deletedResponse = await request.get(`/library/${created.id}`);
  expect(deletedResponse.status()).toBe(404);
});
