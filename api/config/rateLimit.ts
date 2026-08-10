import { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { Config } from "./config";

const RATE_LIMIT_MESSAGE =
  "Too many requests. Please reduce your request rate. See rate limit headers for current limits, which can also be avoided by self-hosting";

export interface RateLimiters {
  // Applied to all API routes
  api: RequestHandler;
  // Stricter limiter applied to bulk endpoints
  bulk: RequestHandler;
}

const passthrough: RequestHandler = (request, response, next) => next();

const createLimiter = (windowMs: number, limit: number): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true, // RateLimit-* headers (draft-6)
    legacyHeaders: true, // X-RateLimit-* headers
    message: {
      status: 429,
      error: RATE_LIMIT_MESSAGE,
    },
    // The app intentionally defaults to `trust proxy = true` (see
    // config/express.ts); deployments harden this via TRUST_PROXY
    validate: { trustProxy: false },
  });

/**
 * Builds per-IP rate limiters from `config.defaults.rateLimit`
 *
 * Counters are in-process; when running multiple instances the effective
 * limit is `max` per instance. Set TRUST_PROXY to the number of reverse
 * proxy hops (e.g. 1 behind a single gateway) so limits key on the real
 * client IP rather than a spoofable X-Forwarded-For entry
 */
export const rateLimiters = (config: Config): RateLimiters => {
  const { enabled, windowMs, max, bulk } = config.defaults.rateLimit;
  if (!enabled) return { api: passthrough, bulk: passthrough };
  return {
    api: createLimiter(windowMs, max),
    bulk: createLimiter(bulk.windowMs, bulk.max),
  };
};
