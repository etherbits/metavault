import { beforeEach, describe, expect, test } from "bun:test";
import {
  clearAuthStorage,
  readCachedProfile,
  writeCachedProfile,
} from "@/features/auth/storage";

const profile = {
  id: "user-1",
  username: "nika",
  email: "n@example.com",
  is_verified: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const localStorageMock = (() => {
  let store = new Map<string, string>();

  return {
    clear() {
      store = new Map();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

describe("auth profile cache storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("persists and reads the full public profile snapshot", () => {
    writeCachedProfile(profile);

    expect(readCachedProfile()).toEqual(profile);
    expect(localStorage.getItem("metavault.profile")).toBe(
      JSON.stringify(profile)
    );
    expect(localStorage.getItem("metavault.authenticated")).toBeNull();
    expect(localStorage.getItem("metavault.user")).toBeNull();
  });

  test("clears profile cache and legacy auth keys", () => {
    writeCachedProfile(profile);
    localStorage.setItem("metavault.authenticated", "true");
    localStorage.setItem("metavault.user", "{}");
    localStorage.setItem("metavault.username", "legacy");
    localStorage.setItem("metavault.email", "legacy@example.com");

    clearAuthStorage();

    expect(localStorage.getItem("metavault.profile")).toBeNull();
    expect(localStorage.getItem("metavault.authenticated")).toBeNull();
    expect(localStorage.getItem("metavault.user")).toBeNull();
    expect(localStorage.getItem("metavault.username")).toBeNull();
    expect(localStorage.getItem("metavault.email")).toBeNull();
  });

  test("ignores and clears an invalid cached profile", () => {
    localStorage.setItem(
      "metavault.profile",
      JSON.stringify({ username: "incomplete" })
    );

    expect(readCachedProfile()).toBeNull();
    expect(localStorage.getItem("metavault.profile")).toBeNull();
  });
});
