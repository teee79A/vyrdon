import fs from "fs";
import path from "path";
import { EngineState } from "../types/engine";

const STATE_PATH = path.join(process.cwd(), "memory", "state.json");

export interface EngineStateFile {
  engineVersion: string;
  currentState: EngineState;
  lastBootUTC: string;
  lastAuditHash: string;
  lastBuildHash: string;
  lastReleaseHash: string;
  integrityHash: string;
  lastCheckpoint: string;
  activeContext: string;
  lastProposalDecision?: string | null;
  emergencyFlag?: boolean;
}

export function readState(): EngineStateFile {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error("Missing memory/state.json");
  }

  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as EngineStateFile;
}

export function writeState(next: EngineStateFile): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
}

export function updateState(patch: Partial<EngineStateFile>): EngineStateFile {
  const current = readState();
  const next = { ...current, ...patch };
  writeState(next);
  return next;
}
