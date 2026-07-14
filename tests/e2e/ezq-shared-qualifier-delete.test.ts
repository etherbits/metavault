import { expect, test } from "@playwright/test";
import { createVerifiedUser, signIn } from "../helpers/auth";
import { executeQuery, openQueryPage } from "../helpers/queryPage";
import { TEST_AUTH_PASSWORD } from "../test-user";

test("shared qualifiers delete every mass-created title after enrichment changes its wording", async ({
  request,
  page,
}) => {
  const suffix = Date.now();
  const username = `massdel${String(suffix).slice(-8)}`;
  const email = `mass-delete-${suffix}@test.local`;
  await createVerifiedUser(request, username, email);
  await signIn(request, username, TEST_AUTH_PASSWORD);

  const titles = [
    `bleach ${suffix}`,
    `code geass lelouch of rebellion ${suffix}`,
    `dragon ball z ${suffix}`,
  ];
  const groupedTitles = titles.join(" | ");
  const createResponse = await request.post("/ezq", {
    data: { query: `/c (${groupedTitles}) type:anime` },
  });
  expect(createResponse.ok()).toBeTruthy();

  const createdRows = (await createResponse.json()).rows as Array<{
    id: string;
    title: string;
  }>;
  expect(createdRows).toHaveLength(3);

  const codeGeass = createdRows.find((row) => row.title === titles[1]);
  expect(codeGeass).toBeDefined();
  const enrichedTitle = `Code Geass: Lelouch of the Rebellion ${suffix}`;
  const enrichmentResponse = await request.patch(`/library/${codeGeass?.id}`, {
    multipart: { title: enrichedTitle },
  });
  expect(enrichmentResponse.ok()).toBeTruthy();

  await openQueryPage(page, username, TEST_AUTH_PASSWORD);
  await executeQuery(page, `/d (${groupedTitles}) type:anime #e:o`);

  await expect(
    page.getByText("Retrieved 3 results", { exact: true })
  ).toBeVisible();
  for (const title of [titles[0], enrichedTitle, titles[2]]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }

  await executeQuery(page, `/s (${groupedTitles}) type:anime`);
  await expect(
    page.getByText("No results found", { exact: true })
  ).toBeVisible();
});
