import { expect, test } from "@playwright/test";
import { signInPage, WEB_BASE_URL } from "../helpers/queryPage";

test("settings page manages query aliases from compact rows", async ({
  page,
}) => {
  const aliasName = `settings_e2e_${Date.now()}`;
  const aliasExpansion = `tag:${aliasName}:major`;

  await signInPage(page);
  await page.goto(`${WEB_BASE_URL}/app/settings`);

  await expect(
    page.getByRole("heading", { name: "Settings", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Account Settings" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Query settings" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Change picture" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset password" })
  ).toBeVisible();
  await expect(page.getByLabel("Reset code")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Update username" })
  ).toBeDisabled();

  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page).toHaveURL(`${WEB_BASE_URL}/app/reset-password`);
  await expect(
    page.getByRole("heading", { name: "Reset password", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Send code" })).toBeVisible();
  await page.getByRole("button", { name: "Back to settings" }).click();
  await expect(page).toHaveURL(`${WEB_BASE_URL}/app/settings`);

  const saveButton = page.getByRole("button", { name: "Save" });
  await expect(saveButton).toBeDisabled();

  const addButton = page.getByRole("button", { name: "Add New" });
  await expect(addButton).toBeEnabled();
  await addButton.click();
  await page.getByLabel("Alias name").last().fill(aliasName);
  await page.getByLabel("EZQ expansion").last().fill(aliasExpansion);

  const saveResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === `/aliases/${aliasName}` &&
      response.request().method() === "PUT"
    );
  });

  await expect(saveButton).toBeEnabled();
  await page.getByLabel("EZQ expansion").last().press("Enter");
  await expect((await saveResponse).ok()).toBeTruthy();

  await page.reload();
  await expect(
    page.locator(`input[aria-label="Alias name"][value="${aliasName}"]`)
  ).toBeVisible();
  await expect(
    page.locator(`input[aria-label="EZQ expansion"][value="${aliasExpansion}"]`)
  ).toBeVisible();

  const deleteResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === `/aliases/${aliasName}` &&
      response.request().method() === "DELETE"
    );
  });

  await page.getByRole("button", { name: `Delete ${aliasName}` }).click();
  await expect((await deleteResponse).ok()).toBeTruthy();
  await expect(
    page.locator(`input[aria-label="Alias name"][value="${aliasName}"]`)
  ).toHaveCount(0);

  await page
    .getByRole("button", { name: "Permanently delete account" })
    .click();
  await expect(
    page.getByRole("alertdialog").getByText("Delete account?")
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Delete account?")).toHaveCount(0);
});
