export function verifyNodeVersion(): { status: "PASS" } | { status: "FAIL"; reason: string } {
  const requiredMajor = 20;
  const currentMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

  if (currentMajor !== requiredMajor) {
    return {
      status: "FAIL",
      reason: `Node version mismatch. Required: ${requiredMajor}, Found: ${currentMajor}`
    };
  }

  return { status: "PASS" };
}

