import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";

type LibraryEntry = {
  id: string;
  title: string | null;
};

type ContentNode = {
  id: string;
  title: string | null;
  link: string | null;
  order_index: number | null;
  library_entry_id: string;
};

async function createLibraryEntry(
  request: Parameters<typeof signIn>[0],
  title: string
) {
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

test("content nodes reject unauthenticated requests", async ({ request }) => {
  const response = await request.get("/content-nodes/some-id");
  expect(response.status()).toBe(401);
});

test("content nodes CRUD works and auto-assigns order index", async ({
  request,
}) => {
  await signIn(request);

  const entry = await createLibraryEntry(request, "Content Nodes Entry");

  const createFirstResponse = await request.post("/content-nodes", {
    data: {
      title: "Episode 1",
      link: "https://example.com/watch/ep-1",
      library_entry_id: entry.id,
    },
  });
  expect(createFirstResponse.status()).toBe(201);
  const firstNode = (await createFirstResponse.json()) as ContentNode;
  expect(firstNode).toMatchObject({
    title: "Episode 1",
    link: "https://example.com/watch/ep-1",
    library_entry_id: entry.id,
    order_index: 0,
  });

  const createSecondResponse = await request.post("/content-nodes", {
    data: {
      title: "Episode 2",
      link: "https://example.com/watch/ep-2",
      library_entry_id: entry.id,
    },
  });
  expect(createSecondResponse.status()).toBe(201);
  const secondNode = (await createSecondResponse.json()) as ContentNode;
  expect(secondNode.order_index).toBe(1);

  const getResponse = await request.get(`/content-nodes/${firstNode.id}`);
  expect(getResponse.ok()).toBeTruthy();
  expect(await getResponse.json()).toEqual(
    expect.objectContaining({ id: firstNode.id, title: "Episode 1" })
  );

  const listResponse = await request.get(
    `/content-nodes/library-entry/${entry.id}`
  );
  expect(listResponse.ok()).toBeTruthy();
  const listedNodes = (await listResponse.json()) as ContentNode[];
  expect(listedNodes.map((node) => node.id)).toEqual([
    firstNode.id,
    secondNode.id,
  ]);

  const updateResponse = await request.patch(
    `/content-nodes/${secondNode.id}`,
    {
      data: {
        title: "Episode 2 Updated",
        order_index: 5,
      },
    }
  );
  expect(updateResponse.ok()).toBeTruthy();
  expect(await updateResponse.json()).toEqual(
    expect.objectContaining({ title: "Episode 2 Updated", order_index: 5 })
  );

  const deleteResponse = await request.delete(`/content-nodes/${firstNode.id}`);
  expect(deleteResponse.ok()).toBeTruthy();
  expect(await deleteResponse.json()).toEqual({
    message: "Content node deleted successfully",
  });

  const deletedGetResponse = await request.get(
    `/content-nodes/${firstNode.id}`
  );
  expect(deletedGetResponse.status()).toBe(404);
});

test("content nodes can be created by library entry title", async ({
  request,
}) => {
  await signIn(request);

  const entryTitle = `Content Nodes Title Entry ${Date.now()}`;
  const entry = await createLibraryEntry(request, entryTitle);

  const createResponse = await request.post("/content-nodes", {
    data: {
      title: "Read Chapter 1",
      link: "https://example.com/read/chapter-1",
      library_entry_title: entryTitle,
    },
  });

  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as ContentNode;
  expect(created.library_entry_id).toBe(entry.id);
});

test("content nodes reject invalid create payload", async ({ request }) => {
  await signIn(request);

  const response = await request.post("/content-nodes", {
    data: {
      title: "Invalid Node",
      link: "not-a-link",
    },
  });

  expect(response.status()).toBe(400);
});
