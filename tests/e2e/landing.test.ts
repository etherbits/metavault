import { expect, test } from "@playwright/test";
import { signInPage, WEB_BASE_URL } from "../helpers/queryPage";

test("guest sees the landing page at the root", async ({ page }) => {
  await page.goto(WEB_BASE_URL);

  await expect(
    page.getByRole("heading", {
      name: "Build one library for every kind of media.",
    })
  ).toBeVisible();
  await expect(
    page.getByLabel("Public actions").getByRole("link", { name: "Log in" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account" }).first()
  ).toBeVisible();
  await expect(
    page.getByPlaceholder("Query your library with EZQ")
  ).toHaveValue("/c Dune type:Book status:Planning");
  await expect(page.getByText("Canonical", { exact: true })).toBeVisible();
  await expect(
    page.getByText("/create title:Dune type:Book status:Planning")
  ).toBeVisible();
  await expect(page.getByText("Query results")).toBeVisible();
  await expect(page.getByText("Parsed entry")).toHaveCount(0);
  await expect(page.getByText("24 entries")).toHaveCount(0);
  await expect(page.getByText("Live", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Assistant context")).toHaveCount(0);
});

test("landing page sections fill at least the viewport", async ({ page }) => {
  await page.goto(WEB_BASE_URL);
  await expect(
    page.getByRole("heading", {
      name: "Build one library for every kind of media.",
    })
  ).toBeVisible();

  const screenMetrics = await page
    .locator("[data-landing-screen]")
    .evaluateAll((screens) =>
      screens.map((screen) => ({
        name: screen.getAttribute("data-landing-screen"),
        height: Math.round(screen.getBoundingClientRect().height),
      }))
    );
  const viewportHeight = await page.evaluate(() => window.innerHeight);

  expect(screenMetrics.map((screen) => screen.name)).toEqual([
    "hero",
    "commands",
    "archive",
  ]);
  for (const screen of screenMetrics) {
    expect(screen.height).toBeGreaterThanOrEqual(viewportHeight);
  }
});

test("guest can navigate from landing page to auth pages", async ({ page }) => {
  await page.goto(WEB_BASE_URL);

  await page
    .getByLabel("Public actions")
    .getByRole("link", { name: "Log in" })
    .click();
  await expect(page).toHaveURL(`${WEB_BASE_URL}/login`);
  await expect(
    page.getByRole("heading", { name: "Log In", exact: true })
  ).toBeVisible();

  await page.goto(WEB_BASE_URL);
  await page.getByRole("link", { name: "Create account" }).first().click();
  await expect(page).toHaveURL(`${WEB_BASE_URL}/register`);
  await expect(
    page.getByRole("heading", { name: "Register", exact: true })
  ).toBeVisible();
});

test("signed-in user visiting the root lands in the app", async ({ page }) => {
  await signInPage(page);

  await page.goto(WEB_BASE_URL);

  await expect(page).toHaveURL(`${WEB_BASE_URL}/app/home`);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});
