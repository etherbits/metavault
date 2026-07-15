import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";
import {
  executeQuery,
  expectQueryResult,
  openQueryPage,
} from "../helpers/queryPage";

test("query preview recovers from an unfinished parenthesis group", async ({
  request,
  page,
}) => {
  await signIn(request);
  await openQueryPage(page);

  const input = page.getByPlaceholder("Query your library with EZQ");

  await input.fill("/c (bleach |");
  await expect(input).toHaveValue("/c (bleach |");

  await input.fill("/c (bleach | code geass) type:anime");
  await expect(
    page.getByText(
      "/create media_type:anime title:bleach | media_type:anime title:code_geass",
      { exact: true }
    )
  ).toBeVisible();
});

test("query page distributes a shared qualifier across mass-created entries", async ({
  request,
  page,
}) => {
  await signIn(request);
  const integrationResponse = await request.put(
    "/source-integrations/anilist",
    {
      data: { is_active: true, config: {} },
    }
  );
  expect(integrationResponse.ok()).toBeTruthy();

  const query =
    "/c (bleach | code geass lelouch of rebellion | dragon ball z) type:anime #e:o";

  await openQueryPage(page);
  const input = page.getByPlaceholder("Query your library with EZQ");
  await input.fill(query);

  await expect(page.getByText("Unable to parse query")).toHaveCount(0);
  await expect(
    page.getByText(
      "/create media_type:anime title:bleach | media_type:anime title:code_geass_lelouch_of_rebellion | media_type:anime title:dragon_ball_z #e:o",
      { exact: true }
    )
  ).toBeVisible();

  await executeQuery(page, query);

  await expect(
    page.getByText("Retrieved 3 results", { exact: true })
  ).toBeVisible();
  await expectQueryResult(page, "bleach AniList");
  await expectQueryResult(page, "code geass lelouch of rebellion AniList");
  await expectQueryResult(page, "dragon ball z AniList");
  await expect(page.getByText("Anime", { exact: true })).toHaveCount(3);
});
