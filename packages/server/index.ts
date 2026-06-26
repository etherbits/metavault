import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "node:crypto";
import express from "express";
import { aiIntegrationRouter } from "./ai-integrations/ai-integration.controller";
import { aliasMappingRouter } from "./aliases/alias.controller";
import { assistantRouter } from "./assistant/assistant.controller";
import authRouter from "./auth/auth.controller";
import { catalogueRouter } from "./catalogue/catalogue.controller";
import { startCatalogueScheduler } from "./catalogue/catalogue-scheduler";
import { contentNodeRouter } from "./contentNode/contentNode.controller";
import { parsedEnv } from "./env";
import { ezqRouter } from "./ezq/ezq.controller";
import { healthRouter } from "./health/health.controller";
import libraryRouter from "./library/library.controller";
import collectionRouter from "./collection/collection.controller";
import { applySchema } from "./db";
import { logger } from "./logger";
import { mediaRouter } from "./media/media.controller";
import { unexpectedErrorMiddleware } from "./middleware/error";
import { loggerMiddleware } from "./middleware/logger";
import { rateLimit } from "./middleware/rateLimit";
import { recommendationRouter } from "./recommendations/recommendation.controller";
import { sourceIntegrationRouter } from "./source-integrations/source-integration.controller";
import userRouter from "./user/user.controller";

const app = express();

app.use(loggerMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: parsedEnv.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use("/health", healthRouter);
app.use(
  rateLimit({
    windowMs: parsedEnv.RATE_LIMIT_WINDOW_MS,
    max: parsedEnv.GLOBAL_RATE_LIMIT_MAX,
    key: (req) => {
      const accessToken = req.cookies?.access_token;
      if (typeof accessToken === "string" && accessToken.length > 0) {
        const sessionKey = crypto
          .createHash("sha256")
          .update(accessToken)
          .digest("hex");
        return `session:${sessionKey}`;
      }

      return `ip:${req.ip ?? "unknown"}`;
    },
    skip: (req) => req.path.startsWith("/auth/"),
  })
);
app.use("/media", mediaRouter);
app.use("/ezq", ezqRouter);
app.use("/auth", authRouter);
app.use("/library", libraryRouter);
app.use("/collections", collectionRouter);
app.use("/content-nodes", contentNodeRouter);
app.use("/source-integrations", sourceIntegrationRouter);
app.use("/ai-integrations", aiIntegrationRouter);
app.use("/aliases", aliasMappingRouter);
app.use("/assistant", assistantRouter);
app.use("/catalogue", catalogueRouter);
app.use("/recommendations", recommendationRouter);
app.use("/users", userRouter);
app.use(unexpectedErrorMiddleware);

await applySchema();
startCatalogueScheduler();

app.listen(parsedEnv.PORT, () => {
  logger.info({ port: parsedEnv.PORT }, "Server started");
});
