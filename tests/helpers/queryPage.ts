import { expect, type Page } from "@playwright/test";
import { TEST_AUTH_PASSWORD, TEST_AUTH_USERNAME } from "../test-user";

export const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "http://localhost:3534";
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3435";

export async function signInPage(
  page: Page,
  username = TEST_AUTH_USERNAME,
  password = TEST_AUTH_PASSWORD
) {
  const response = await page
    .context()
    .request.post(`${API_BASE_URL}/auth/sign-in`, {
      data: {
        username,
        password,
      },
    });

  expect(response.ok()).toBeTruthy();
}

export async function openQueryPage(
  page: Page,
  username = TEST_AUTH_USERNAME,
  password = TEST_AUTH_PASSWORD,
  path = "/app/query"
) {
  await signInPage(page, username, password);
  await page.goto(`${WEB_BASE_URL}${path}`);
  await expect(page.getByRole("heading", { name: "Query" })).toBeVisible();
}

export async function executeQuery(page: Page, query: string) {
  const input = page.getByPlaceholder("Query your library with EZQ");
  await expect(input).toBeEnabled();

  const currentQuery =
    new URL(page.url()).searchParams.get("query")?.trim() ?? "";
  const submittedQuery = query.trim();
  const submittedIsAllSearch =
    submittedQuery === "/s" || submittedQuery === "/search";
  const currentIsAllSearch =
    currentQuery === "" || currentQuery === "/s" || currentQuery === "/search";
  const shouldWaitForResponse =
    submittedQuery.length > 0 && !(submittedIsAllSearch && currentIsAllSearch);

  await input.fill(query);

  const responsePromise = shouldWaitForResponse
    ? page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.pathname === "/ezq" && response.request().method() === "POST"
        );
      })
    : null;

  await input.press("Enter");
  const response = await responsePromise;
  if (response) expect(response.ok()).toBeTruthy();
  await expect(page.getByText("Executing query...")).toHaveCount(0);
}

export async function expectQueryResult(page: Page, title: string) {
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

export async function expectQueryResultOnAnyPage(page: Page, title: string) {
  const heading = page.getByRole("heading", { name: title });
  const nextButton = page.getByRole("button", { name: "Next page" });

  for (let pageIndex = 0; pageIndex < 25; pageIndex += 1) {
    try {
      await expect(heading).toBeVisible({ timeout: 500 });
      return;
    } catch {
      if ((await nextButton.count()) === 0 || !(await nextButton.isEnabled())) {
        break;
      }
      await nextButton.click();
    }
  }

  await expect(heading).toBeVisible();
}

export async function expectNoQueryResult(page: Page, title: string) {
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
}
