import express from "express";

const port = Number(Bun.argv[2] ?? 3636);
const app = express();

app.use(express.json());
app.use(express.text({ type: "*/*" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/anilist", (req, res) => {
  const variables = req.body?.variables ?? {};
  const search = String(variables.search ?? "AniList Entry");
  const type = variables.type === "MANGA" ? "MANGA" : "ANIME";

  res.json({
    data: {
      Media: {
        id: 8001,
        title: {
          english: `${search} AniList`,
          romaji: null,
          userPreferred: null,
          native: null,
        },
        type,
        startDate: { year: 2024, month: 4, day: 5 },
        coverImage: {
          extraLarge: "https://img.test/anilist-extra.jpg",
          large: null,
          medium: null,
        },
        averageScore: 87,
        genres: ["Action"],
        tags: [{ name: "Adaptation" }],
      },
    },
  });
});

app.get("/tmdb/3/search/movie", (req, res) => {
  const search = String(req.query.query ?? "TMDB Entry");
  res.json({
    results: [
      {
        id: 9001,
        title: `${search} TMDB`,
        poster_path: "/tmdb-poster.jpg",
        vote_average: 8.4,
        release_date: "2024-02-03",
        genre_ids: [28],
      },
    ],
  });
});

app.get("/tmdb/3/search/tv", (req, res) => {
  const search = String(req.query.query ?? "TMDB Entry");
  res.json({
    results: [
      {
        id: 9002,
        name: `${search} TMDB`,
        poster_path: "/tmdb-tv.jpg",
        vote_average: 8.2,
        first_air_date: "2023-08-09",
        genre_ids: [18],
      },
    ],
  });
});

app.get("/tmdb/3/genre/movie/list", (_req, res) => {
  res.json({
    genres: [{ id: 28, name: "Action" }],
  });
});

app.get("/tmdb/3/genre/tv/list", (_req, res) => {
  res.json({
    genres: [{ id: 18, name: "Drama" }],
  });
});

app.post("/igdb/v4/games", (req, res) => {
  const body = typeof req.body === "string" ? req.body : "";
  const match = body.match(/search "(.+?)"/);
  const search = match?.[1]?.replace(/\\"/g, '"') ?? "IGDB Entry";

  res.json([
    {
      id: 7001,
      name: `${search} IGDB`,
      cover: {
        url: "//images.igdb.com/igdb/image/upload/t_thumb/game.jpg",
      },
      rating: 91,
      first_release_date: 1_684_368_000,
      genres: [{ name: "Adventure" }, { name: "RPG" }],
    },
  ]);
});

app.get("/openlibrary/search.json", (req, res) => {
  const search = String(req.query.title ?? "OpenLibrary Entry");
  res.json({
    docs: [
      {
        key: "/works/OL9001W",
        title: `${search} OpenLibrary`,
        cover_i: 123_456,
        subject: ["Fantasy", "Magic"],
      },
    ],
  });
});

app.listen(port, () => {
  console.log(`Source integration mock server listening on ${port}`);
});
