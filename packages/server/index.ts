import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRouter from "./auth/auth.controller";
import { ezqRouter } from "./ezq/ezq.controller";
import { healthRouter } from "./health/health.controller";
import libraryRouter from "./library/library.controller";
import { logger } from "./logger";
import { loggerMiddleware } from "./middleware/logger";
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

app.use("/ezq", ezqRouter);
app.use("/auth", authRouter);
app.use("/library", libraryRouter);
app.use("/users", userRouter);
app.use("/health", healthRouter);

app.listen(port, () => {
  logger.info({ port }, "Server started");
});
