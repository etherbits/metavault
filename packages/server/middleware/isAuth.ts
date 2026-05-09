import jwt from "jsonwebtoken";
import "dotenv/config";
import type { NextFunction, Request, Response } from "express";

type AuthUser = {
  userId: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: "JWT secret is not configured" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
