import { requireValidExecutionToken } from "../security/executionToken";
import { getBootstrap } from "../system/bootstrapLoader";
import { executeGuard, GuardExecutionResult } from "./guardDomain";
import { appendJournal } from "./memoryEngine";

export interface DomainIntent {
  intent_id?: string;
  type?: string;
  payload?: Record<string, unknown>;
  executionToken?: unknown;
  [key: string]: unknown;
}

export interface DomainDecision {
  classification: "guard" | "controlled";
  result: GuardExecutionResult;
}

export async function handleIntent(intent: DomainIntent): Promise<DomainDecision> {
  const bootstrap = getBootstrap();
  const type = String(intent.type ?? "");

  const isGuard = bootstrap.domain_split.guard_domain.includes(type);
  const isControlled = bootstrap.domain_split.controlled_domain.includes(type);

  if (!isGuard && !isControlled) {
    throw new Error("Intent type not recognized.");
  }

  if (isGuard) {
    const result = executeGuard(type);
    return {
      classification: "guard",
      result
    };
  }

  if (!intent.executionToken) {
    throw new Error("Approval required. No execution token provided.");
  }

  requireValidExecutionToken(intent as Record<string, unknown>, type);
  appendJournal(`Controlled: approval verified intent_id=${String(intent.intent_id ?? "unknown")} type=${type}`);

  return {
    classification: "controlled",
    result: { status: "CONTROLLED_INTENT_APPROVED", intent: type }
  };
}
