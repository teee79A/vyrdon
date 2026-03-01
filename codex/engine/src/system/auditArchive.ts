import crypto from "crypto";
import fs from "fs";
import path from "path";
import { updateState } from "../memory/state";
import { getGitCommit } from "./gitUtils";
import { computeRuleHash, loadRules } from "./rules";

export function persistAuditRecord(deterministic: unknown, aiAnalysis: unknown): {
  filePath: string;
  auditHash: string;
} {
  const gitCommit = getGitCommit();
  const timestampUTC = new Date().toISOString();
  const rules = loadRules();
  const ruleHash = computeRuleHash(rules);

  const auditsDir = path.join(process.cwd(), "archive", "audits");
  fs.mkdirSync(auditsDir, { recursive: true });

  const files = fs.readdirSync(auditsDir).filter((f) => f.endsWith(".json")).sort();
  let prevAuditHash: string | null = null;

  if (files.length > 0) {
    const lastAudit = JSON.parse(fs.readFileSync(path.join(auditsDir, files[files.length - 1]), "utf8")) as {
      meta?: { auditHash?: string };
    };
    prevAuditHash = lastAudit.meta?.auditHash ?? null;
  }

  const metaBase = {
    engine: "AXIOM_CORE",
    nodeRole: "ASUS_ENGINEERING",
    gitCommit,
    ruleVersion: rules.ruleVersion,
    ruleHash,
    timestampUTC,
    prevAuditHash
  };

  const payload: {
    meta: typeof metaBase & { auditHash?: string };
    deterministic: unknown;
    aiAnalysis: unknown;
  } = {
    meta: metaBase,
    deterministic,
    aiAnalysis
  };

  const auditHash = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  payload.meta.auditHash = auditHash;

  const fileName = `audit-${timestampUTC.replace(/[:.]/g, "-")}-${gitCommit.slice(0, 7)}.json`;
  const filePath = path.join(auditsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));

  updateState({ lastAuditHash: auditHash });

  return { filePath, auditHash };
}
