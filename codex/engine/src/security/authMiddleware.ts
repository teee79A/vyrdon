import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { getAdminToken } from "./secretVault";

function extractProvidedToken(req: Request): string | null {
  const headerToken = req.header("x-vyrdon-token");
  if (headerToken) {
    return headerToken.trim();
  }

  const auth = req.header("authorization")?.trim();
  if (!auth) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match ? match[1].trim() : null;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function controlledApiAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "GET" && req.path === "/health") {
    next();
    return;
  }

  if (req.method === "GET" && req.path === "/engineering-review") {
    next();
    return;
  }

  let expected: string;
  try {
    expected = getAdminToken();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Admin token unavailable";
    res.status(503).json({ error: msg });
    return;
  }

  const provided = extractProvidedToken(req);
  if (!provided || !timingSafeEqualStr(expected, provided)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
