import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { aiIntegrationRouter } from "./ai-integrations/ai-integration.controller";
import { assistantRouter } from "./assistant/assistant.controller";
import authRouter from "./auth/auth.controller";
import { parsedEnv } from "./env";
import { ezqRouter } from "./ezq/ezq.controller";
import { healthRouter } from "./health/health.controller";
import libraryRouter from "./library/library.controller";
import collectionRouter from "./collection/collection.controller";
import { logger } from "./logger";
import { unexpectedErrorMiddleware } from "./middleware/error";
import { loggerMiddleware } from "./middleware/logger";
import { rateLimit } from "./middleware/rateLimit";
import { MEDIA_ROOT } from "./storage/path.util";
import { sourceIntegrationRouter } from "./source-integrations/source-integration.controller";
import userRouter from "./user/user.controller";

const app = express();

app.use(loggerMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: parsedEnv.RATE_LIMIT_WINDOW_MS,
    max: parsedEnv.GLOBAL_RATE_LIMIT_MAX,
  })
);
app.use(
  cors({
    origin: parsedEnv.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use("/media", express.static(MEDIA_ROOT));
app.use("/ezq", ezqRouter);
app.use("/auth", authRouter);
app.use("/library", libraryRouter);
app.use("/collections", collectionRouter);
app.use("/source-integrations", sourceIntegrationRouter);
app.use("/ai-integrations", aiIntegrationRouter);
app.use("/assistant", assistantRouter);
app.use("/users", userRouter);
app.use("/health", healthRouter);
app.use(unexpectedErrorMiddleware);

app.listen(parsedEnv.PORT, () => {
  logger.info({ port: parsedEnv.PORT }, "Server started");
});
