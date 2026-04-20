import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

export const validateMiddleware = (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map((issue) => issue.message),
      });
    }

    req.body = result.data;
    next();
  };