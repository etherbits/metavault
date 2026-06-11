import { describe, expect, test } from "bun:test"; // TODO: move testing to tests
import { mockLibraryRows } from "@/features/library/fixtures";
import {
  normalizeImportedItems,
  toServerExportPayload,
} from "@/features/library/importExport";
import { mapServerEntriesToMediaItems } from "@/features/library/mappers";

describe("library import/export normalization", () => {
  test("parses server-shaped rows as the preferred import contract", () => {
    const normalized = normalizeImportedItems(mockLibraryRows.slice(0, 1));
    expect(normalized[0]).toMatchObject({
      title: "Attack on Titan",
      type: "Anime",
      status: "Finished",
    });
  });

  test("exports UI items back to snake_case server rows", () => {
    const [item] = mapServerEntriesToMediaItems(mockLibraryRows.slice(0, 1));
    const [row] = toServerExportPayload([item]);
    expect(row).toMatchObject({
      title: item.title,
      media_type: "anime",
      status: "finished",
      public_rating: 9.5,
    });
  });
});
