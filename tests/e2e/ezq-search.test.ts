import { type APIRequestContext, expect, test } from "@playwright/test";
import { createVerifiedUser, signIn } from "../helpers/auth";
import {
  executeQuery,
  expectNoQueryResult,
  expectQueryResult,
  expectQueryResultOnAnyPage,
  openQueryPage,
} from "../helpers/queryPage";

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

async function createLibraryEntry(
  request: APIRequestContext,
  input: {
    title: string;
    mediaType: "anime" | "movie" | "tv_show";
    personalRating?: number;
  }
) {
  const multipart: Record<string, string> = {
    title: input.title,
    media_type: input.mediaType,
  };

  if (input.personalRating !== undefined) {
    multipart.personal_rating = String(input.personalRating);
  }

  const response = await request.post("/library", {
    multipart,
  });

  expect(response.status()).toBe(201);
  return response.json();
}

async function refreshCatalogue(request: APIRequestContext) {
  const response = await request.post("/catalogue/refresh", {
    headers: {
      "x-metavault-catalogue-key":
        process.env.METAVAULT_CATALOGUE_REFRESH_KEY ?? "catalogue-test-key",
    },
    data: { refreshWindowMs: 0 },
  });

  expect(response.ok()).toBeTruthy();
  return response;
}

test("POST /ezq /search by tag returns matching entries with tags", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = `e2e-search-${Date.now()}`;
  const title = "search test entry";
  const seeded = await seedEntry(request, tag, title);

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

  await openQueryPage(page);
  await executeQuery(page, `/search tg:${tag}`);
  await expectQueryResult(page, title);
  await expect(page.getByText(tag, { exact: true })).toBeVisible();
});

test("POST /ezq /s returns all of the user's entries", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = `e2e-search-all-${Date.now()}`;
  const title = "search all entry";
  const seeded = await seedEntry(request, tag, title);

  const response = await request.post("/ezq", {
    data: {
      query: "/s",
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const ids = body.rows.map((row: { id: string }) => row.id);
  expect(ids).toContain(seeded.id);

  await openQueryPage(page);
  await executeQuery(page, "/s");
  await expectQueryResultOnAnyPage(page, title);
});

test("query page empty input searches all and matches /s", async ({
  request,
  page,
}) => {
  const userSuffix = `${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const username = `search_${userSuffix}`;
  const email = `${username}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username);
  const tag = `e2e-search-empty-${Date.now()}`;
  const firstTitle = `${tag} first`;
  const secondTitle = `${tag} second`;
  await seedEntry(request, tag, firstTitle);
  await seedEntry(request, tag, secondTitle);
  const allResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(allResponse.ok()).toBeTruthy();
  const allCount = (await allResponse.json()).rows.length;

  await openQueryPage(page, username);
  await executeQuery(page, "");
  await expect(page.getByText(`Retrieved ${allCount} results`)).toBeVisible();

  await executeQuery(page, "/s");
  await expect(page.getByText(`Retrieved ${allCount} results`)).toBeVisible();

  await executeQuery(page, `/s tg:${tag}`);
  await expectQueryResult(page, firstTitle);
  await expectQueryResult(page, secondTitle);
});

test("query page executes search query params on load", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = `e2e-search-param-${Date.now()}`;
  const title = `${tag} result`;
  await seedEntry(request, tag, title);

  await openQueryPage(
    page,
    undefined,
    undefined,
    `/app/query?query=${encodeURIComponent(`/s tg:${tag}`)}`
  );

  await expect(
    page.getByPlaceholder("Query your library with EZQ")
  ).toHaveValue(`/s tg:${tag}`);
  await expectQueryResult(page, title);
});

test("query page runs saved alias commands through EZQ search", async ({
  request,
  page,
}) => {
  await signIn(request);
  const tag = `e2e-alias-${Date.now()}`;
  const alias = `favorite_${Date.now()}`;
  const title = `${tag} result`;
  await seedEntry(request, tag, title);

  const aliasResponse = await request.put(`/aliases/${alias}`, {
    data: {
      alias,
      expansion: `tg:${tag}`,
    },
  });
  expect(aliasResponse.ok()).toBeTruthy();

  await openQueryPage(page);
  await executeQuery(page, `/s #alias:${alias}`);
  await expect(
    page.getByText(`/search #alias:${alias}`, { exact: true })
  ).toBeVisible();
  await expectQueryResult(page, title);
});

