import fs from "fs";
import path from "path";
import { writeIntegrityHash } from "../system/integrity";

const JOURNAL_PATH = path.join(process.cwd(), "memory", "journal.log");

export function appendKernelJournal(entry: string): string {
  const timestamp = new Date().toISOString();
  const record = `${timestamp} | ${entry}`;

  fs.appendFileSync(JOURNAL_PATH, `${record}\n`);

  // Update the canonical composite integrity hash after every journal append.
  return writeIntegrityHash();
}
