import fs from "fs";
import path from "path";
import { EngineState } from "../types/engine";

const STATE_PATH = path.join(process.cwd(), "memory", "state.json");

const allowedTransitions: Record<EngineState, EngineState[]> = {
  BOOT: ["IDLE"],
  IDLE: ["TASK_ACTIVE"],
  TASK_ACTIVE: ["VALIDATING"],
  VALIDATING: ["EXECUTING"],
  EXECUTING: ["VERIFIED"],
  VERIFIED: ["ARCHIVED"],
  ARCHIVED: ["IDLE"]
};

export function getCurrentState(): EngineState {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error("State file missing.");
  }

  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as { currentState: EngineState };
  return state.currentState;
}

export function assertTransition(current: EngineState, next: EngineState): void {
  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(`Invalid state transition: ${current} -> ${next}`);
  }
}

export function transitionState(nextState: EngineState): void {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error("State file missing.");
  }

  const state = JSON.parse(
    fs.readFileSync(STATE_PATH, "utf8")
  ) as Record<string, unknown> & { currentState: EngineState };

  const current = state.currentState;
  assertTransition(current, nextState);

  state.currentState = nextState;
  state.lastTransitionUTC = new Date().toISOString();

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}
