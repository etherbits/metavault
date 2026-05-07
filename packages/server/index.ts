import cors from "cors";
import express from "express";
import { sql } from "./db/index";
import { ezqController } from "./ezq/ezq.controller";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";
import cookieParser from "cookie-parser";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";
import authRouter from "./auth/auth.controller";
import libraryRouter from "./library/library.controller";
import userRouter from "./user/user.controller";

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

app.use("/ezq", ezqController);
app.use("/auth", authRouter);
app.use("/library", libraryRouter);
app.use("/users", userRouter);

app.get("/health", (_, res) => {
  console.log("API URL:", process.env.BUN_PUBLIC_API_URL);
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(port, () => {
  logger.info({ port }, "Server started");
});
