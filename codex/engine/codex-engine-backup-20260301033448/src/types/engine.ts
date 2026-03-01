export type EngineState =
  | "BOOT"
  | "IDLE"
  | "TASK_ACTIVE"
  | "VALIDATING"
  | "EXECUTING"
  | "VERIFIED"
  | "ARCHIVED";

export type IntentDomain = "kernel" | "security" | "ops" | "market";
export type IntentAction = "analyze" | "modify" | "deploy" | "audit";

export interface StructuredIntent {
  intent_id: string;
  timestamp: string;
  actor: string;
  domain: IntentDomain;
  action: IntentAction;
  constraints: string[];
  explainability_required: boolean;
  payload?: Record<string, unknown>;
}

export interface IntentExecutionResult {
  intentId: string;
  classification: "guard" | "controlled";
  statePath: EngineState[];
  decisionHash: string;
  checkpointFile: string;
  executedAtUTC: string;
  result: Record<string, unknown>;
}

export interface BootRequirements {
  required_files: string[];
  required_directories: string[];
  integrity_checks: string[];
  on_failure: string;
}

export interface BootSystemPromo {
  engine_identity: string;
  engine_alias: string;
  engine_mode: string;
  engine_role: string;
  fail_closed: boolean;
  domain_split: {
    guard_domain: string[];
    controlled_domain: string[];
  };
  approval_contract: {
    required_for_controlled_domain: boolean;
    commands: string[];
    case_sensitive: boolean;
    free_text_approval_allowed: boolean;
    on_missing_or_invalid_approval: string;
  };
  boot_requirements: BootRequirements;
}

export interface BootstrapDocument {
  BOOT_SYSTEM_PROMO: BootSystemPromo;
}
