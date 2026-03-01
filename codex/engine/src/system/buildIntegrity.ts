import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { verifyNodeVersion } from "./environmentCheck";

interface BuildRecord {
  meta: {
    engine: string;
    nodeRole: string;
    timestampUTC: string;
    gitCommit: string;
    nodeVersion: string;
    prevBuildHash: string | null;
    buildRecordHash: string;
  };
  integrity: {
    nodeCheck: { status: "PASS" } | { status: "FAIL"; reason: string };
    lockfileHash: string | null;
    dependencyChecksum: string | null;
    buildHash: string | null;
    ruleHash: string | null;
    status: "PASS" | "FAIL";
  };
}

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedJson);
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortedJson(v)]);

    return Object.fromEntries(entries);
  }

  return value;
}

function collectFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function hashFile(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function computeLockfileHash(): string | null {
  const lockfile = path.join(process.cwd(), "package-lock.json");
  if (!fs.existsSync(lockfile)) {
    return null;
  }

  const data = fs.readFileSync(lockfile, "utf8");
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function computeDependencyChecksum(): string | null {
  const lockfile = path.join(process.cwd(), "package-lock.json");
  if (!fs.existsSync(lockfile)) {
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(lockfile, "utf8")) as {
    packages?: Record<string, { version?: string; resolved?: string; integrity?: string }>;
    dependencies?: Record<string, { version?: string; resolved?: string; integrity?: string }>;
  };

  const tuples: Array<[string, string, string, string]> = [];

  if (parsed.packages) {
    for (const [pkg, meta] of Object.entries(parsed.packages)) {
      tuples.push([pkg, meta.version ?? "", meta.resolved ?? "", meta.integrity ?? ""]);
    }
  } else if (parsed.dependencies) {
    for (const [pkg, meta] of Object.entries(parsed.dependencies)) {
      tuples.push([pkg, meta.version ?? "", meta.resolved ?? "", meta.integrity ?? ""]);
    }
  }

  tuples.sort(([a], [b]) => a.localeCompare(b));
  return crypto.createHash("sha256").update(JSON.stringify(tuples)).digest("hex");
}

export function computeBuildHash(): string | null {
  const distDir = path.join(process.cwd(), "dist");
  const files = collectFilesRecursive(distDir);
  if (files.length === 0) {
    return null;
  }

  const hash = crypto.createHash("sha256");
  for (const fullPath of files) {
    const relPath = path.relative(process.cwd(), fullPath);
    hash.update(relPath);
    hash.update(":");
    hash.update(hashFile(fullPath));
    hash.update(";");
  }

  return hash.digest("hex");
}

function computeRuleHash(): string | null {
  const candidateFiles = [
    path.join(process.cwd(), "config", "rules.json"),
    path.join(process.cwd(), "policies.json"),
    path.join(process.cwd(), "system", "doctrine.json")
  ].filter((filePath) => fs.existsSync(filePath));

  if (candidateFiles.length === 0) {
    return null;
  }

  const payload = candidateFiles
    .sort((a, b) => a.localeCompare(b))
    .map((filePath) => {
      const raw = fs.readFileSync(filePath, "utf8");
      const normalized = filePath.endsWith(".json") ? JSON.stringify(sortedJson(JSON.parse(raw) as unknown)) : raw;
      return {
        file: path.relative(process.cwd(), filePath),
        content: normalized
      };
    });

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function resolveGitCommit(): string {
  const candidates = [process.cwd(), "/home/t79/VYRDON"];
  for (const candidate of candidates) {
    try {
      return execSync("git rev-parse HEAD", { cwd: candidate, encoding: "utf8" }).trim();
    } catch {
      // try next candidate
    }
  }

  return "NO_GIT_REPO";
}

function readPreviousBuildHash(buildsDir: string): string | null {
  if (!fs.existsSync(buildsDir)) {
    return null;
  }

  const files = fs.readdirSync(buildsDir).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) {
    return null;
  }

  const latest = JSON.parse(fs.readFileSync(path.join(buildsDir, files[files.length - 1]), "utf8")) as BuildRecord;
  return latest.meta.buildRecordHash;
}

function writeBuildRecord(record: BuildRecord, gitCommit: string): string {
  const buildsDir = path.join(process.cwd(), "archive", "builds");
  fs.mkdirSync(buildsDir, { recursive: true });

  const timestampSafe = record.meta.timestampUTC.replace(/[:.]/g, "-");
  const commitSuffix = gitCommit === "NO_GIT_REPO" ? "nogit" : gitCommit.slice(0, 7);
  const fileName = `build-${timestampSafe}-${commitSuffix}.json`;
  const outPath = path.join(buildsDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
  return outPath;
}

export function runBuildVerification(): {
  nodeCheck: { status: "PASS" } | { status: "FAIL"; reason: string };
  lockfileHash: string | null;
  dependencyChecksum: string | null;
  buildHash: string | null;
  gitCommit: string;
  ruleHash: string | null;
  status: "PASS" | "FAIL";
  archiveFile: string;
  buildRecordHash: string;
  prevBuildHash: string | null;
  nodeVersion: string;
} {
  const nodeCheck = verifyNodeVersion();
  const lockfileHash = computeLockfileHash();
  const dependencyChecksum = computeDependencyChecksum();
  const buildHash = computeBuildHash();
  const gitCommit = resolveGitCommit();
  const ruleHash = computeRuleHash();
  const timestampUTC = new Date().toISOString();
  const prevBuildHash = readPreviousBuildHash(path.join(process.cwd(), "archive", "builds"));

  const status: "PASS" | "FAIL" =
    nodeCheck.status === "PASS" && Boolean(lockfileHash) && Boolean(dependencyChecksum) && Boolean(buildHash)
      ? "PASS"
      : "FAIL";

  const baseRecord = {
    meta: {
      engine: "ASUS_VSE_01",
      nodeRole: "ASUS_ENGINEERING_NODE",
      timestampUTC,
      gitCommit,
      nodeVersion: process.version,
      prevBuildHash
    },
    integrity: {
      nodeCheck,
      lockfileHash,
      dependencyChecksum,
      buildHash,
      ruleHash,
      status
    }
  };

  const buildRecordHash = crypto.createHash("sha256").update(JSON.stringify(baseRecord)).digest("hex");

  const finalRecord: BuildRecord = {
    meta: {
      ...baseRecord.meta,
      buildRecordHash
    },
    integrity: baseRecord.integrity
  };

  const archiveFile = writeBuildRecord(finalRecord, gitCommit);

  return {
    nodeCheck,
    lockfileHash,
    dependencyChecksum,
    buildHash,
    gitCommit,
    ruleHash,
    status,
    archiveFile,
    buildRecordHash,
    prevBuildHash,
    nodeVersion: process.version
  };
}

