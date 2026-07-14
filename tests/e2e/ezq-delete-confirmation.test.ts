import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/auth";
import { openQueryPage } from "../helpers/queryPage";

test("delete queries require confirmation before they are submitted", async ({
  request,
  page,
}) => {
  await signIn(request);
  const suffix = Date.now();
  const title = `delete confirmation ${suffix}`;
  const titleToken = title.replace(/ /g, "_");

  const createResponse = await request.post("/ezq", {
    data: { query: `/create ${titleToken}` },
  });
  expect(createResponse.ok()).toBeTruthy();

  await openQueryPage(page);
  const input = page.getByPlaceholder("Query your library with EZQ");
  const deleteQuery = `/delete ${titleToken} #e:o`;
  await input.fill(deleteQuery);

  const previewRequestPromise = page.waitForRequest((candidate) => {
    if (
      new URL(candidate.url()).pathname !== "/ezq" ||
      candidate.method() !== "POST"
    ) {
      return false;
    }

    const query = candidate.postDataJSON().query as string;
    return query === `/search title:${titleToken}`;
  });
  const unexpectedDeleteRequest = page
    .waitForRequest(
      (candidate) => {
        if (
          new URL(candidate.url()).pathname !== "/ezq" ||
          candidate.method() !== "POST"
        ) {
          return false;
        }

        const query = candidate.postDataJSON().query as string;
        return query.startsWith("/delete");
      },
      { timeout: 750 }
    )
    .catch(() => null);
  await input.press("Enter");
  await previewRequestPromise;

  const dialog = page.getByRole("alertdialog", {
    name: "Run delete query?",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("This query currently matches 1 entry.");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await unexpectedDeleteRequest).toBeNull();

  const stillPresentResponse = await request.post("/ezq", {
    data: { query: `/search ${titleToken}` },
  });
  expect(stillPresentResponse.ok()).toBeTruthy();
  expect((await stillPresentResponse.json()).rows).toHaveLength(1);

  await input.press("Enter");
  await expect(dialog).toBeVisible();
  const deleteResponsePromise = page.waitForResponse((candidate) => {
    if (
      new URL(candidate.url()).pathname !== "/ezq" ||
      candidate.request().method() !== "POST"
    ) {
      return false;
    }

    const query = candidate.request().postDataJSON().query as string;
    return query.startsWith("/delete");
  });
  await dialog
    .getByRole("button", { name: "Delete entries", exact: true })
    .click();
  expect((await deleteResponsePromise).ok()).toBeTruthy();

  await expect(
    page.getByText("Retrieved 1 result", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  const deletedResponse = await request.post("/ezq", {
    data: { query: `/search ${titleToken}` },
  });
  expect(deletedResponse.ok()).toBeTruthy();
  expect((await deletedResponse.json()).rows).toEqual([]);
});
