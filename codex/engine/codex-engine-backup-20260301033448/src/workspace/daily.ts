import fs from "fs";
import path from "path";

const DAILY_PATH = path.join(process.cwd(), "workspace", "daily.json");

export interface DailyRecord {
  date: string;
  amReport: string;
  pmReport: string;
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export function readDaily(): DailyRecord {
  return JSON.parse(fs.readFileSync(DAILY_PATH, "utf8")) as DailyRecord;
}

export function writeDaily(record: DailyRecord): void {
  fs.writeFileSync(DAILY_PATH, JSON.stringify(record, null, 2));
}
