import { parsedEnv } from "../../../env";
import { defineConfig } from "../config";

export const openLibraryConfig = defineConfig({});

export const OPEN_LIBRARY_SEARCH_ENDPOINT =
  parsedEnv.METAVAULT_OPEN_LIBRARY_SEARCH_ENDPOINT;
export const OPEN_LIBRARY_COVER_BASE_URL =
  parsedEnv.METAVAULT_OPEN_LIBRARY_COVER_BASE_URL;
