import { describe, expect, test } from "bun:test";
import { paginateItems } from "@/features/library/pagination";

describe("pagination helpers", () => {
  test("keeps pagination bounded", () => {
    expect(paginateItems([1, 2, 3, 4, 5], 99, 2)).toEqual({
      totalPages: 3,
      currentPage: 3,
      items: [5],
    });
  });
});
