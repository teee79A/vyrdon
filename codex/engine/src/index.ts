import { CodexEngine } from "./core/engine";
import { runEngineBootstrap } from "./core/engineBootstrap";
import { startServer } from "./api/server";
import { enforceContainerOnlyRuntime } from "./system/runtimeBoundary";

function main(): void {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    throw new Error("Refusing to run as root. Use restricted service account.");
  }

  enforceContainerOnlyRuntime();

  const bootstrap = runEngineBootstrap();
  const engine = new CodexEngine(bootstrap);
  const port = Number(process.env.CODEX_PORT ?? 4000);
  startServer(engine, port);
}

main();
