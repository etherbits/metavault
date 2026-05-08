import type { ErrorRequestHandler } from "express";
import { logger } from "../logger";

export const unexpectedErrorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  next
) => {
  const requestLogger = req.log ?? logger;

  requestLogger.error({ err: error }, "unexpected request error");

  if (res.headersSent) return next(error);

  res.status(500).json({ message: "Internal server error" });
};
