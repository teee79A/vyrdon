import crypto from "crypto";
import fs from "fs";
import path from "path";
import { appendJournal } from "../memory/journal";
import { readState, updateState } from "../memory/state";
import { writeIntegrityHash } from "../system/integrity";
import { BootSystemPromo, EngineState, IntentExecutionResult, StructuredIntent } from "../types/engine";
import { isApprovalValid } from "./approval";
import { classifyIntent } from "./domainGuard";
import { assertTransition } from "./stateMachine";

export class CodexEngine {
  constructor(private readonly bootstrap: BootSystemPromo) {}

  private transition(next: EngineState): void {
    const state = readState();
    assertTransition(state.currentState, next);
    updateState({ currentState: next });
    appendJournal("STATE_TRANSITION", { from: state.currentState, to: next });
  }

  private validateIntent(intent: StructuredIntent): void {
    const required: Array<keyof StructuredIntent> = [
      "intent_id",
      "timestamp",
      "actor",
      "domain",
      "action",
      "constraints",
      "explainability_required"
    ];

    for (const key of required) {
      if (intent[key] === undefined || intent[key] === null) {
        throw new Error(`Intent validation failed: missing ${key}`);
      }
    }

    if (!Array.isArray(intent.constraints)) {
      throw new Error("Intent validation failed: constraints must be array");
    }

    if (Number.isNaN(Date.parse(intent.timestamp))) {
      throw new Error("Intent validation failed: timestamp must be ISO datetime");
    }
  }

  private executeIntent(intent: StructuredIntent): Record<string, unknown> {
    switch (intent.action) {
      case "analyze":
        return { summary: "analysis_complete", domain: intent.domain };
      case "audit":
        return { summary: "audit_complete", explainability: intent.explainability_required };
      case "modify":
        return { summary: "modification_stub_executed", requiresReview: true };
      case "deploy":
        return { summary: "deployment_blocked_on_external_authority", executed: false };
      default:
        return { summary: "noop" };
    }
  }

  public processIntent(intent: StructuredIntent, approvalCommand?: string): IntentExecutionResult {
    const statePath: EngineState[] = [];

    this.transition("TASK_ACTIVE");
    statePath.push("TASK_ACTIVE");

    this.transition("VALIDATING");
    statePath.push("VALIDATING");
    this.validateIntent(intent);

    const classification = classifyIntent(intent, this.bootstrap);
    if (classification === "controlled" && !isApprovalValid(approvalCommand, intent.intent_id)) {
      throw new Error(`Approval required. Expected: APPROVE ${intent.intent_id}`);
    }

    this.transition("EXECUTING");
    statePath.push("EXECUTING");

    const result = this.executeIntent(intent);
    const executedAtUTC = new Date().toISOString();
    const decisionHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ intent, classification, result, executedAtUTC }))
      .digest("hex");

    this.transition("VERIFIED");
    statePath.push("VERIFIED");

    const checkpoint = {
      intent,
      classification,
      result,
      decisionHash,
      executedAtUTC
    };

    const checkpointFile = `cp-${executedAtUTC.replace(/[:.]/g, "-")}.json`;
    const checkpointPath = path.join(process.cwd(), "memory", "checkpoints", checkpointFile);
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));

    updateState({
      activeContext: intent.intent_id,
      lastCheckpoint: checkpointFile
    });

    appendJournal("INTENT_EXECUTED", {
      intentId: intent.intent_id,
      class: classification,
      decisionHash
    });

    this.transition("ARCHIVED");
    statePath.push("ARCHIVED");

    this.transition("IDLE");
    statePath.push("IDLE");

    const integrity = writeIntegrityHash();
    updateState({ integrityHash: integrity });

    return {
      intentId: intent.intent_id,
      classification,
      statePath,
      decisionHash,
      checkpointFile,
      executedAtUTC,
      result
    };
  }
}
