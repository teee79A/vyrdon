import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { readState } from "../memory/state";
import { getGitCommit } from "./gitUtils";
import { loadRules } from "./rules";

function diskUsagePercent(): number {
  try {
    const output = execSync("df -P / | tail -1", { encoding: "utf8" }).trim();
    const parts = output.split(/\s+/);
    return Number(parts[4]?.replace("%", "")) || 0;
  } catch {
    return 0;
  }
}

export function buildEngineeringReview(): Record<string, unknown> {
  const state = readState();
  let ruleVersion = "UNKNOWN";

  try {
    ruleVersion = loadRules().ruleVersion;
  } catch {
    ruleVersion = "MISSING_RULES";
  }

  const journalPath = path.join(process.cwd(), "memory", "journal.log");
  const journalEntryCount = fs.existsSync(journalPath)
    ? fs.readFileSync(journalPath, "utf8").split("\n").filter(Boolean).length
    : 0;

  const archiveRoot = path.join(process.cwd(), "archive");
  const auditCount = fs.existsSync(path.join(archiveRoot, "audits"))
    ? fs.readdirSync(path.join(archiveRoot, "audits")).filter((f) => f.endsWith(".json")).length
    : 0;
  const buildCount = fs.existsSync(path.join(archiveRoot, "builds"))
    ? fs.readdirSync(path.join(archiveRoot, "builds")).filter((f) => f.endsWith(".json")).length
    : 0;
  const releaseCount = fs.existsSync(path.join(archiveRoot, "releases"))
    ? fs.readdirSync(path.join(archiveRoot, "releases")).filter((f) => f.endsWith(".json")).length
    : 0;

  const stateRecord = state as unknown as Record<string, unknown>;

  return {
    identity: "VYRDON AXIOM CORE",
    mode: "ENGINEERING",
    utc: new Date().toISOString(),
    systemIdentity: {
      engine: "AXIOM_CORE",
      nodeRole: "ASUS_ENGINEERING"
    },
    bootTimestamp: state.lastBootUTC,
    repository: {
      gitCommit: getGitCommit()
    },
    rule: {
      version: ruleVersion
    },
    lastProposalDecision: stateRecord.lastProposalDecision ?? null,
    archiveStatus: {
      rootPresent: fs.existsSync(archiveRoot),
      audits: auditCount,
      builds: buildCount,
      releases: releaseCount
    },
    memorySnapshot: state,
    nodeVersion: process.version,
    platform: os.platform(),
    diskUsage: {
      rootUsedPercent: diskUsagePercent()
    },
    journalEntryCount
  };
}
