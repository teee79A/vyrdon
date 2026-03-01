import fs from "fs";
import path from "path";
import { appendHashChain } from "../memory/hashChain";
import { writeIntegrityHash } from "../system/integrity";

const JOURNAL_PATH = path.join(process.cwd(), "memory", "journal.log");

export function appendKernelJournal(entry: string): string {
  const timestamp = new Date().toISOString();
  const baseRecord = `${timestamp} | ${entry}`;
  const chain = appendHashChain(baseRecord);
  const record = `${baseRecord} | prev_hash=${chain.prevHash} | hash=${chain.entryHash}`;

  fs.appendFileSync(JOURNAL_PATH, `${record}\n`);

  // Update the canonical composite integrity hash after every journal append.
  return writeIntegrityHash();
}
