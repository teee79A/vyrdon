import fs from "fs";
import path from "path";
import { BootstrapDocument, BootSystemPromo } from "../types/engine";
import { verifyBootstrapSignature } from "./bootstrapSignature";

const BOOTSTRAP_PATH = path.join(process.cwd(), "system", "bootstrap.json");
let BOOTSTRAP: BootSystemPromo | null = null;

function normalizeBootstrap(raw: Record<string, unknown>): BootSystemPromo {
  const lower = (v: unknown): string => String(v ?? "").toLowerCase();
  const domainSplit = (raw.DOMAIN_SPLIT as Record<string, unknown> | undefined) ?? {};
  const bootRequirements = (raw.BOOT_REQUIREMENTS as Record<string, unknown> | undefined) ?? {};
  const approvalModel = (raw.APPROVAL_MODEL as Record<string, unknown> | undefined) ?? {};

  return {
    engine_identity: String(raw.ENGINE_IDENTITY ?? raw.ENGINE_ID ?? "ASUS_VSE_01"),
    engine_alias: String(raw.ENGINE_ALIAS ?? raw.ENGINE_TITLE ?? "ASUS_BRAIN"),
    engine_mode: String(raw.ENGINE_MODE ?? raw.BOOT_MODE ?? "DETERMINISTIC_OPERATIONAL_AGENT"),
    engine_role: String(raw.ENGINE_ROLE ?? raw.NODE_ROLE ?? raw.NODE_IDENTITY ?? "ASUS_ENGINEERING_AUTHORITY"),
    fail_closed: raw.FAIL_CLOSED === true || lower(raw.BOOT_MODE) === "fail_closed",
    domain_split: {
      guard_domain: Array.isArray(domainSplit.GUARD_DOMAIN)
        ? (domainSplit.GUARD_DOMAIN as string[])
        : [],
      controlled_domain: Array.isArray(domainSplit.CONTROLLED_DOMAIN)
        ? (domainSplit.CONTROLLED_DOMAIN as string[])
        : []
    },
    approval_contract: {
      required_for_controlled_domain:
        approvalModel.CONTROLLED_DOMAIN_REQUIRES_APPROVAL === true || approvalModel.NO_APPROVAL_NO_EXECUTION === true,
      commands: Array.isArray(approvalModel.APPROVAL_SYNTAX)
        ? (approvalModel.APPROVAL_SYNTAX as string[])
        : ["APPROVE <intent_id>", "REJECT <intent_id>", "STATUS"],
      case_sensitive: true,
      free_text_approval_allowed: false,
      on_missing_or_invalid_approval: "BLOCK_EXECUTION"
    },
    boot_requirements: {
      required_files: Array.isArray(bootRequirements.REQUIRED_FILES)
        ? (bootRequirements.REQUIRED_FILES as string[])
        : [],
      required_directories: Array.isArray(bootRequirements.REQUIRED_DIRECTORIES)
        ? (bootRequirements.REQUIRED_DIRECTORIES as string[])
        : ["memory/checkpoints", "workspace", "logs"],
      integrity_checks: Array.isArray(bootRequirements.INTEGRITY_CHECKS)
        ? (bootRequirements.INTEGRITY_CHECKS as string[])
        : ["memory_state_hash_match", "bootstrap_schema_valid", "journal_readable"],
      on_failure: String(bootRequirements.ON_FAILURE ?? "TERMINATE_ENGINE")
    }
  };
}

function deepFreeze<T>(obj: T): T {
  if (obj !== null && typeof obj === "object") {
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
      const value = (obj as Record<string, unknown>)[key];
      if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        deepFreeze(value);
      }
    }
  }

  return obj;
}

function validateBootstrap(data: BootSystemPromo): void {
  if (!data.engine_identity) {
    throw new Error("ENGINE_IDENTITY missing.");
  }

  if (!data.fail_closed) {
    throw new Error("FAIL_CLOSED must be true.");
  }

  if (!Array.isArray(data.domain_split.guard_domain) || !Array.isArray(data.domain_split.controlled_domain)) {
    throw new Error("DOMAIN_SPLIT missing.");
  }

  if (!data.boot_requirements.required_files.includes("memory/state.json")) {
    throw new Error("BOOT_REQUIREMENTS missing memory/state.json");
  }
}

export function loadBootstrap(): BootSystemPromo {
  if (BOOTSTRAP) {
    return BOOTSTRAP;
  }

  if (!fs.existsSync(BOOTSTRAP_PATH)) {
    throw new Error("Missing system/bootstrap.json");
  }

  verifyBootstrapSignature(BOOTSTRAP_PATH);

  const raw = fs.readFileSync(BOOTSTRAP_PATH, "utf8");
  const parsed = JSON.parse(raw) as BootstrapDocument & Record<string, unknown>;
  const vyrdonNode = (parsed.VYRDON as Record<string, unknown> | undefined) ?? undefined;

  let normalized: BootSystemPromo;
  if (vyrdonNode?.BOOT_SYSTEM_PROMO) {
    normalized = vyrdonNode.BOOT_SYSTEM_PROMO as BootSystemPromo;
  } else if (
    vyrdonNode &&
    typeof vyrdonNode === "object" &&
    ("engine_identity" in vyrdonNode || "ENGINE_IDENTITY" in vyrdonNode || "ENGINE_ID" in vyrdonNode)
  ) {
    normalized = normalizeBootstrap(vyrdonNode);
  } else if (parsed.BOOT_SYSTEM_PROMO) {
    normalized = parsed.BOOT_SYSTEM_PROMO;
  } else if (parsed.ENGINE_IDENTITY || parsed.ENGINE_ID) {
    normalized = normalizeBootstrap(parsed);
  } else {
    throw new Error("Invalid bootstrap format.");
  }

  validateBootstrap(normalized);
  BOOTSTRAP = deepFreeze(normalized);
  return BOOTSTRAP;
}

export function getBootstrap(): BootSystemPromo {
  if (!BOOTSTRAP) {
    throw new Error("Bootstrap not loaded.");
  }

  return BOOTSTRAP;
}
