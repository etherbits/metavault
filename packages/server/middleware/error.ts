import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { logger } from "../logger";

export const unexpectedErrorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  next
) => {
  const requestLogger = req.log ?? logger;

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file is too large"
        : "Unsupported image file";
    return res.status(400).json({ message });
  }

  requestLogger.error({ err: error }, "unexpected request error");

  if (res.headersSent) return next(error);

  res.status(500).json({ message: "Internal server error" });
};
