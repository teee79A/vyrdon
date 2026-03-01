import os from "os";
import { getBootstrap } from "../system/bootstrapLoader";
import { appendJournal, verifyIntegrity } from "./memoryEngine";

export type GuardExecutionResult = Record<string, unknown>;

export function executeGuard(intentType: string): GuardExecutionResult {
  const bootstrap = getBootstrap();

  if (!bootstrap.domain_split.guard_domain.includes(intentType)) {
    throw new Error("Not allowed in Guard Domain.");
  }

  switch (intentType) {
    case "OS_HEALTH_CHECK": {
      const health = {
        cpuLoad1m: os.loadavg()[0],
        freeMemGB: Math.round(os.freemem() / (1024 * 1024 * 1024)),
        totalMemGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
        uptimeSec: Math.round(os.uptime())
      };
      appendJournal(`Guard: OS_HEALTH_CHECK ${JSON.stringify(health)}`);
      return health;
    }

    case "MEMORY_CHECK": {
      const memUsage = {
        totalGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
        freeGB: Math.round(os.freemem() / (1024 * 1024 * 1024))
      };
      appendJournal(`Guard: MEMORY_CHECK ${JSON.stringify(memUsage)}`);
      return memUsage;
    }

    case "INTEGRITY_VERIFY": {
      verifyIntegrity();
      appendJournal("Guard: INTEGRITY_VERIFY PASS");
      return { status: "CHECKED", integrity: "PASS" };
    }

    default:
      throw new Error(`Guard action not implemented: ${intentType}`);
  }
}
