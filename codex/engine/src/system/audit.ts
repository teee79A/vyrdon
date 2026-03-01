import fs from "fs";
import path from "path";
import { verifyNodeVersion } from "./environmentCheck";
import { computeBuildHash, computeDependencyChecksum, computeLockfileHash } from "./buildIntegrity";
import { isGitDirty } from "./gitUtils";
import { loadRules } from "./rules";

export interface DeterministicIssue {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  area: string;
  problem: string;
  why: string;
  impact: string;
  fix: string;
  priority: number;
}

export function runDeterministicAudit(): {
  timestampUTC: string;
  overallStatus: "STABLE" | "WARNING" | "CRITICAL";
  issues: DeterministicIssue[];
} {
  const issues: DeterministicIssue[] = [];

  if (isGitDirty()) {
    issues.push({
      severity: "MEDIUM",
      area: "Repository State",
      problem: "Uncommitted changes detected",
      why: "Engineering state is not reproducible",
      impact: "Builds may not match repository history",
      fix: "Commit or stash changes before release audits",
      priority: 3
    });
  }

  try {
    loadRules();
  } catch {
    issues.push({
      severity: "HIGH",
      area: "Rule Versioning",
      problem: "No external rule configuration",
      why: "Hardcoded rules reduce audit traceability",
      impact: "Deployment reproducibility risk",
      fix: "Create and enforce config/rules.json",
      priority: 1
    });
  }

  const auditsDir = path.join(process.cwd(), "archive", "audits");
  if (!fs.existsSync(auditsDir)) {
    issues.push({
      severity: "HIGH",
      area: "Archive",
      problem: "Audit archive missing",
      why: "Engineering history not preserved",
      impact: "Loss of governance traceability",
      fix: "Create archive/audits and enforce write-on-audit",
      priority: 1
    });
  }

  const nodeCheck = verifyNodeVersion();
  if (nodeCheck.status === "FAIL") {
    issues.push({
      severity: "HIGH",
      area: "Environment",
      problem: "Node version mismatch",
      why: nodeCheck.reason,
      impact: "Build/runtime drift",
      fix: "Pin runtime to Node 20",
      priority: 1
    });
  }

  if (!computeLockfileHash()) {
    issues.push({
      severity: "HIGH",
      area: "Dependency Integrity",
      problem: "Missing package-lock.json",
      why: "Dependency graph cannot be pinned",
      impact: "Non-reproducible dependency resolution",
      fix: "Generate and commit package-lock.json",
      priority: 2
    });
  }

  if (!computeDependencyChecksum()) {
    issues.push({
      severity: "MEDIUM",
      area: "Dependency Integrity",
      problem: "Dependency checksum unavailable",
      why: "Cannot verify dependency tree consistency",
      impact: "Possible silent dependency drift",
      fix: "Ensure lockfile is valid and parsable",
      priority: 2
    });
  }

  if (!computeBuildHash()) {
    issues.push({
      severity: "MEDIUM",
      area: "Build Integrity",
      problem: "Build hash unavailable",
      why: "dist/ missing or empty",
      impact: "No deterministic output verification",
      fix: "Run build before engineering audit",
      priority: 2
    });
  }

  const overallStatus: "STABLE" | "WARNING" | "CRITICAL" = issues.some((i) => i.severity === "CRITICAL")
    ? "CRITICAL"
    : issues.some((i) => i.severity === "HIGH" || i.severity === "MEDIUM")
      ? "WARNING"
      : "STABLE";

  return {
    timestampUTC: new Date().toISOString(),
    overallStatus,
    issues
  };
}
