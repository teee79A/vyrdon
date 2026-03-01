import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

const PROFILE_PATH = path.join(process.cwd(), "system", "hardware-profile.json");

export interface HardwareProfile {
  machineId: string;
  hostname: string;
  cpu: string;
  cores: number;
  ramGB: number;
  diskRootGB: number;
  architecture: string;
  kernel: string;
  recordedAtUTC: string;
}

function isContainerRuntime(): boolean {
  return fs.existsSync("/.dockerenv");
}

function readMachineId(): string {
  const machineIdPath = "/etc/machine-id";
  if (!fs.existsSync(machineIdPath)) {
    return "unknown";
  }

  return fs.readFileSync(machineIdPath, "utf8").trim();
}

function getDiskRootGB(): number {
  try {
    const output = execSync("df -k / | tail -1", { encoding: "utf8" }).trim();
    const parts = output.split(/\s+/);
    const totalKb = Number(parts[1]);
    return Number.isFinite(totalKb) ? Math.round(totalKb / (1024 * 1024)) : 0;
  } catch {
    return 0;
  }
}

export function generateHardwareProfile(): HardwareProfile {
  return {
    machineId: readMachineId(),
    hostname: os.hostname(),
    cpu: os.cpus()[0]?.model ?? "unknown",
    cores: os.cpus().length,
    ramGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
    diskRootGB: getDiskRootGB(),
    architecture: os.arch(),
    kernel: os.release(),
    recordedAtUTC: new Date().toISOString()
  };
}

function stableProfile(profile: HardwareProfile): Record<string, string | number> {
  const containerMode = isContainerRuntime();

  if (containerMode) {
    // In container mode, avoid drift on runtime-specific fields (hostname, root fs size).
    return {
      machineId: profile.machineId,
      cpu: profile.cpu,
      cores: profile.cores,
      ramGB: profile.ramGB,
      architecture: profile.architecture,
      kernel: profile.kernel
    };
  }

  const { recordedAtUTC: _ignored, ...stable } = profile;
  return stable;
}

function profileHash(profile: Record<string, string | number>): string {
  return crypto.createHash("sha256").update(JSON.stringify(profile)).digest("hex");
}

export function ensureHardwareProfile(): { status: "CREATED" | "VERIFIED"; profile: HardwareProfile } {
  const systemDir = path.join(process.cwd(), "system");
  if (!fs.existsSync(systemDir)) {
    fs.mkdirSync(systemDir, { recursive: true });
  }

  if (!fs.existsSync(PROFILE_PATH)) {
    const profile = generateHardwareProfile();
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2));
    return { status: "CREATED", profile };
  }

  const existing = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8")) as HardwareProfile;
  const current = generateHardwareProfile();

  if (profileHash(stableProfile(existing)) !== profileHash(stableProfile(current))) {
    throw new Error("Hardware profile mismatch detected. FAIL CLOSED.");
  }

  return { status: "VERIFIED", profile: existing };
}
