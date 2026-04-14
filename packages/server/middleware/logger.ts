import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

declare global {
  namespace Express {
    interface Request {
      log: typeof logger;
    }
  }
}

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  req.log = logger.child({ reqId: crypto.randomUUID(), method: req.method, url: req.url });

  const start = Date.now();
  res.on("finish", () => {
    req.log.info({ status: res.statusCode, ms: Date.now() - start }, "request");
  });

  next();
}
