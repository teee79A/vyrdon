import express from "express";
import { CodexEngine } from "../core/engine";
import { controlledApiAuth } from "../security/authMiddleware";
import { apiRateLimiter } from "../security/rateLimiter";
import { apiStructuredLogger } from "../security/structuredLogger";
import { createRoutes } from "./routes";

export function startServer(engine: CodexEngine, port: number): void {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(apiStructuredLogger);
  app.use(apiRateLimiter);
  app.use(controlledApiAuth);
  app.use(createRoutes(engine));

  const bindHost = process.env.CODEX_BIND_HOST?.trim() || "127.0.0.1";
  app.listen(port, bindHost, () => {
    console.log(`Codex engine API listening at http://${bindHost}:${port}`);
  });
}
