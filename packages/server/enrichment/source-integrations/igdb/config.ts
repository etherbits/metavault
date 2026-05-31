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

export const IGDB_GAMES_ENDPOINT =
  Bun.env.METAVAULT_IGDB_GAMES_ENDPOINT ?? "https://api.igdb.com/v4/games";
