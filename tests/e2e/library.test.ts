import { execFileSync } from "node:child_process";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { signIn } from "../helpers/auth";
import { signInPage, WEB_BASE_URL } from "../helpers/queryPage";
import { TEST_AUTH_USER_ID } from "../test-user";

const CSV_HEADERS =
  "title,media_id,source_id,media_type,status,image_src,released_at,public_rating,personal_rating,major_tags,minor_tags";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

function csvUpload(csv: string) {
  return {
    name: "library.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  };
}

function bundleUpload(buffer: Buffer) {
  return {
    name: "library.zip",
    mimeType: "application/zip",
    buffer,
  };
}

function imageUpload() {
  return {
    name: "pixel.png",
    mimeType: "image/png",
    buffer: PNG_1X1,
  };
}

function csvCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function csvLine(values: string[]) {
  return values.map(csvCell).join(",");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function imageSrcToFsPath(imageSrc: string) {
  const mediaRoot = process.env.MEDIA_ROOT;
  if (!mediaRoot || !imageSrc.startsWith("/media/")) {
    throw new Error("Cannot resolve image_src for test");
  }

  return path.resolve(mediaRoot, imageSrc.slice("/media/".length));
}

function getSourceIntegrationId(userId: string, integrationType: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for source integration lookup");
  }

  const output = execFileSync(
    "bun",
    [
      "-e",
      `
        const { SQL } = await import("bun");
        const sql = new SQL(Bun.argv[1]);
        const rows = await sql\`
          SELECT id
          FROM source_integrations
          WHERE user_id = \${Bun.argv[2]}
          AND integration_type = \${Bun.argv[3]}
          LIMIT 1
        \`;
        console.log(rows[0]?.id ?? "");
      `,
      databaseUrl,
      userId,
      integrationType,
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  ).trim();

  return output || undefined;
}

test("library CRUD works for an authenticated user", async ({ request }) => {
  await signIn(request);

  const title = "Library E2E Entry";
  const updatedTitle = "Library E2E Entry Updated";
  const mediaId = "library-e2e-media";
  const createResponse = await request.post("/library", {
    multipart: {
      title,
      media_id: mediaId,
      media_type: "movie",
      status: "planning",
      released_at: "2026-05-19",
      public_rating: "",
      personal_rating: "5",
    },
  });

  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  expect(created).toMatchObject({
    title,
    media_id: mediaId,
    media_type: "movie",
    status: "planning",
    released_at: "2026-05-19",
    public_rating: null,
    personal_rating: 5,
  });

  const listResponse = await request.get("/library");
  expect(listResponse.ok()).toBeTruthy();
  const entries = (await listResponse.json()) as Array<{ id: string }>;
  expect(entries.map((entry) => entry.id)).toContain(created.id);

  const getResponse = await request.get(`/library/${created.id}`);
  expect(getResponse.ok()).toBeTruthy();
  expect(await getResponse.json()).toEqual(
    expect.objectContaining({ id: created.id })
  );

  const patchResponse = await request.patch(`/library/${created.id}`, {
    multipart: { status: "in_progress" },
  });
  expect(patchResponse.ok()).toBeTruthy();
  expect(await patchResponse.json()).toEqual(
    expect.objectContaining({ status: "in_progress" })
  );

  const putResponse = await request.put(`/library/${created.id}`, {
    multipart: { title: updatedTitle, status: "finished" },
  });
  expect(putResponse.ok()).toBeTruthy();
  expect(await putResponse.json()).toEqual(
    expect.objectContaining({
      title: updatedTitle,
      status: "finished",
    })
  );

  const deleteResponse = await request.delete(`/library/${created.id}`);
  expect(deleteResponse.ok()).toBeTruthy();
  expect(await deleteResponse.json()).toEqual({
    message: "Entry deleted successfully",
  });

  const deletedResponse = await request.get(`/library/${created.id}`);
  expect(deletedResponse.status()).toBe(404);
});

test("detail page shows and updates personal rating in half-star steps", async ({
  page,
  request,
}) => {
  await signIn(request);

  const title = `Personal Rating Detail ${Date.now()}`;
  const createResponse = await request.post("/library", {
    multipart: {
      title,
      media_id: `personal-rating-detail-${Date.now()}`,
      media_type: "anime",
      status: "planning",
      public_rating: "2",
      personal_rating: "5.5",
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as { id: string };

  await signInPage(page);
  await page.goto(`${WEB_BASE_URL}/app/detail/${created.id}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  const ratingSlider = page.getByRole("slider", {
    name: "Personal rating",
  });
  await expect(ratingSlider).toHaveAttribute("aria-valuenow", "5.5");

  const bounds = await ratingSlider.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) {
    throw new Error("Personal rating slider was not visible");
  }

  const patchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === `/library/${created.id}` &&
      response.request().method() === "PATCH"
    );
  });

  await ratingSlider.click({
    position: {
      x: bounds.width * 0.91,
      y: bounds.height / 2,
    },
  });
  await expect((await patchResponse).ok()).toBeTruthy();
  await expect(ratingSlider).toHaveAttribute("aria-valuenow", "10");

  const getResponse = await request.get(`/library/${created.id}`);
  expect(getResponse.ok()).toBeTruthy();
  expect(await getResponse.json()).toEqual(
    expect.objectContaining({ personal_rating: 10 })
  );

  const deleteResponse = await request.delete(`/library/${created.id}`);
  expect(deleteResponse.ok()).toBeTruthy();
});

test("library CSV import skips invalid rows and reports counts", async ({
  request,
}) => {
  await signIn(request);

  const validTitle = `CSV Import Valid ${Date.now()}`;
  const csv = [
    CSV_HEADERS,
    csvLine([
      validTitle,
      "csv-import-media",
      "",
      "movie",
      "planning",
      "",
      "2025-01-02",
      "7.5",
      "8",
      "space\\,opera,cozy\\\\mystery",
      "slow\\,burn",
    ]),
    csvLine([
      "",
      "missing-title-media",
      "",
      "movie",
      "planning",
      "",
      "",
      "5",
      "5",
      "",
      "",
    ]),
    csvLine([
      "Bad Media Type",
      "bad-media",
      "",
      "podcast",
      "planning",
      "",
      "",
      "5",
      "5",
      "",
      "",
    ]),
    csvLine([
      "Bad Rating",
      "bad-rating",
      "",
      "book",
      "finished",
      "",
      "",
      "not-a-rating",
      "5",
      "",
      "",
    ]),
    '"Unclosed Quote,bad-quote,,book,finished,,5,5',
  ].join("\n");

  const importResponse = await request.post("/library/import/csv", {
    multipart: {
      file: csvUpload(csv),
    },
  });

  expect(importResponse.status()).toBe(201);
  const result = await importResponse.json();
  expect(result).toMatchObject({
    importedCount: 1,
    skippedCount: 4,
    warnings: [],
  });
  const importedId = result.entries[0].id;
  expect(result.entries).toHaveLength(1);
  expect(result.entries[0]).toMatchObject({
    title: validTitle,
    media_id: "csv-import-media",
    media_type: "movie",
    status: "planning",
    released_at: "2025-01-02",
    public_rating: 7.5,
    personal_rating: 8,
  });

  const tagExportResponse = await request.post("/library/export/csv", {
    data: { ids: [importedId] },
  });
  expect(tagExportResponse.ok()).toBeTruthy();
  const exportedTagCsv = await tagExportResponse.text();
  const [tagHeaderLine, tagDataLine] = exportedTagCsv.split("\n");
  const tagHeaders = parseCsvLine(tagHeaderLine);
  const tagValues = parseCsvLine(tagDataLine);
  expect(tagValues[tagHeaders.indexOf("major_tags")]).toBe(
    "cozy\\\\mystery,space\\,opera"
  );
  expect(tagValues[tagHeaders.indexOf("minor_tags")]).toBe("slow\\,burn");

  const listResponse = await request.get("/library");
  expect(listResponse.ok()).toBeTruthy();
  const entries = (await listResponse.json()) as Array<{ title: string }>;
  const titles = entries.map((entry) => entry.title);
  expect(titles).toContain(validTitle);
  expect(titles).not.toContain("Bad Media Type");
  expect(titles).not.toContain("Bad Rating");
  expect(titles).not.toContain("Unclosed Quote");
});

test("library CSV import accepts title-only files", async ({ request }) => {
  await signIn(request);

  const title = `CSV Title Only ${Date.now()}`;
  const importResponse = await request.post("/library/import/csv", {
    multipart: {
      file: csvUpload(["title", title].join("\n")),
    },
  });

  expect(importResponse.status()).toBe(201);
  const result = await importResponse.json();
  expect(result).toMatchObject({
    importedCount: 1,
    skippedCount: 0,
    warnings: [],
  });
  expect(result.entries[0]).toMatchObject({
    title,
    media_id: null,
    media_type: null,
    status: null,
  });
});

test("library CSV import maps old source IDs to the current user's integration", async ({
  request,
}) => {
  await signIn(request);

  const settingsResponse = await request.put("/source-integrations/tmdb", {
    data: {
      is_active: true,
      config: { apiKey: "tmdb-import-map-key" },
    },
  });
  expect(settingsResponse.ok()).toBeTruthy();

  const tmdbSourceId = getSourceIntegrationId(TEST_AUTH_USER_ID, "tmdb");
  expect(tmdbSourceId).toBeTruthy();

  const title = `CSV Source Map ${Date.now()}`;
  const importResponse = await request.post("/library/import/csv", {
    multipart: {
      file: csvUpload(
        [
          CSV_HEADERS,
          csvLine([
            title,
            "source-map-media",
            "old-export-source-id",
            "movie",
            "planning",
            "",
            "",
            "",
            "",
            "",
            "",
          ]),
        ].join("\n")
      ),
    },
  });

  expect(importResponse.status()).toBe(201);
  const result = await importResponse.json();
  expect(result.entries[0]).toMatchObject({
    title,
    source_id: tmdbSourceId,
  });
});

test("library CSV export returns rows and rejects zero matches", async ({
  request,
}) => {
  await signIn(request);

  const title = `CSV Export Title\nWith Newline ${Date.now()}`;
  const createResponse = await request.post("/library", {
    multipart: {
      title,
      media_id: "csv-export-media",
      media_type: "book",
      status: "finished",
      released_at: "2024-12-31",
      public_rating: "9",
      personal_rating: "10",
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as { id: string };

  const exportResponse = await request.post("/library/export/csv", {
    data: {
      ids: [created.id, "missing-export-id"],
    },
  });

  expect(exportResponse.status()).toBe(200);
  expect(
    exportResponse.headers()["x-metavault-requested-count"]
  ).toBeUndefined();
  expect(
    exportResponse.headers()["x-metavault-exported-count"]
  ).toBeUndefined();

  const csv = await exportResponse.text();
  expect(csv).toContain(title.replace(/\r?\n/g, " "));
  expect(csv).toContain("2024-12-31");
  expect(csv).not.toContain(title);
  expect(csv.split("\n")).toHaveLength(2);

  const exportAllResponse = await request.post("/library/export/csv", {
    data: {},
  });
  expect(exportAllResponse.status()).toBe(200);
  expect(await exportAllResponse.text()).toContain(
    title.replace(/\r?\n/g, " ")
  );

  const emptyExportResponse = await request.post("/library/export/csv", {
    data: {
      ids: ["missing-export-id-1", "missing-export-id-2"],
    },
  });

  expect(emptyExportResponse.status()).toBe(404);
  expect(emptyExportResponse.headers()["content-disposition"]).toBeUndefined();
  expect(emptyExportResponse.headers()["content-type"]).toContain(
    "application/json"
  );
  expect(await emptyExportResponse.json()).toEqual({
    message: "Unable to export any entry",
  });
});

test("library bundle export handles remote and local images", async ({
  request,
}) => {
  await signIn(request);

  const remoteTitle = `Bundle Remote ${Date.now()}`;
  const remoteCsv = [
    CSV_HEADERS,
    csvLine([
      remoteTitle,
      "remote-media",
      "",
      "movie",
      "finished",
      "https://example.com/poster.webp",
      "2023-03-04",
      "8",
      "9",
      "",
      "",
    ]),
  ].join("\n");
  const remoteImportResponse = await request.post("/library/import/csv", {
    multipart: { file: csvUpload(remoteCsv) },
  });
  expect(remoteImportResponse.status()).toBe(201);
  const remoteEntry = (await remoteImportResponse.json()).entries[0] as {
    id: string;
  };

  const localCreateResponse = await request.post("/library", {
    multipart: {
      title: `Bundle Local ${Date.now()}`,
      media_type: "book",
      image: imageUpload(),
    },
  });
  expect(localCreateResponse.status()).toBe(201);
  const localEntry = (await localCreateResponse.json()) as {
    id: string;
    image_src: string;
  };

  const exportResponse = await request.post("/library/export/bundle", {
    data: { ids: [remoteEntry.id, localEntry.id] },
  });
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-type"]).toContain("application/zip");

  const files = unzipSync(await exportResponse.body());
  expect(files["library.csv"]).toBeDefined();
  expect(files[`images/${localEntry.id}/original.webp`]).toBeDefined();
  expect(files[`images/${remoteEntry.id}/original.webp`]).toBeUndefined();

  const exportedCsv = strFromU8(files["library.csv"]);
  expect(exportedCsv).toContain("https://example.com/poster.webp");
  expect(exportedCsv).toContain(localEntry.image_src);
});

test("library bundle import recreates local images and warns for missing images", async ({
  request,
}) => {
  await signIn(request);

  const sourceCreateResponse = await request.post("/library", {
    multipart: {
      title: `Bundle Source ${Date.now()}`,
      media_type: "game",
      image: imageUpload(),
    },
  });
  expect(sourceCreateResponse.status()).toBe(201);
  const sourceEntry = (await sourceCreateResponse.json()) as {
    id: string;
    image_src: string;
  };

  const exportResponse = await request.post("/library/export/bundle", {
    data: { ids: [sourceEntry.id] },
  });
  expect(exportResponse.status()).toBe(200);

  const importResponse = await request.post("/library/import/bundle", {
    multipart: { file: bundleUpload(await exportResponse.body()) },
  });
  expect(importResponse.status()).toBe(201);
  const importResult = await importResponse.json();
  expect(importResult).toMatchObject({
    importedCount: 1,
    skippedCount: 0,
    warnings: [],
  });
  expect(importResult.entries[0].image_src).toMatch(/^\/media\//);
  expect(importResult.entries[0].image_src).not.toBe(sourceEntry.image_src);

  const missingImageTitle = `Bundle Missing Image ${Date.now()}`;
  const missingImageCsv = [
    CSV_HEADERS,
    csvLine([
      missingImageTitle,
      "missing-image-media",
      "",
      "book",
      "planning",
      "/media/users/export-user/library/missing-entry/original.webp",
      "",
      "",
      "",
      "",
      "",
    ]),
  ].join("\n");
  const missingImageZip = Buffer.from(
    zipSync({ "library.csv": strToU8(missingImageCsv) })
  );

  const missingImageResponse = await request.post("/library/import/bundle", {
    multipart: { file: bundleUpload(missingImageZip) },
  });
  expect(missingImageResponse.status()).toBe(201);
  const missingImageResult = await missingImageResponse.json();
  expect(missingImageResult).toMatchObject({
    importedCount: 1,
    skippedCount: 0,
  });
  expect(missingImageResult.entries[0]).toMatchObject({
    title: missingImageTitle,
    image_src: null,
  });
  expect(missingImageResult.warnings).toEqual([
    expect.objectContaining({
      entryTitle: missingImageTitle,
      field: "image_src",
    }),
  ]);
});

test("library bundle export reports missing local images and rejects zero matches", async ({
  request,
}) => {
  await signIn(request);

  const createResponse = await request.post("/library", {
    multipart: {
      title: `Bundle Missing Export ${Date.now()}`,
      image: imageUpload(),
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as {
    id: string;
    image_src: string;
  };
  await unlink(imageSrcToFsPath(created.image_src));

  const exportResponse = await request.post("/library/export/bundle", {
    data: { ids: [created.id] },
  });
  expect(exportResponse.status()).toBe(200);
  const files = unzipSync(await exportResponse.body());
  expect(files[`images/${created.id}/original.webp`]).toBeUndefined();
  expect(files["warnings.json"]).toBeDefined();
  expect(JSON.parse(strFromU8(files["warnings.json"]))).toEqual({
    warnings: [
      expect.objectContaining({
        entryId: created.id,
        field: "image_src",
      }),
    ],
  });

  const exportAllResponse = await request.post("/library/export/bundle", {
    data: { ids: [] },
  });
  expect(exportAllResponse.status()).toBe(200);
  expect(
    unzipSync(await exportAllResponse.body())["library.csv"]
  ).toBeDefined();

  const emptyExportResponse = await request.post("/library/export/bundle", {
    data: { ids: ["missing-bundle-export-id"] },
  });
  expect(emptyExportResponse.status()).toBe(404);
  expect(emptyExportResponse.headers()["content-disposition"]).toBeUndefined();
  expect(await emptyExportResponse.json()).toEqual({
    message: "Unable to export any entry",
  });
});

test("library bundle import rejects malformed or unsafe bundles", async ({
  request,
}) => {
  await signIn(request);

  const malformedResponse = await request.post("/library/import/bundle", {
    multipart: {
      file: bundleUpload(Buffer.from("not a zip")),
    },
  });
  expect(malformedResponse.status()).toBe(400);
  expect(await malformedResponse.json()).toEqual({
    message: "Bundle file is malformed",
  });

  const missingCsvResponse = await request.post("/library/import/bundle", {
    multipart: {
      file: bundleUpload(Buffer.from(zipSync({ "notes.txt": strToU8("hi") }))),
    },
  });
  expect(missingCsvResponse.status()).toBe(400);
  expect(await missingCsvResponse.json()).toEqual({
    message: "Bundle file must include library.csv",
  });

  const unsafeResponse = await request.post("/library/import/bundle", {
    multipart: {
      file: bundleUpload(
        Buffer.from(
          zipSync({
            "library.csv": strToU8(CSV_HEADERS),
            "../evil.txt": strToU8("bad"),
          })
        )
      ),
    },
  });
  expect(unsafeResponse.status()).toBe(400);
  expect(await unsafeResponse.json()).toEqual({
    message: "Bundle file contains unsafe paths",
  });
});
