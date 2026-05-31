import { defineConfig, optionalString } from "../config";

export const openLibraryConfig = defineConfig({
  apiKey: {
    schema: optionalString,
    label: "API Key",
    secret: true,
    required: false,
  },
});

export const OPEN_LIBRARY_SEARCH_ENDPOINT =
  Bun.env.METAVAULT_OPEN_LIBRARY_SEARCH_ENDPOINT ??
  "https://openlibrary.org/search.json";
export const OPEN_LIBRARY_COVER_BASE_URL =
  Bun.env.METAVAULT_OPEN_LIBRARY_COVER_BASE_URL ??
  "https://covers.openlibrary.org/b/id";
