import express from "express";

const port = Number(Bun.argv[2] ?? 3636);
const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/openai/v1/chat/completions", (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message?.role === "user")?.content;
  const toolMessage = messages.find((message) => message?.role === "tool");

  if (toolMessage) {
    const parsedToolContent = safeJsonParse(String(toolMessage.content ?? ""));
    const firstTitle =
      getFirstRecommendationTitle(parsedToolContent) ?? "the top match";
    const content = `I recommend ${firstTitle} because it best matches the requested mood.`;

    if (req.body?.stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.write(
        `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    return res.json({
      id: "chatcmpl-test-final",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: "stop",
        },
      ],
    });
  }

  if (
    req.body?.tools &&
    typeof lastUserMessage === "string" &&
    /recommend|suggest/i.test(lastUserMessage)
  ) {
    return res.json({
      id: "chatcmpl-test-tool",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "recommendation-call-1",
                type: "function",
                function: {
                  name: "generate_recommendations",
                  arguments: JSON.stringify({
                    prompt: lastUserMessage,
                    count: 2,
                    filters: {
                      adult: "exclude",
                      excludeExistingLibrary: true,
                    },
                  }),
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    });
  }

  res.json({
    id: "chatcmpl-test",
    object: "chat.completion",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: `Mock assistant used ${req.body?.model ?? "unknown-model"} with ${req.body?.messages?.length ?? 0} messages.`,
        },
        finish_reason: "stop",
      },
    ],
  });
});

app.post("/openai/v1/embeddings", (req, res) => {
  const inputs = Array.isArray(req.body?.input)
    ? req.body.input
    : [req.body?.input ?? ""];

  res.json({
    object: "list",
    data: inputs.map((input, index) => ({
      object: "embedding",
      index,
      embedding: mockEmbedding(String(input)),
    })),
    model: req.body?.model ?? "mock-embedding",
  });
});

app.post("/anilist", (req, res) => {
  const variables = req.body?.variables ?? {};
  if (variables.page && variables.perPage) {
    const type = variables.type === "MANGA" ? "MANGA" : "ANIME";
    return res.json({
      data: {
        Page: {
          media: catalogueMedia(type).slice(0, Number(variables.perPage)),
        },
      },
    });
  }

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
        isAdult: search.toLowerCase().includes("adult"),
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
        adult: search.toLowerCase().includes("adult"),
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

app.post("/igdb/v4/games", express.text({ type: "*/*" }), (req, res) => {
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

function catalogueMedia(type: "ANIME" | "MANGA") {
  if (type === "MANGA") {
    return [
      {
        id: 2001,
        title: {
          english: "Quiet Library Manga",
          romaji: null,
          userPreferred: null,
          native: null,
        },
        type,
        description: "A thoughtful reading mystery about books and memory.",
        startDate: { year: 2021, month: 2, day: 3 },
        coverImage: { extraLarge: "https://img.test/library-manga.jpg" },
        isAdult: false,
        averageScore: 82,
        popularity: 700,
        genres: ["Mystery"],
        tags: [{ name: "Books" }, { name: "Quiet" }],
      },
      {
        id: 2002,
        title: {
          english: "High Energy Sports Manga",
          romaji: null,
          userPreferred: null,
          native: null,
        },
        type,
        description: "A competitive sports story about teamwork and momentum.",
        startDate: { year: 2020, month: 6, day: 1 },
        coverImage: { extraLarge: "https://img.test/sports-manga.jpg" },
        isAdult: false,
        averageScore: 78,
        popularity: 650,
        genres: ["Sports"],
        tags: [{ name: "Teamwork" }, { name: "Competition" }],
      },
    ];
  }

  return [
    {
      id: 1001,
      title: {
        english: "Cozy Friendship Anime",
        romaji: null,
        userPreferred: null,
        native: null,
      },
      type,
      description: "A warm cozy adventure about friendship and gentle action.",
      startDate: { year: 2022, month: 4, day: 5 },
      coverImage: { extraLarge: "https://img.test/cozy-anime.jpg" },
      isAdult: false,
      averageScore: 91,
      popularity: 1000,
      genres: ["Adventure"],
      tags: [{ name: "Cozy" }, { name: "Friendship" }],
    },
    {
      id: 1002,
      title: {
        english: "Dark Horror Anime",
        romaji: null,
        userPreferred: null,
        native: null,
      },
      type,
      description: "A grim horror story with dread and violent secrets.",
      startDate: { year: 2019, month: 10, day: 9 },
      coverImage: { extraLarge: "https://img.test/horror-anime.jpg" },
      isAdult: true,
      averageScore: 85,
      popularity: 900,
      genres: ["Horror"],
      tags: [{ name: "Dark" }, { name: "Violence" }],
    },
  ];
}

function mockEmbedding(text: string) {
  const normalized = text.toLowerCase();
  return [
    score(normalized, ["cozy", "warm", "friendship", "gentle"]),
    score(normalized, ["dark", "horror", "dread", "violent"]),
    score(normalized, ["book", "books", "reading", "mystery"]),
    score(normalized, ["sports", "teamwork", "competition"]),
    score(normalized, ["anime"]),
    score(normalized, ["manga"]),
  ];
}

function score(text: string, words: string[]) {
  return words.reduce(
    (total, word) => total + (text.includes(word) ? 1 : 0),
    0
  );
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getFirstRecommendationTitle(value: unknown) {
  if (!value || typeof value !== "object" || !("items" in value)) {
    return null;
  }

  const items = value.items;
  if (!Array.isArray(items)) {
    return null;
  }

  const first = items[0];
  if (!first || typeof first !== "object" || !("title" in first)) {
    return null;
  }

  return typeof first.title === "string" ? first.title : null;
}
