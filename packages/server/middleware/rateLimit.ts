import type { Request, RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
};

export function rateLimit({
  windowMs,
  max,
  key = (req) => req.ip ?? "unknown",
}: RateLimitOptions): RequestHandler {
  const hits = new Map<string, number[]>();

  return (req, res, next) => {
    const now = Date.now();
    const cutoff = now - windowMs;
    const bucketKey = key(req);
    const timestamps = (hits.get(bucketKey) ?? []).filter(
      (hit) => hit > cutoff
    );

    if (timestamps.length >= max) {
      return res.status(429).json({ message: "Too many requests" });
    }

    timestamps.push(now);
    hits.set(bucketKey, timestamps);
    next();
  };
}
