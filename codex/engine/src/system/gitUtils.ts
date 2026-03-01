import { execSync } from "child_process";

const GIT_CANDIDATE_DIRS = [process.cwd(), "/home/t79/VYRDON"];

function runGit(cmd: string): string {
  for (const cwd of GIT_CANDIDATE_DIRS) {
    try {
      return execSync(cmd, { cwd, encoding: "utf8" }).trim();
    } catch {
      // try next
    }
  }

  throw new Error("No git repository available for command");
}

export function getGitCommit(): string {
  try {
    return runGit("git rev-parse HEAD");
  } catch {
    return "NO_GIT_REPO";
  }
}

export function getGitBranch(): string {
  try {
    return runGit("git rev-parse --abbrev-ref HEAD");
  } catch {
    return "NO_GIT_REPO";
  }
}

export function isGitDirty(): boolean {
  try {
    return runGit("git status --porcelain").length > 0;
  } catch {
    return false;
  }
}
