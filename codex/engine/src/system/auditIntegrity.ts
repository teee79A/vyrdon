import crypto from "crypto";
import fs from "fs";
import path from "path";

export function verifyAuditIntegrity():
  | { status: "PASS"; auditsChecked: number; chainHead: string | null }
  | { status: "FAIL"; reason: string; file?: string } {
  const auditsDir = path.join(process.cwd(), "archive", "audits");
  if (!fs.existsSync(auditsDir)) {
    return { status: "FAIL", reason: "Audit directory missing" };
  }

  const files = fs.readdirSync(auditsDir).filter((f) => f.endsWith(".json")).sort();
  let prevHash: string | null = null;

  for (const file of files) {
    const fullPath = path.join(auditsDir, file);
    const audit = JSON.parse(fs.readFileSync(fullPath, "utf8")) as {
      meta: Record<string, unknown> & { auditHash?: string; prevAuditHash?: string | null };
      deterministic: unknown;
      aiAnalysis: unknown;
    };

    const { auditHash, ...metaWithoutHash } = audit.meta;
    const prevAuditHash = (audit.meta.prevAuditHash as string | null | undefined) ?? null;
    const reconstructed = {
      meta: metaWithoutHash,
      deterministic: audit.deterministic,
      aiAnalysis: audit.aiAnalysis
    };

    const recomputed = crypto.createHash("sha256").update(JSON.stringify(reconstructed)).digest("hex");

    if (recomputed !== auditHash) {
      return { status: "FAIL", reason: "Hash mismatch", file };
    }

    if (prevAuditHash !== prevHash) {
      return { status: "FAIL", reason: "Broken hash chain", file };
    }

    prevHash = auditHash ?? null;
  }

  return { status: "PASS", auditsChecked: files.length, chainHead: prevHash };
}
