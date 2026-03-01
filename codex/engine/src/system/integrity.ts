import crypto from "crypto";
import fs from "fs";
import path from "path";

const INTEGRITY_PATH = path.join(process.cwd(), "memory", "integrity.hash");
const STATE_PATH = path.join(process.cwd(), "memory", "state.json");
const MANDATORY_FILES_FOR_INTEGRITY = [
  path.join(process.cwd(), "system", "bootstrap.json"),
  path.join(process.cwd(), "system", "doctrine.json"),
  path.join(process.cwd(), "system", "hardware-profile.json"),
  path.join(process.cwd(), "memory", "journal.log"),
  STATE_PATH
];

const OPTIONAL_FILES_FOR_INTEGRITY = [
  path.join(process.cwd(), "memory", "journal.chain"),
  path.join(process.cwd(), "system", "identity.json"),
  path.join(process.cwd(), "system", "architecture-lock.json"),
  path.join(process.cwd(), "policies.json"),
  path.join(process.cwd(), "system", "system-prompt.txt")
];

interface MerkleLeaf {
  file: string;
  hash: string;
}

interface IntegrityEnvelopeV2 {
  version: "v2-merkle";
  generated_at_utc: string;
  merkle_root: string;
  composite_hash: string;
  leaves: MerkleLeaf[];
}

function resolveFilesForIntegrity(): string[] {
  return [
    ...MANDATORY_FILES_FOR_INTEGRITY,
    ...OPTIONAL_FILES_FOR_INTEGRITY.filter((filePath) => fs.existsSync(filePath))
  ];
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

function sha(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function computeLeavesForIntegrity(): MerkleLeaf[] {
  const filesForIntegrity = resolveFilesForIntegrity();

  for (const filePath of filesForIntegrity) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Integrity source missing: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  return filesForIntegrity.map((filePath) => {
    const file = path.relative(process.cwd(), filePath);
    const content = normalizedContent(filePath);
    return {
      file,
      hash: sha(`${file}:${content}`)
    };
  });
}

function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) {
    return sha("EMPTY_MERKLE");
  }

  let level = [...hashes];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(sha(`${left}${right}`));
    }

    level = next;
  }

  return level[0];
}

function computeCompositeFromLeaves(leaves: MerkleLeaf[]): string {
  return sha(
    JSON.stringify(
      leaves.map((entry) => ({
        file: entry.file,
        hash: entry.hash
      }))
    )
  );
}

export function computeCompositeIntegrityHash(): string {
  return computeCompositeFromLeaves(computeLeavesForIntegrity());
}

function computeMerkleIntegrity(): IntegrityEnvelopeV2 {
  const leaves = computeLeavesForIntegrity();
  const merkleRoot = computeMerkleRoot(leaves.map((entry) => entry.hash));
  const compositeHash = computeCompositeFromLeaves(leaves);

  return {
    version: "v2-merkle",
    generated_at_utc: new Date().toISOString(),
    merkle_root: merkleRoot,
    composite_hash: compositeHash,
    leaves
  };
}

function parseStoredIntegrity(raw: string): {
  expectedMerkleRoot: string | null;
  expectedComposite: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "PENDING") {
    throw new Error("Invalid memory/integrity.hash (unset)");
  }

  if (!trimmed.startsWith("{")) {
    return {
      expectedMerkleRoot: null,
      expectedComposite: trimmed
    };
  }

  const parsed = JSON.parse(trimmed) as Partial<IntegrityEnvelopeV2>;
  if (parsed.version !== "v2-merkle" || typeof parsed.merkle_root !== "string") {
    throw new Error("Invalid memory/integrity.hash (unsupported envelope)");
  }

  return {
    expectedMerkleRoot: parsed.merkle_root,
    expectedComposite: typeof parsed.composite_hash === "string" ? parsed.composite_hash : null
  };
}

export function verifyIntegrityHash(): { valid: boolean; expected: string; actual: string } {
  if (!fs.existsSync(INTEGRITY_PATH)) {
    throw new Error("Missing memory/integrity.hash");
  }

  const raw = fs.readFileSync(INTEGRITY_PATH, "utf8");
  const stored = parseStoredIntegrity(raw);
  const current = computeMerkleIntegrity();

  const validAgainstMerkle = stored.expectedMerkleRoot !== null && stored.expectedMerkleRoot === current.merkle_root;
  const validAgainstComposite = stored.expectedComposite !== null && stored.expectedComposite === current.composite_hash;
  const valid = validAgainstMerkle || validAgainstComposite;

  return {
    valid,
    expected: stored.expectedMerkleRoot ?? stored.expectedComposite ?? "unknown",
    actual: current.merkle_root
  };
}

export function writeIntegrityHash(): string {
  const envelope = computeMerkleIntegrity();
  const digest = envelope.merkle_root;

  const stateRaw = fs.readFileSync(STATE_PATH, "utf8");
  const state = JSON.parse(stateRaw) as Record<string, unknown>;
  state.integrityHash = digest;
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

  fs.writeFileSync(INTEGRITY_PATH, `${JSON.stringify(envelope, null, 2)}\n`);
  return digest;
}
