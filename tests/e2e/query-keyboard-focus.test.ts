import { expect, test } from "@playwright/test";
import { openQueryPage } from "../helpers/queryPage";

test("query input is the first focus target on the query page", async ({
  page,
}) => {
  await openQueryPage(page);
  const input = page.getByPlaceholder("Query your library with EZQ");
  await expect(input).toBeEnabled();

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.keyboard.press("Tab");

  await expect(input).toBeFocused();
});
