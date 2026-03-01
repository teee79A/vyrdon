import express from "express";
import { CodexEngine } from "../core/engine";
import { createRoutes } from "./routes";

export function startServer(engine: CodexEngine, port: number): void {
  const app = express();
  app.use(express.json());
  app.use(createRoutes(engine));

  app.listen(port, "127.0.0.1", () => {
    console.log(`Codex engine API listening at http://127.0.0.1:${port}`);
  });
}
