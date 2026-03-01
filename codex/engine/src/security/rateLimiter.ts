import { NextFunction, Request, Response } from "express";

interface Bucket {
  windowStart: number;
  count: number;
}

const WINDOW_MS = Number.parseInt(process.env.API_RATE_LIMIT_WINDOW_MS ?? "60000", 10);
const MAX_REQUESTS = Number.parseInt(process.env.API_RATE_LIMIT_MAX ?? "120", 10);
const buckets = new Map<string, Bucket>();

function getClientKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const token = req.header("x-vyrdon-token") || "anonymous";
  return `${ip}:${token.slice(0, 12)}`;
}

export function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  const key = getClientKey(req);
  const current = buckets.get(key);

  if (!current || now - current.windowStart >= WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
    next();
    return;
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS) {
    res.status(429).json({ error: "Rate limit exceeded" });
    return;
  }

  next();
}
