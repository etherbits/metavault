import express from "express";
import cors from "cors";
import { sql } from "./db/index";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";
import { EzqService } from "./ezq/ezq.service";
import type { Extras } from "../ezq/out/node/ezq";

const ezqService = new EzqService(sql);

const app = express();
const port = Number(process.env.PORT ?? 3435);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3534";

app.use(express.json());
app.use(loggerMiddleware);
app.use(
  cors({
    origin: clientOrigin,
  })
);

app.get("/health", (_, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/users", async (req, res) => {
  const users = await sql`SELECT id, username, email, created_at FROM users`;
  req.log.debug({ count: users.length }, "fetched users");
  res.json(users);
});

app.post("/ezq", async (req, res) => {
  const { query, extras } = req.body as {
    query: string;
    extras?: Extras;
  };

  const result = await ezqService.execute(query, extras ?? null);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json({ rows: result.rows });
});

app.listen(port, () => {
  logger.info({ port }, "Server started");
});
