import { BootSystemPromo, StructuredIntent } from "../types/engine";

export type IntentClassification = "guard" | "controlled";

export function classifyIntent(intent: StructuredIntent, bootstrap: BootSystemPromo): IntentClassification {
  if (intent.action === "analyze" || intent.action === "audit") {
    return "guard";
  }

  if (intent.action === "modify" || intent.action === "deploy") {
    if (bootstrap.approval_contract.required_for_controlled_domain) {
      return "controlled";
    }
  }

  return "controlled";
}
