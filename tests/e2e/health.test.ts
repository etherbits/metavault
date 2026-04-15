import { expect, test } from "@playwright/test";

test("GET /health shows ok in browser", async ({ page }) => {
  await page.goto("/health");

  const body = await page.locator("body").textContent();
  const json = JSON.parse(body ?? "{}");

  expect(json.status).toBe("ok");
  expect(typeof json.uptime).toBe("number");
});
