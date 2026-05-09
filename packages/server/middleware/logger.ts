import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger";

export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestLogger = logger.child({
    reqId: crypto.randomUUID(),
    method: req.method,
    url: req.url,
  });
  req.log = requestLogger;

  const start = Date.now();
  res.on("finish", () => {
    requestLogger.info(
      { status: res.statusCode, ms: Date.now() - start },
      "request"
    );
  });

  next();
}
