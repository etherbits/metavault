import { createHash } from "node:crypto";
import { logger } from "../logger";
import type { EnrichmentSourceType } from "./types";

const defaultTtlMs = 30 * 60 * 1000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class SourceIntegrationResponseCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown | null>>();

  constructor(private readonly sourceType: EnrichmentSourceType) {}

  async get<T>({
    key,
    label,
    load,
    ttlMs = defaultTtlMs,
  }: {
    key: string;
    label: string;
    load: () => Promise<T | null>;
    ttlMs?: number;
  }): Promise<T | null> {
    const now = Date.now();
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > now) {
      logger.debug(
        { sourceType: this.sourceType, cacheLabel: label },
        "Source integration response cache hit"
      );
      return cached.value as T;
    }
    if (cached) {
      this.entries.delete(key);
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      logger.debug(
        { sourceType: this.sourceType, cacheLabel: label },
        "Source integration response cache joined in-flight request"
      );
      return (await pending) as T | null;
    }

    const request = load().then((value) => {
      if (value !== null) {
        this.entries.set(key, {
          expiresAt: Date.now() + ttlMs,
          value,
        });
      }

      return value;
    });

    this.inFlight.set(key, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(key);
    }
  }
}

export function toSourceCacheKeyPart(value: string): string {
  return value.trim().toLowerCase();
}

export function toSourceCredentialCacheKeyPart(
  value: string | null | undefined
): string {
  const credential = value?.trim();
  if (!credential) return "";

  return createHash("sha256").update(credential).digest("hex").slice(0, 16);
}
