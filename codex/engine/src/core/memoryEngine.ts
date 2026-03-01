import crypto from "crypto";
import fs from "fs";
import path from "path";
import { verifyIntegrityHash, writeIntegrityHash } from "../system/integrity";

const STATE_PATH = path.join(process.cwd(), "memory", "state.json");
const JOURNAL_PATH = path.join(process.cwd(), "memory", "journal.log");

function sha(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function ensureMemoryFiles(): void {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error("State file missing.");
  }

  if (!fs.existsSync(JOURNAL_PATH)) {
    fs.writeFileSync(JOURNAL_PATH, "");
  }
}

export function loadState(): Record<string, unknown> {
  ensureMemoryFiles();
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as Record<string, unknown>;
}

export function saveState(state: Record<string, unknown>): string {
  ensureMemoryFiles();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  return updateIntegrity();
}

export function appendJournal(entry: string): string {
  ensureMemoryFiles();
  const timestamp = new Date().toISOString();
  const line = `${timestamp} | ${entry}`;
  fs.appendFileSync(JOURNAL_PATH, `${line}\n`);
  return updateIntegrity();
}

export function updateIntegrity(): string {
  // Canonical integrity is the composite hash enforced by system/integrity.ts.
  return writeIntegrityHash();
}

export function verifyIntegrity(): void {
  ensureMemoryFiles();
  const verification = verifyIntegrityHash();
  if (!verification.valid) {
    throw new Error("Integrity mismatch detected. TERMINATE_ENGINE.");
  }

  // Keep a deterministic state+journal digest available for local diagnostics.
  const stateRaw = fs.readFileSync(STATE_PATH, "utf8");
  const journalRaw = fs.readFileSync(JOURNAL_PATH, "utf8");
  const diagnosticDigest = sha(stateRaw + journalRaw);
  if (!diagnosticDigest) {
    throw new Error("Integrity diagnostic failure.");
  }
}
