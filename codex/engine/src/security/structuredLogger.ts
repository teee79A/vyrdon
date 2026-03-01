import fs from "fs";
import path from "path";
import { NextFunction, Request, Response } from "express";

const LOG_DIR = path.join(process.cwd(), "logs");
const API_LOG = path.join(LOG_DIR, "api.log");

function redactHeaders(headers: Request["headers"]): Record<string, string | string[] | undefined> {
  const clone: Record<string, string | string[] | undefined> = { ...headers };
  const secretHeaders = ["authorization", "x-vyrdon-token", "cookie"];
  for (const h of secretHeaders) {
    if (clone[h]) {
      clone[h] = "[REDACTED]";
    }
  }

  return clone;
}

function appendJsonLog(entry: Record<string, unknown>): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(API_LOG, `${JSON.stringify(entry)}\n`);
}

export function apiStructuredLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    appendJsonLog({
      ts: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      ip: req.ip || req.socket.remoteAddress || "unknown",
      ua: req.header("user-agent") || "unknown",
      headers: redactHeaders(req.headers)
    });
  });

  next();
}

export function securityLog(event: string, data: Record<string, unknown>): void {
  appendJsonLog({
    ts: new Date().toISOString(),
    level: "SECURITY",
    event,
    ...data
  });
}
