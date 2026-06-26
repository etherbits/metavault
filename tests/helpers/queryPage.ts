import { expect, type Page } from "@playwright/test";
import { canonicalizeEzqQuery } from "../../packages/web-client/src/features/library/ezqCanonical";
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
  const expectedQuery = normalizeEzqForRequestMatch(submittedQuery);
  const submittedIsAllSearch =
    submittedQuery === "/s" || submittedQuery === "/search";
  const currentIsAllSearch =
    currentQuery === "" || currentQuery === "/s" || currentQuery === "/search";
  const shouldWaitForResponse =
    submittedQuery.length > 0 && !(submittedIsAllSearch && currentIsAllSearch);

  await input.fill(query);

  const requestPromise = shouldWaitForResponse
    ? page
        .waitForRequest(
          (request) => {
            const url = new URL(request.url());
            if (url.pathname !== "/ezq" || request.method() !== "POST") {
              return false;
            }

            const bodyQuery = getEzqRequestQuery(request.postData());
            return (
              typeof bodyQuery === "string" &&
              normalizeEzqForRequestMatch(bodyQuery) === expectedQuery
            );
          },
          { timeout: 5000 }
        )
        .catch(() => null)
    : null;

  await input.press("Enter");
  const request = await requestPromise;
  const response = request ? await request.response() : null;
  if (response) expect(response.ok()).toBeTruthy();
  await expect(page.getByText("Executing query...")).toHaveCount(0);
}

function normalizeEzqForRequestMatch(query: string) {
  try {
    return canonicalizeEzqQuery(query);
  } catch {
    return query.trim();
  }
}

function getEzqRequestQuery(postData: string | null) {
  if (!postData) return undefined;

  try {
    const body = JSON.parse(postData) as { query?: unknown };
    return body.query;
  } catch {
    return undefined;
  }
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
