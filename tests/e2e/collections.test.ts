import { expect, type APIRequestContext, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

type LibraryEntry = {
  id: string;
};

type CollectionEntry = {
  library_entry_id: string;
};

type Collection = {
  id: string;
  name: string;
  entries?: string;
};

async function createLibraryEntry(request: APIRequestContext, title: string) {
  const response = await request.post("/library", {
    multipart: {
      title,
      media_id: `${title.toLowerCase().replaceAll(" ", "-")}-media`,
      media_type: "movie",
      status: "planning",
    },
  });

  expect(response.status()).toBe(201);
  return (await response.json()) as LibraryEntry;
}

test("collections reject unauthenticated requests", async ({ request }) => {
  const response = await request.get("/collections");

  expect(response.status()).toBe(401);
});

test("collections CRUD works for an authenticated user", async ({
  request,
}) => {
  await signIn(request);

  const firstEntry = await createLibraryEntry(request, "Collections First");
  const secondEntry = await createLibraryEntry(request, "Collections Second");

  const createResponse = await request.post("/collections", {
    data: {
      name: "Favorites",
      entries: [{ library_entry_id: firstEntry.id }],
    },
  });

  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as Collection;
  expect(created).toMatchObject({ name: "Favorites" });
  expect(created.entries).toBeUndefined();

  const listResponse = await request.get("/collections");
  expect(listResponse.ok()).toBeTruthy();
  const collections = (await listResponse.json()) as Collection[];
  const listed = collections.find((collection) => collection.id === created.id);
  expect(
    parseCollectionEntries(listed).map((entry) => entry.library_entry_id)
  ).toEqual([firstEntry.id]);

  const getResponse = await request.get(`/collections/${created.id}`);
  expect(getResponse.ok()).toBeTruthy();
  expect(await getResponse.json()).toEqual(
    expect.objectContaining({ id: created.id, name: "Favorites" })
  );

  const updateResponse = await request.patch(`/collections/${created.id}`, {
    data: {
      name: "Updated Favorites",
      entries: [
        { library_entry_id: firstEntry.id },
        { library_entry_id: secondEntry.id },
      ],
    },
  });
  expect(updateResponse.ok()).toBeTruthy();
  const updated = (await updateResponse.json()) as Collection;
  expect(updated.name).toBe("Updated Favorites");
  expect(updated.entries).toBeUndefined();

  const removeResponse = await request.delete(
    `/collections/${created.id}/entries`,
    {
      data: { library_entry_ids: [firstEntry.id] },
    }
  );
  expect(removeResponse.ok()).toBeTruthy();
  expect(await removeResponse.json()).toEqual({
    message: "Collection entries removed successfully",
  });

  const afterRemoveResponse = await request.get("/collections");
  expect(afterRemoveResponse.ok()).toBeTruthy();
  const afterRemove = (await afterRemoveResponse.json()) as Collection[];
  const listedAfterRemove = afterRemove.find(
    (collection) => collection.id === created.id
  );
  expect(
    parseCollectionEntries(listedAfterRemove).map(
      (entry) => entry.library_entry_id
    )
  ).toEqual([secondEntry.id]);

  const deleteResponse = await request.delete(`/collections/${created.id}`);
  expect(deleteResponse.ok()).toBeTruthy();
  expect(await deleteResponse.json()).toEqual({
    message: "Collection deleted successfully",
  });

  const deletedResponse = await request.get(`/collections/${created.id}`);
  expect(deletedResponse.status()).toBe(404);
});

function parseCollectionEntries(collection: Collection | undefined) {
  expect(collection).toBeDefined();
  return JSON.parse(collection?.entries ?? "[]") as CollectionEntry[];
}

test("collections reject invalid library entries", async ({ request }) => {
  await signIn(request);

  const response = await request.post("/collections", {
    data: {
      name: "Invalid Entries",
      entries: [{ library_entry_id: "missing-library-entry" }],
    },
  });

  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({
    message: "One or more library entries do not belong to the user",
  });
});
