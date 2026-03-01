import fs from "fs";
import path from "path";

const BACKLOG_PATH = path.join(process.cwd(), "workspace", "backlog.json");

export interface BacklogItem {
  id: string;
  title: string;
  priority: number;
  status: "OPEN" | "ACTIVE" | "DONE";
}

export function readBacklog(): BacklogItem[] {
  return JSON.parse(fs.readFileSync(BACKLOG_PATH, "utf8")) as BacklogItem[];
}

export function writeBacklog(items: BacklogItem[]): void {
  fs.writeFileSync(BACKLOG_PATH, JSON.stringify(items, null, 2));
}
