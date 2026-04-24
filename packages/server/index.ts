import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { sql } from "./db/index";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";
import { run_query } from "@etherbits/ezq-node";
import authRouter from "./auth/auth.controller";

const app = express();
const port = Number(process.env.PORT ?? 3435);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3534";

app.use(express.json());
app.use(cookieParser());
app.use(loggerMiddleware);
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);

app.use("/auth", authRouter);

// biome-ignore lint/correctness/noUnusedFunctionParameters: req unused but required by Express signature
app.get("/health", (req, res) => {
  console.log("API URL:", process.env.BUN_PUBLIC_API_URL);
  res.json({ status: "ok", uptime: process.uptime() });
});

// biome-ignore lint/correctness/noUnusedFunctionParameters: req unused but required by Express signature
app.get("/", (req, res) => {
  res.send(run_query("c attack tag:action,adventure:minor,dark tag:fantasy"));
});

app.get("/users", async (req, res) => {
  const users = await sql`SELECT id, username, email, created_at FROM users`;
  req.log.debug({ count: users.length }, "fetched users");
  res.json(users);
});

app.listen(port, () => {
  logger.info({ port }, "Server started");
});

export type Test = { a: "b" };
