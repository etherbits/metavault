import path from "node:path";
import { Router } from "express";
import { authMiddleware } from "../middleware/isAuth";
import { getUserMediaDir } from "./path.util";

export const mediaRouter = Router()
  .use(authMiddleware)
  .get(/^\/users\/([^/]+)\/(.+)$/, (req, res, next) => {
    const requestedUserId = req.params[0];
    const requestedPath = req.params[1];
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!requestedUserId || !requestedPath) {
      return res.status(404).json({ message: "Media not found" });
    }

    if (requestedUserId !== req.user.userId) {
      return res.status(404).json({ message: "Media not found" });
    }

    const userMediaDir = getUserMediaDir(req.user.userId);
    const resolvedPath = path.resolve(userMediaDir, requestedPath);
    const userMediaDirWithSeparator = `${userMediaDir}${path.sep}`;

    if (
      resolvedPath === userMediaDir ||
      !resolvedPath.startsWith(userMediaDirWithSeparator)
    ) {
      return res.status(400).json({ message: "Invalid media path" });
    }

    return res.sendFile(resolvedPath, (error) => {
      if (!error) return;
      if (res.headersSent) {
        return next(error);
      }

      const status =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : 404;

      return res
        .status(status === 404 ? 404 : 500)
        .json({ message: status === 404 ? "Media not found" : "Media error" });
    });
  });
