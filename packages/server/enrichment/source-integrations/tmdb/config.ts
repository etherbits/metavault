import { parsedEnv } from "../../../env";
import { defineConfig, requiredString } from "../config";

export const tmdbConfig = defineConfig({
  apiKey: {
    schema: requiredString,
    label: "API Key",
    secret: true,
    required: true,
  },
});

export const TMDB_API_BASE_URL = parsedEnv.METAVAULT_TMDB_API_BASE_URL;
export const TMDB_IMAGE_BASE_URL = parsedEnv.METAVAULT_TMDB_IMAGE_BASE_URL;
