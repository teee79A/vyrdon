import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface RulesConfig {
  ruleVersion: string;
  payment: {
    maxAmount: number;
    requireManualReviewAbove: number;
  };
}

const RULES_PATH = path.join(process.cwd(), "config", "rules.json");

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortedJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortedJson(v)])
    );
  }

  return value;
}

export function loadRules(): RulesConfig {
  if (!fs.existsSync(RULES_PATH)) {
    throw new Error("Missing config/rules.json");
  }

  const parsed = JSON.parse(fs.readFileSync(RULES_PATH, "utf8")) as RulesConfig;

  if (!parsed.ruleVersion || !parsed.payment) {
    throw new Error("Invalid config/rules.json");
  }

  return parsed;
}

export function computeRuleHash(rules: RulesConfig): string {
  return crypto.createHash("sha256").update(JSON.stringify(sortedJson(rules))).digest("hex");
}
