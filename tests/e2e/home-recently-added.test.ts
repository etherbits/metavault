import { expect, test } from "@playwright/test";
import { createVerifiedUser, signIn } from "../helpers/auth";
import { signInPage, WEB_BASE_URL } from "../helpers/queryPage";

test("Recently added displays the three newest library entries", async ({
  request,
  page,
}) => {
  const suffix = Date.now();
  const username = `recent${String(suffix).slice(-9)}`;
  await createVerifiedUser(
    request,
    username,
    `recently-added-${suffix}@test.local`
  );
  await signIn(request, username);
  const titles = [
    `recent first ${suffix}`,
    `recent second ${suffix}`,
    `recent third ${suffix}`,
  ];
  const createResponse = await request.post("/ezq", {
    data: {
      query: `/create ${titles.map((title) => title.replaceAll(" ", "_")).join(" | ")}`,
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await signInPage(page, username);
  const sortedLibraryRequest = page.waitForRequest((candidate) => {
    if (
      new URL(candidate.url()).pathname !== "/ezq" ||
      candidate.method() !== "POST"
    ) {
      return false;
    }

    const query = candidate.postDataJSON().query as string;
    return query === "/search sort:created_at:descending";
  });
  await page.goto(`${WEB_BASE_URL}/app/home`);
  await sortedLibraryRequest;

  const recentlyAdded = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Recently added", exact: true }),
  });
  for (const title of titles) {
    await expect(
      recentlyAdded.getByRole("heading", { name: title, exact: true })
    ).toBeVisible();
  }
});
