import cors from "cors";
import express from "express";
import { sql } from "./db/index";
import { ezqController } from "./ezq/ezq.controller";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";

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
app.use("/ezq", ezqController);

app.get("/health", (_, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/users", async (req, res) => {
  const users = await sql`SELECT id, username, email, created_at FROM users`;
  req.log.debug({ count: users.length }, "fetched users");
  res.json(users);
});

app.listen(port, () => {
  logger.info({ port }, "Server started");
});
