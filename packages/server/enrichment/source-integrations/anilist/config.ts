import { defineConfig, optionalString } from "../config";

export const anilistConfig = defineConfig({
  apiKey: {
    schema: optionalString,
    label: "API Key",
    secret: true,
    required: false,
  },
});

export const ANILIST_GRAPHQL_ENDPOINT =
  Bun.env.METAVAULT_ANILIST_GRAPHQL_ENDPOINT ?? "https://graphql.anilist.co";

// AniList GraphQL requests and Media search arguments:
// https://docs.anilist.co/guide/graphql
// https://studio.apollographql.com/sandbox/explorer?endpoint=https%3A%2F%2Fgraphql.anilist.co
export const ANILIST_MEDIA_SEARCH_QUERY = `
  query SearchAniListMedia($search: String!, $type: MediaType!) {
    Media(search: $search, type: $type, sort: SEARCH_MATCH) {
      id
      title {
        english
        romaji
        userPreferred
        native
      }
      type
      startDate {
        year
        month
        day
      }
      coverImage {
        extraLarge
        large
        medium
      }
      averageScore
      genres
      tags {
        name
      }
    }
  }
`;
