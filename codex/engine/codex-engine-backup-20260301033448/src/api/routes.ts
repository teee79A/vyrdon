import { Router } from "express";
import { CodexEngine } from "../core/engine";
import { processIntent } from "../core/engineKernel";
import { parseApprovalCommand } from "../core/approval";
import { readRecentJournalLines } from "../memory/journal";
import { readState } from "../memory/state";

export function createRoutes(engine: CodexEngine): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      status: "alive",
      utc: new Date().toISOString()
    });
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

  return router;
}
