import crypto from "crypto";
import fs from "fs";
import path from "path";

const CHAIN_PATH = path.join(process.cwd(), "memory", "journal.chain");

function readPreviousHash(): string {
  if (!fs.existsSync(CHAIN_PATH)) {
    return "GENESIS";
  }

  const value = fs.readFileSync(CHAIN_PATH, "utf8").trim();
  return value || "GENESIS";
}

export function appendHashChain(entry: string): { prevHash: string; entryHash: string } {
  const prevHash = readPreviousHash();
  const entryHash = crypto.createHash("sha256").update(`${prevHash}|${entry}`).digest("hex");
  fs.writeFileSync(CHAIN_PATH, `${entryHash}\n`);
  return { prevHash, entryHash };
}
