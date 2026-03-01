import crypto from "crypto";
import { appendJournal } from "../memory/journal";
import { updateState } from "../memory/state";
import { getGitCommit } from "./gitUtils";
import { computeRuleHash, loadRules } from "./rules";

interface ProposalInput {
  proposalId?: string;
  type?: string;
  payload?: {
    amount?: number;
    [key: string]: unknown;
  };
}

export function evaluateProposal(input: ProposalInput): {
  status: "CERTIFIED" | "REJECTED" | "MANUAL_REVIEW";
  reason: string;
  decisionHash: string;
  proposalId: string;
  ruleVersion: string;
  ruleHash: string;
  gitCommit: string;
  timestampUTC: string;
} {
  const proposalId = input.proposalId ?? crypto.randomUUID();
  const amount = Number(input.payload?.amount ?? 0);
  const rules = loadRules();
  const ruleHash = computeRuleHash(rules);
  const gitCommit = getGitCommit();
  const timestampUTC = new Date().toISOString();

  let status: "CERTIFIED" | "REJECTED" | "MANUAL_REVIEW" = "CERTIFIED";
  let reason = "Proposal certified";

  if (!Number.isFinite(amount) || amount < 0) {
    status = "REJECTED";
    reason = "Invalid amount";
  } else if (amount > rules.payment.maxAmount) {
    status = "REJECTED";
    reason = "Amount exceeds max limit";
  } else if (amount > rules.payment.requireManualReviewAbove) {
    status = "MANUAL_REVIEW";
    reason = "Manual review required by policy";
  }

  const decisionHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        proposalId,
        proposalType: input.type ?? "GENERIC",
        amount,
        status,
        reason,
        ruleVersion: rules.ruleVersion,
        ruleHash,
        gitCommit,
        timestampUTC
      })
    )
    .digest("hex");

  appendJournal("PROPOSAL_DECISION", {
    proposalId,
    status,
    decisionHash,
    ruleVersion: rules.ruleVersion
  });

  updateState({
    activeContext: `proposal:${proposalId}`,
    lastProposalDecision: `${status}:${decisionHash}`
  });

  return {
    status,
    reason,
    decisionHash,
    proposalId,
    ruleVersion: rules.ruleVersion,
    ruleHash,
    gitCommit,
    timestampUTC
  };
}
