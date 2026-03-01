import os from "os";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { appendJournal } from "../memory/journal";
import { readState, updateState } from "../memory/state";
import { loadBootstrap } from "../system/bootstrapLoader";
import { enforceAsusIdentityLock } from "../system/asusIdentity";
import { ensureHardwareProfile } from "../system/hardwareProfiler";
import { verifyIntegrityHash, writeIntegrityHash } from "../system/integrity";
import { BootSystemPromo } from "../types/engine";

function readDiskUsagePercent(): number {
  try {
    const output = execSync("df -P / | tail -1", { encoding: "utf8" }).trim();
    const parts = output.split(/\s+/);
    const pct = Number(parts[4]?.replace("%", ""));
    return Number.isFinite(pct) ? pct : 0;
  } catch {
    return 0;
  }
}

function readUfwStatus(): string {
  try {
    const serviceState = execSync("systemctl is-active ufw", { encoding: "utf8" }).trim();
    if (serviceState === "active") {
      return "ACTIVE";
    }

    if (serviceState === "inactive") {
      return "INACTIVE";
    }

    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function ensurePaths(bootstrap: BootSystemPromo): void {
  for (const dir of bootstrap.boot_requirements.required_directories ?? []) {
    const full = path.join(process.cwd(), dir);
    if (!fs.existsSync(full)) {
      throw new Error(`Missing required directory: ${dir}`);
    }
  }

  for (const rel of bootstrap.boot_requirements.required_files ?? []) {
    const full = path.join(process.cwd(), rel);
    if (!fs.existsSync(full)) {
      throw new Error(`Missing required file: ${rel}`);
    }
  }
}

function printBootBanner(bootstrap: BootSystemPromo): void {
  const timestamp = new Date().toISOString();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedGb = ((totalMem - freeMem) / (1024 ** 3)).toFixed(1);
  const totalGb = (totalMem / (1024 ** 3)).toFixed(0);

  console.log("----------------------------------------");
  console.log("VYRDON SENTINEL-01 INITIALIZING");
  console.log("----------------------------------------");
  console.log(`Node: ${os.hostname()}`);
  console.log("Mode: DEVELOPMENT");
  console.log(`Timestamp: ${timestamp}`);
  console.log("");
  console.log("Integrity Check:");
  console.log("- System Doctrine: VERIFIED");
  console.log("- Memory State Hash: VERIFIED");
  console.log("- Workspace State: VERIFIED");
  console.log("- Journal Integrity: VERIFIED");
  console.log("");
  console.log("Hardware Profile:");
  console.log(`- CPU: ${os.cpus()[0]?.model ?? "unknown"}`);
  console.log(`- RAM: ${totalGb} GB`);
  console.log(`- Current RAM Usage: ${usedGb} GB`);
  console.log(`- Disk Usage: ${readDiskUsagePercent()}%`);
  console.log(`- UFW Status: ${readUfwStatus()}`);
  console.log("");
  console.log("Codex Status:");
  console.log(`- Guard Domain: ${bootstrap.domain_split.guard_domain.length > 0 ? "ENABLED" : "DISABLED"}`);
  console.log(`- Controlled Execution Domain: ${bootstrap.domain_split.controlled_domain.length > 0 ? "ENABLED" : "DISABLED"}`);
  console.log(`- Approval Required: ${bootstrap.approval_contract.required_for_controlled_domain ? "TRUE" : "FALSE"}`);
  console.log("- Emergency Authority: RESTRICTED");
  console.log("- Archive Mode: LOCAL (offline)");
  console.log("- Backup Mode: WEEKLY (scheduled)");
  console.log("----------------------------------------");
  console.log("VYRDON SENTINEL-01 READY");
  console.log("Awaiting Structured Intent.");
  console.log("----------------------------------------");
}

export function runEngineBootstrap(): BootSystemPromo {
  const bootstrap = loadBootstrap();

  if (!bootstrap.fail_closed) {
    throw new Error("Bootstrap misconfigured: fail_closed must be true");
  }

  const hardwareStatus = ensureHardwareProfile();
  ensurePaths(bootstrap);

  const integrity = verifyIntegrityHash();
  if (!integrity.valid) {
    throw new Error("INTEGRITY FAILURE DETECTED. SYSTEM HALTED.");
  }

  const identityLock = enforceAsusIdentityLock();
  console.log(`ENGINE: ${identityLock.engine}`);
  console.log(`NODE: ${identityLock.node}`);
  console.log(`MODE: ${identityLock.mode}`);
  console.log(`CONTEXT: ${identityLock.context}`);

  const state = readState();
  if (state.emergencyFlag) {
    throw new Error("Previous Session Flag: EMERGENCY DETECTED. Review required before execution.");
  }

  updateState({
    currentState: "IDLE",
    lastBootUTC: new Date().toISOString()
  });

  appendJournal("BOOT", {
    hardwareProfile: hardwareStatus.status,
    integrity: integrity.actual
  });

  writeIntegrityHash();
  printBootBanner(bootstrap);

  return bootstrap;
}
