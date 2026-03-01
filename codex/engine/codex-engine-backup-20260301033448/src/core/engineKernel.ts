import crypto from "crypto";
import { updateState } from "../memory/state";
import { EngineState } from "../types/engine";
import { appendKernelJournal } from "./journal";
import { getCurrentState, transitionState } from "./stateMachine";

interface KernelIntent {
  type?: string;
  [key: string]: unknown;
}

interface KernelResult {
  status: "SUCCESS";
  processedAt: string;
  decisionHash: string;
  statePath: EngineState[];
  integrityHash: string;
}

let kernelBusy = false;

function ensureIdleStart(): void {
  const current = getCurrentState();
  if (current !== "IDLE") {
    throw new Error(`Kernel requires IDLE start state. Current: ${current}`);
  }
}

function validateIntentShape(intent: KernelIntent): void {
  if (!intent || typeof intent.type !== "string" || intent.type.trim().length === 0) {
    throw new Error("Invalid intent.");
  }
}

export async function processIntent(intent: KernelIntent): Promise<KernelResult> {
  validateIntentShape(intent);

  if (kernelBusy) {
    throw new Error("Kernel is busy processing another intent.");
  }

  kernelBusy = true;
  ensureIdleStart();

  const statePath: EngineState[] = [];
  try {
    transitionState("TASK_ACTIVE");
    statePath.push("TASK_ACTIVE");
    let integrityHash = appendKernelJournal(`INTENT_RECEIVED type=${String(intent.type)}`);

    transitionState("VALIDATING");
    statePath.push("VALIDATING");
    integrityHash = appendKernelJournal("VALIDATION_PASSED");

    transitionState("EXECUTING");
    statePath.push("EXECUTING");

    const processedAt = new Date().toISOString();
    const decisionHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ intent, processedAt }))
      .digest("hex");

    integrityHash = appendKernelJournal(`EXECUTION_COMPLETE decisionHash=${decisionHash}`);

    transitionState("VERIFIED");
    statePath.push("VERIFIED");
    integrityHash = appendKernelJournal("VERIFIED");

    transitionState("ARCHIVED");
    statePath.push("ARCHIVED");
    integrityHash = appendKernelJournal("ARCHIVED");

    transitionState("IDLE");
    statePath.push("IDLE");

    updateState({
      activeContext: String(intent.type),
      lastCheckpoint: decisionHash
    });
    integrityHash = appendKernelJournal("RETURNED_TO_IDLE");

    return {
      status: "SUCCESS",
      processedAt,
      decisionHash,
      statePath,
      integrityHash
    };
  } finally {
    kernelBusy = false;
  }
}
