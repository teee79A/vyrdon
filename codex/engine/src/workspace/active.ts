import fs from "fs";
import path from "path";

const ACTIVE_PATH = path.join(process.cwd(), "workspace", "active.json");

export interface ActiveTask {
  taskId: string;
  startedAtUTC: string;
  state: string;
}

export function readActiveTask(): ActiveTask {
  return JSON.parse(fs.readFileSync(ACTIVE_PATH, "utf8")) as ActiveTask;
}

export function writeActiveTask(task: ActiveTask): void {
  fs.writeFileSync(ACTIVE_PATH, JSON.stringify(task, null, 2));
}