test("query page filters with a common rating and media alias command", async ({
  request,
  page,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const alias = `watchable_${suffix}`;
  const matchingAnime = `alias matching anime ${suffix}`;
  const matchingMovie = `alias matching movie ${suffix}`;
  const excludedShow = `alias excluded show ${suffix}`;
  const excludedAnime = `alias excluded anime ${suffix}`;

  await createLibraryEntry(request, {
    title: matchingAnime,
    mediaType: "anime",
    personalRating: 8,
  });
  await createLibraryEntry(request, {
    title: matchingMovie,
    mediaType: "movie",
    personalRating: 9,
  });
  await createLibraryEntry(request, {
    title: excludedShow,
    mediaType: "tv_show",
    personalRating: 9,
  });
  await createLibraryEntry(request, {
    title: excludedAnime,
    mediaType: "anime",
    personalRating: 7,
  });

  const aliasResponse = await request.put(`/aliases/${alias}`, {
    data: {
      alias,
      expansion: "personal_rating:>7 (media_type:anime | media_type:movie)",
    },
  });
  expect(aliasResponse.ok()).toBeTruthy();

  await openQueryPage(page);
  await executeQuery(page, `/s #alias:${alias}`);

  await expectQueryResult(page, matchingAnime);
  await expectQueryResult(page, matchingMovie);
  await expectNoQueryResult(page, excludedShow);
  await expectNoQueryResult(page, excludedAnime);
});

test("query page card personal rating updates in half-star steps", async ({
  request,
  page,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const tag = `card-rating-${suffix}`;
  const title = `card personal rating ${suffix}`;
  const created = await createLibraryEntry(request, {
    title,
    mediaType: "anime",
  });

  const tagResponse = await request.post("/ezq", {
    data: { query: `/u id:${created.id} > tag:${tag}` },
  });
  expect(tagResponse.ok()).toBeTruthy();

  await openQueryPage(page);
  await executeQuery(page, `/s tg:${tag}`);
  await expectQueryResult(page, title);

  await page.getByRole("button", { name: "Card actions" }).click();
  await expect(
    page.getByText("Set public rating", { exact: true })
  ).not.toBeVisible();
  await page.keyboard.press("Escape");

  const ratingSlider = page.getByRole("slider", {
    name: `Personal rating for ${title}`,
  });
  await expect(ratingSlider).toHaveAttribute("aria-valuenow", "0");

  const bounds = await ratingSlider.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) {
    throw new Error("Card personal rating slider was not visible");
  }

  const patchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === `/library/${created.id}` &&
      response.request().method() === "PATCH"
    );
  });

  await ratingSlider.click({
    position: {
      x: bounds.width * 0.91,
      y: bounds.height / 2,
    },
  });

  await expect((await patchResponse).ok()).toBeTruthy();
  await expect(ratingSlider).toHaveAttribute("aria-valuenow", "10");

  const getResponse = await request.get(`/library/${created.id}`);
  expect(getResponse.ok()).toBeTruthy();
  expect(await getResponse.json()).toEqual(
    expect.objectContaining({ personal_rating: 10 })
  );
});

test("pull command previews catalogue entries and creates them only with create", async ({
  request,
}) => {
  const userSuffix = `${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const username = `pull_${userSuffix}`;
  const email = `${username}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username);
  const existingTitle = `pull existing library row ${Date.now()}`;
  await seedEntry(request, "pull-existing", existingTitle);
  await refreshCatalogue(request);

  const previewResponse = await request.post("/ezq", {
    data: { query: "/s #pull:all:10" },
  });
  expect(previewResponse.ok()).toBeTruthy();
  const previewBody = await previewResponse.json();
  expect(previewBody.rows.length).toBeGreaterThan(0);
  expect(previewBody.rows.length).toBeLessThanOrEqual(10);
  expect(
    previewBody.rows.every((row: { id: string }) =>
      row.id.startsWith("catalogue:")
    )
  ).toBe(true);
  expect(
    previewBody.rows.some(
      (row: { title: string }) => row.title === existingTitle
    )
  ).toBe(false);

  const existingLibraryResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(existingLibraryResponse.ok()).toBeTruthy();
  expect((await existingLibraryResponse.json()).rows).toHaveLength(1);

  const createResponse = await request.post("/ezq", {
    data: { query: "/c #pull:all:10" },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createBody = await createResponse.json();
  expect(createBody.rows).toHaveLength(previewBody.rows.length);
  expect(
    createBody.rows.every(
      (row: { id: string; title: string; status: string | null }) =>
        !row.id.startsWith("catalogue:") &&
        row.title.length > 0 &&
        row.status === null
    )
  ).toBe(true);

  const savedLibraryResponse = await request.post("/ezq", {
    data: { query: "/s" },
  });
  expect(savedLibraryResponse.ok()).toBeTruthy();
  expect((await savedLibraryResponse.json()).rows).toHaveLength(
    createBody.rows.length + 1
  );
});
