import fs from "fs";
import path from "path";

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
  const line = payload ? `${timestamp} | ${event} | ${payload}\n` : `${timestamp} | ${event}\n`;
  fs.appendFileSync(JOURNAL_PATH, line);
}

export function readRecentJournalLines(limit = 50): string[] {
  if (!fs.existsSync(JOURNAL_PATH)) {
    return [];
  }

  const lines = fs.readFileSync(JOURNAL_PATH, "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(Math.max(0, lines.length - limit));
}
