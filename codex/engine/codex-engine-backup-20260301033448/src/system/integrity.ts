import crypto from "crypto";
import fs from "fs";
import path from "path";

const INTEGRITY_PATH = path.join(process.cwd(), "memory", "integrity.hash");
const STATE_PATH = path.join(process.cwd(), "memory", "state.json");
const FILES_FOR_INTEGRITY = [
  path.join(process.cwd(), "system", "bootstrap.json"),
  path.join(process.cwd(), "system", "system-prompt.txt"),
  path.join(process.cwd(), "system", "doctrine.txt"),
  path.join(process.cwd(), "system", "hardware-profile.json"),
  STATE_PATH
];

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

function normalizedContent(filePath: string): string {
  const raw = fs.readFileSync(filePath, "utf8");
  if (!filePath.endsWith(".json")) {
    return raw;
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (filePath === STATE_PATH) {
    delete parsed.integrityHash;
  }

  return JSON.stringify(sortedJson(parsed));
}

export function computeCompositeIntegrityHash(): string {
  for (const filePath of FILES_FOR_INTEGRITY) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Integrity source missing: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  const payload = FILES_FOR_INTEGRITY.map((filePath) => ({
    file: path.relative(process.cwd(), filePath),
    content: normalizedContent(filePath)
  }));

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function verifyIntegrityHash(): { valid: boolean; expected: string; actual: string } {
  if (!fs.existsSync(INTEGRITY_PATH)) {
    throw new Error("Missing memory/integrity.hash");
  }

  const expected = fs.readFileSync(INTEGRITY_PATH, "utf8").trim();
  if (!expected || expected === "PENDING") {
    throw new Error("Invalid memory/integrity.hash (unset)");
  }

  const actual = computeCompositeIntegrityHash();
  return { valid: expected === actual, expected, actual };
}

export function writeIntegrityHash(): string {
  const digest = computeCompositeIntegrityHash();
  const stateRaw = fs.readFileSync(STATE_PATH, "utf8");
  const state = JSON.parse(stateRaw) as Record<string, unknown>;
  state.integrityHash = digest;
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  fs.writeFileSync(INTEGRITY_PATH, `${digest}\n`);
  return digest;
}
