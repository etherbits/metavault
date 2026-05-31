import { parsedEnv } from "../../../env";
import { defineConfig, requiredString } from "../config";

export const igdbConfig = defineConfig({
  clientId: {
    schema: requiredString,
    label: "Client ID",
    required: true,
    secret: false,
  },
  apiKey: {
    schema: requiredString,
    label: "Access Token",
    secret: true,
    required: true,
  },
});

export const IGDB_GAMES_ENDPOINT = parsedEnv.METAVAULT_IGDB_GAMES_ENDPOINT;
