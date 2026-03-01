import crypto from "crypto";
import { getExecutionPublicKeyPem } from "./secretVault";

export interface ExecutionToken {
  intent_id: string;
  approved_by: string;
  timestamp: string;
  scope_hash: string;
  signature: string;
}

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortedJson(v)])
    );
  }

  return value;
}

function buildIntentScope(intent: Record<string, unknown>, intentType: string): Record<string, unknown> {
  return {
    type: intentType,
    intent_id: String(intent.intent_id ?? ""),
    payload: sortedJson(intent.payload ?? {})
  };
}

function computeScopeHash(scope: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(scope)).digest("hex");
}

function timingSafeHexEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function requireValidExecutionToken(intent: Record<string, unknown>, intentType: string): void {
  const raw = intent.executionToken;
  if (!raw || typeof raw !== "object") {
    throw new Error("Approval required. Missing execution token.");
  }

  const token = raw as ExecutionToken;
  const requiredFields: Array<keyof ExecutionToken> = [
    "intent_id",
    "approved_by",
    "timestamp",
    "scope_hash",
    "signature"
  ];

  for (const key of requiredFields) {
    if (!token[key] || typeof token[key] !== "string") {
      throw new Error(`Execution token invalid: missing ${key}`);
    }
  }

  const intentId = String(intent.intent_id ?? "");
  if (!intentId || token.intent_id !== intentId) {
    throw new Error("Execution token invalid: intent_id mismatch");
  }

  const approvedBy = token.approved_by.toLowerCase();
  if (approvedBy !== "anchor") {
    throw new Error("Execution token invalid: approved_by must be anchor");
  }

  const ts = Date.parse(token.timestamp);
  if (Number.isNaN(ts)) {
    throw new Error("Execution token invalid: timestamp malformed");
  }

  const maxAgeSeconds = Number.parseInt(process.env.EXECUTION_TOKEN_MAX_AGE_SECONDS ?? "600", 10);
  if (Math.abs(Date.now() - ts) / 1000 > maxAgeSeconds) {
    throw new Error("Execution token expired");
  }

  const scope = buildIntentScope(intent, intentType);
  const computedScopeHash = computeScopeHash(scope);
  if (!timingSafeHexEqual(token.scope_hash, computedScopeHash)) {
    throw new Error("Execution token invalid: scope hash mismatch");
  }

  const signable = JSON.stringify({
    intent_id: token.intent_id,
    approved_by: token.approved_by,
    timestamp: token.timestamp,
    scope_hash: token.scope_hash
  });

  const publicKeyPem = getExecutionPublicKeyPem();
  const isValid = crypto.verify(
    null,
    Buffer.from(signable),
    publicKeyPem,
    Buffer.from(token.signature, "hex")
  );

  if (!isValid) {
    throw new Error("Execution token invalid: signature verification failed");
  }
}
