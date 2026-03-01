import { CodexEngine } from "./core/engine";
import { runEngineBootstrap } from "./core/engineBootstrap";
import { startServer } from "./api/server";

function main(): void {
  const bootstrap = runEngineBootstrap();
  const engine = new CodexEngine(bootstrap);
  const port = Number(process.env.CODEX_PORT ?? 4000);
  startServer(engine, port);
}

main();
