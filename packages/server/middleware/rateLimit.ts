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
  let lastPrune = 0;

  const pruneExpiredBuckets = (cutoff: number) => {
    for (const [bucketKey, bucketHits] of hits) {
      const activeHits = bucketHits.filter((hit) => hit > cutoff);
      if (activeHits.length === 0) {
        hits.delete(bucketKey);
      } else if (activeHits.length !== bucketHits.length) {
        hits.set(bucketKey, activeHits);
      }
    }
  };

  return (req, res, next) => {
    const now = Date.now();
    const cutoff = now - windowMs;
    if (now - lastPrune > windowMs) {
      pruneExpiredBuckets(cutoff);
      lastPrune = now;
    }

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
