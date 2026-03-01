import fs from "fs";
import path from "path";
import { appendHashChain } from "./hashChain";

const JOURNAL_PATH = path.join(process.cwd(), "memory", "journal.log");

function formatData(data: Record<string, unknown>): string {
  const pairs = Object.entries(data).map(([key, value]) => `${key}=${String(value)}`);
  return pairs.join(" ");
}

export function appendJournal(event: string, data: Record<string, unknown> = {}): void {
  if (!fs.existsSync(JOURNAL_PATH)) {
    fs.writeFileSync(JOURNAL_PATH, "");
  }

  const timestamp = new Date().toISOString();
  const payload = formatData(data);
  const base = payload ? `${timestamp} | ${event} | ${payload}` : `${timestamp} | ${event}`;
  const chain = appendHashChain(base);
  const line = `${base} | prev_hash=${chain.prevHash} | hash=${chain.entryHash}\n`;
  fs.appendFileSync(JOURNAL_PATH, line);
}

export function readRecentJournalLines(limit = 50): string[] {
  if (!fs.existsSync(JOURNAL_PATH)) {
    return [];
  }

  const lines = fs.readFileSync(JOURNAL_PATH, "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(Math.max(0, lines.length - limit));
}
