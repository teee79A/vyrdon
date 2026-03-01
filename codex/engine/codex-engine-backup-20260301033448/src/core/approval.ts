export interface ParsedApprovalCommand {
  type: "APPROVE" | "REJECT" | "STATUS";
  intentId: string | null;
}

export function parseApprovalCommand(input: string): ParsedApprovalCommand {
  const trimmed = input.trim();

  if (trimmed === "STATUS") {
    return { type: "STATUS", intentId: null };
  }

  const approveMatch = /^APPROVE\s+([A-Za-z0-9._:-]+)$/.exec(trimmed);
  if (approveMatch) {
    return { type: "APPROVE", intentId: approveMatch[1] };
  }

  const rejectMatch = /^REJECT\s+([A-Za-z0-9._:-]+)(?:\s+.*)?$/.exec(trimmed);
  if (rejectMatch) {
    return { type: "REJECT", intentId: rejectMatch[1] };
  }

  throw new Error("Invalid approval command syntax. Expected APPROVE <id>, REJECT <id>, or STATUS.");
}

export function isApprovalValid(command: string | undefined, intentId: string): boolean {
  if (!command) {
    return false;
  }

  const parsed = parseApprovalCommand(command);
  return parsed.type === "APPROVE" && parsed.intentId === intentId;
}
