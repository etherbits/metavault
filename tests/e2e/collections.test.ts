import { expect, type APIRequestContext, test } from "@playwright/test";
import { signIn } from "../helpers/auth";
import {
  expectQueryResult,
  openQueryPage,
  signInPage,
  WEB_BASE_URL,
} from "../helpers/queryPage";

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
  const raw = JSON.parse(collection?.entries ?? "[]") as unknown;
  return (Array.isArray(raw) ? raw.filter(Boolean) : []) as CollectionEntry[];
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

test("collections reject duplicate names for one user", async ({ request }) => {
  await signIn(request);
  const suffix = Date.now();
  const name = `Duplicate Collection ${suffix}`;

  await createCollection(request, name);

  const duplicateResponse = await request.post("/collections", {
    data: { name: name.toUpperCase() },
  });
  expect(duplicateResponse.status()).toBe(409);
  expect(await duplicateResponse.json()).toEqual({
    message: "Collection name already exists",
  });

  const otherCollection = await createCollection(
    request,
    `Rename Target ${suffix}`
  );
  const updateResponse = await request.patch(
    `/collections/${otherCollection.id}`,
    { data: { name: name.toLowerCase() } }
  );
  expect(updateResponse.status()).toBe(409);
  expect(await updateResponse.json()).toEqual({
    message: "Collection name already exists",
  });
});

test("query page adds an item to multiple collections from searchable picker", async ({
  request,
  page,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const entry = await createLibraryEntry(
    request,
    `Collection Picker Entry ${suffix}`
  );
  const firstCollection = await createCollection(
    request,
    `Picker First ${suffix}`
  );
  const secondCollection = await createCollection(
    request,
    `Picker Second ${suffix}`
  );
  const createdName = `Picker Created ${suffix}`;

  await openQueryPage(page);
  await page
    .getByPlaceholder("Query your library with EZQ")
    .fill(`/search id:${entry.id}`);
  await page.getByPlaceholder("Query your library with EZQ").press("Enter");
  await expectQueryResult(page, `Collection Picker Entry ${suffix}`);

  await page.getByRole("button", { name: "Card actions" }).click();
  await page.getByText("Add to collection", { exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Add to collections" })
  ).toBeVisible();
  const pickerDialog = page.getByRole("dialog", {
    name: "Add to collections",
  });
  await page.getByPlaceholder("Search collections").fill("Picker First");
  await pickerDialog
    .locator("button")
    .filter({ hasText: firstCollection.name })
    .click();
  await expect(pickerDialog.getByText("1 selected")).toBeVisible();
  await page.getByPlaceholder("Search collections").fill("");
  await pickerDialog
    .locator("button")
    .filter({ hasText: secondCollection.name })
    .click();
  await expect(pickerDialog.getByText("2 selected")).toBeVisible();
  await page.getByPlaceholder("New collection name").fill(createdName);
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(
    pickerDialog.locator("button").filter({ hasText: createdName })
  ).toBeVisible();
  await expect(pickerDialog.getByText("3 selected")).toBeVisible();
  await pickerDialog.getByRole("button", { name: "Save", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Add to collections" })
  ).toHaveCount(0);

  const collections = await fetchCollections(request);
  for (const collectionName of [
    firstCollection.name,
    secondCollection.name,
    createdName,
  ]) {
    const collection = collections.find((item) => item.name === collectionName);
    expect(
      parseCollectionEntries(collection).map((item) => item.library_entry_id)
    ).toContain(entry.id);
  }

  await page.getByRole("button", { name: "Card actions" }).click();
  await page.getByText("Add to collection", { exact: true }).click();
  await expect(pickerDialog.getByText("3 selected")).toBeVisible();
  for (const collectionName of [
    firstCollection.name,
    secondCollection.name,
    createdName,
  ]) {
    await pickerDialog
      .locator("button")
      .filter({ hasText: collectionName })
      .click();
  }
  await expect(pickerDialog.getByText("0 selected")).toBeVisible();
  await pickerDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Add to collections" })
  ).toHaveCount(0);

  const afterRemoval = await fetchCollections(request);
  for (const collectionName of [
    firstCollection.name,
    secondCollection.name,
    createdName,
  ]) {
    const collection = afterRemoval.find(
      (item) => item.name === collectionName
    );
    expect(
      parseCollectionEntries(collection).map((item) => item.library_entry_id)
    ).not.toContain(entry.id);
  }
});

test("home collection sections can query more, rename, and delete", async ({
  request,
  page,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const title = `Home Collection Entry ${suffix}`;
  const entry = await createLibraryEntry(request, title);
  const collection = await createCollection(
    request,
    `Home Collection ${suffix}`,
    [entry.id]
  );
  const renamed = `Renamed Collection ${suffix}`;

  await signInPage(page);
  await page.goto(`${WEB_BASE_URL}/app/home`);
  await expect(
    page.getByRole("heading", { name: "Home", exact: true })
  ).toBeVisible();

  const collectionSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: collection.name }) });

  await collectionSection.getByRole("button", { name: "Query More" }).click();
  await expect(page).toHaveURL(/\/app\/query/);
  await expect(
    page.getByPlaceholder("Query your library with EZQ")
  ).toHaveValue(`/search collection:Home_Collection_${suffix}`);
  await expectQueryResult(page, title);

  await page.goto(`${WEB_BASE_URL}/app/home`);
  await page
    .getByRole("button", { name: `Edit ${collection.name} collection` })
    .click();
  await page.getByLabel("Rename collection").fill(renamed);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: renamed, exact: true })
  ).toBeVisible();

  await page
    .getByRole("button", { name: `Edit ${renamed} collection` })
    .click();
  await page.getByText("Delete collection", { exact: true }).click();
  const deleteDialog = page.getByRole("alertdialog", {
    name: "Delete collection?",
  });
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog).toContainText(
    `Delete "${renamed}"? Items stay in your library.`
  );
  await deleteDialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: renamed })).toHaveCount(0);

  const collections = await fetchCollections(request);
  expect(collections.find((item) => item.id === collection.id)).toBeUndefined();
});

test("EZQ collection filter returns entries from the named collection", async ({
  request,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const matchingEntry = await createLibraryEntry(
    request,
    `Collection Query Match ${suffix}`
  );
  const excludedEntry = await createLibraryEntry(
    request,
    `Collection Query Excluded ${suffix}`
  );
  await createCollection(request, `collection query ${suffix}`, [
    matchingEntry.id,
  ]);

  const response = await request.post("/ezq", {
    data: {
      query: `/search collection:collection_query_${suffix}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { rows: { id: string }[] };
  const ids = body.rows.map((row) => row.id);
  expect(ids).toContain(matchingEntry.id);
  expect(ids).not.toContain(excludedEntry.id);
});

async function createCollection(
  request: APIRequestContext,
  name: string,
  entryIds: string[] = []
) {
  const response = await request.post("/collections", {
    data: {
      name,
      entries: entryIds.map((id) => ({ library_entry_id: id })),
    },
  });

  expect(response.status()).toBe(201);
  return (await response.json()) as Collection;
}

async function fetchCollections(request: APIRequestContext) {
  const response = await request.get("/collections");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as Collection[];
}
