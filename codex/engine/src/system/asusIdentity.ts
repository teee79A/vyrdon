import crypto from "crypto";
import fs from "fs";
import path from "path";

interface AsusIdentityFile {
  ENTITY_NAME: string;
  NODE_ROLE: string;
  CURRENT_CONTEXT: string;
  MIGRATION_TIMESTAMP_UTC: string;
}

interface AsusMemoryState {
  engine_id: string;
  node_identity: string;
  boot_count: number;
  last_boot_utc: string | null;
  current_state: string;
  active_task: string | null;
  release_version: string;
  audit_chain_head: string | null;
  build_chain_head: string | null;
  integrity_chain_head: string | null;
  persona_lock: boolean;
  persona_hash: string | null;
}

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedJson);
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortedJson(v)]);
    return Object.fromEntries(entries);
  }

  return value;
}

function resolveAsusCodexRoot(): string {
  const explicit = process.env.ASUS_CODEX_ROOT;
  if (explicit) {
    return explicit;
  }

  const cwd = process.cwd();
  const parent = path.resolve(cwd, "..");
  if (path.basename(cwd) === "engine" && path.basename(parent) === "codex") {
    return parent;
  }

  return cwd;
}

function computeBootstrapHash(bootstrap: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(sortedJson(bootstrap))).digest("hex");
}

export function enforceAsusIdentityLock(): {
  engine: string;
  node: string;
  mode: string;
  context: string;
  personaHash: string;
  bootCount: number;
  asusRoot: string;
} {
  const asusRoot = resolveAsusCodexRoot();
  const bootstrapPath = path.join(asusRoot, "system", "bootstrap.json");
  const identityPath = path.join(asusRoot, "system", "identity.json");
  const statePath = path.join(asusRoot, "memory", "state.json");

  for (const filePath of [bootstrapPath, identityPath, statePath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`ASUS identity file missing: ${filePath}`);
    }
  }

  const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, "utf8")) as Record<string, unknown>;
  const identity = JSON.parse(fs.readFileSync(identityPath, "utf8")) as AsusIdentityFile;
  const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as AsusMemoryState;

  const personaHash = computeBootstrapHash(bootstrap);
  if (state.persona_lock) {
    if (state.persona_hash === null) {
      state.persona_hash = personaHash;
    } else if (state.persona_hash !== personaHash) {
      throw new Error("Persona hash mismatch detected. FAIL CLOSED.");
    }
  }

  const now = new Date().toISOString();
  state.boot_count = Number.isFinite(state.boot_count) ? state.boot_count + 1 : 1;
  state.last_boot_utc = now;

  if (identity.MIGRATION_TIMESTAMP_UTC === "AUTO_GENERATE_ON_FIRST_BOOT") {
    identity.MIGRATION_TIMESTAMP_UTC = now;
    fs.writeFileSync(identityPath, JSON.stringify(identity, null, 2));
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  return {
    engine: String(bootstrap.ENGINE_ID ?? "ASUS_VSE_01"),
    node: String(bootstrap.NODE_IDENTITY ?? identity.NODE_ROLE),
    mode: String(bootstrap.BOOT_MODE ?? "FAIL_CLOSED"),
    context: String(bootstrap.RUNTIME_CONTEXT ?? identity.CURRENT_CONTEXT),
    personaHash,
    bootCount: state.boot_count,
    asusRoot
  };
}

