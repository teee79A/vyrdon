import { Router } from "express";
import { CodexEngine } from "../core/engine";
import { processIntent } from "../core/engineKernel";
import { parseApprovalCommand } from "../core/approval";
import { readRecentJournalLines } from "../memory/journal";
import { readState } from "../memory/state";
import { runBuildVerification } from "../system/buildIntegrity";
import { evaluateProposal } from "../system/proposalEngine";
import { runDeterministicAudit } from "../system/audit";
import { enhanceAuditWithAI } from "../ai/auditAssistant";
import { persistAuditRecord } from "../system/auditArchive";
import { verifyAuditIntegrity } from "../system/auditIntegrity";
import { buildEngineeringReview } from "../system/engineeringReview";

export function createRoutes(engine: CodexEngine): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      status: "alive",
      utc: new Date().toISOString()
    });
  });

  router.get("/engineering-review", (_req, res) => {
    try {
      res.json(buildEngineeringReview());
    } catch (error) {
      const message = error instanceof Error ? error.message : "engineering review failed";
      res.status(400).json({ status: "FAIL", error: message });
    }
  });

  router.get("/vyrdon/engineering/review", (_req, res) => {
    try {
      res.json(buildEngineeringReview());
    } catch (error) {
      const message = error instanceof Error ? error.message : "engineering review failed";
      res.status(400).json({ status: "FAIL", error: message });
    }
  });

  router.get("/status", (_req, res) => {
    res.json({
      state: readState(),
      journalTail: readRecentJournalLines(20)
    });
  });

  router.post("/approval/parse", (req, res) => {
    try {
      const parsed = parseApprovalCommand(String(req.body?.command ?? ""));
      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "parse failure";
      res.status(400).json({ error: message });
    }
  });

  router.post("/proposal", (req, res) => {
    try {
      const result = evaluateProposal(req.body ?? {});
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "proposal evaluation failed";
      res.status(400).json({ status: "REJECTED", error: message });
    }
  });

  // Keep legacy route visible but disabled to avoid conflicting state pipelines.
  router.post("/intent", (_req, res) => {
    res.status(410).json({
      status: "DEPRECATED",
      message: "Use POST /codex/intent as the authoritative deterministic kernel endpoint."
    });
  });

  router.post("/codex/intent", async (req, res) => {
    try {
      const result = await processIntent(req.body);
      res.json({ status: "OK", result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "kernel failure";
      res.status(400).json({ error: message });
    }
  });

  router.post("/vyrdon/engineering/build-verify", (_req, res) => {
    try {
      const result = runBuildVerification();
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "build verification failed";
      res.status(400).json({ status: "FAIL", error: message });
    }
  });

  router.post("/engineering-audit", async (_req, res) => {
    try {
      const deterministic = runDeterministicAudit();
      const aiAnalysis = await enhanceAuditWithAI(deterministic);
      const archived = persistAuditRecord(deterministic, aiAnalysis);

      res.json({
        deterministic,
        aiAnalysis,
        archive: archived
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "engineering audit failed";
      res.status(400).json({ status: "FAIL", error: message });
    }
  });

  router.post("/vyrdon/engineering/audit", async (_req, res) => {
    try {
      const deterministic = runDeterministicAudit();
      const aiAnalysis = await enhanceAuditWithAI(deterministic);
      const archived = persistAuditRecord(deterministic, aiAnalysis);

      res.json({
        deterministic,
        aiAnalysis,
        archive: archived
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "engineering audit failed";
      res.status(400).json({ status: "FAIL", error: message });
    }
  });

  router.get("/vyrdon/engineering/audit-integrity", (_req, res) => {
    res.json(verifyAuditIntegrity());
  });

  return router;
}
