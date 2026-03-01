import fs from "fs";

function boolEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }

  const value = raw.trim().toLowerCase();
  if (value === "1" || value === "true" || value === "yes") {
    return true;
  }

  if (value === "0" || value === "false" || value === "no") {
    return false;
  }

  return defaultValue;
}

function detectContainerRuntime(): boolean {
  if (fs.existsSync("/.dockerenv")) {
    return true;
  }

  try {
    const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
    return /(docker|containerd|kubepods|podman)/i.test(cgroup);
  } catch {
    return false;
  }
}

export function enforceContainerOnlyRuntime(): void {
  const required = boolEnv("REQUIRE_CONTAINER_RUNTIME", true);
  if (!required) {
    return;
  }

  if (!detectContainerRuntime()) {
    throw new Error("Container-only runtime enforced. Host/VSCode execution is blocked.");
  }
}
