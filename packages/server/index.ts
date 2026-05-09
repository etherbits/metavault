import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as ezqNode from "@etherbits/ezq-node";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";
import authRouter from "./auth/auth.controller";
import libraryRouter from "./library/library.controller";

type EzqRunQuery = (input: string) => unknown;

const runQuery =
  (ezqNode as { run_query?: EzqRunQuery; runQuery?: EzqRunQuery }).run_query ??
  (ezqNode as { run_query?: EzqRunQuery; runQuery?: EzqRunQuery }).runQuery;

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
  })
);

app.use("/auth", authRouter);
app.use("/library", libraryRouter);

// biome-ignore lint/correctness/noUnusedFunctionParameters: req unused but required by Express signature
app.get("/health", (req, res) => {
  console.log("API URL:", process.env.BUN_PUBLIC_API_URL);
  res.json({ status: "ok", uptime: process.uptime() });
});

// biome-ignore lint/correctness/noUnusedFunctionParameters: req unused but required by Express signature
app.get("/", (req, res) => {
  if (!runQuery) {
    res.status(500).send("EZQ parser function is not available");
    return;
  }

  res.send(runQuery("c attack tag:action,adventure:minor,dark tag:fantasy"));
});

app.listen(port, () => {
  logger.info({ port }, "Server started");
});

export type Test = { a: "b" };
