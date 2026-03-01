import OpenAI from "openai";
import { getOpenAIApiKey } from "../security/secretVault";

export interface AiAuditResult {
  overallStatus: "STABLE" | "WARNING" | "CRITICAL";
  riskLevel: number;
  issues: Array<{
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    area: string;
    why: string;
    impact: string;
    fix: string;
    priority: number;
  }>;
  upgradePlan: Array<{
    step: number;
    action: string;
    expectedOutcome: string;
  }>;
}

function fallbackAiResult(): AiAuditResult {
  return {
    overallStatus: "WARNING",
    riskLevel: 3,
    issues: [
      {
        severity: "MEDIUM",
        area: "AI Layer",
        why: "OpenAI API key not available",
        impact: "AI-enhanced risk reasoning unavailable",
        fix: "Set OPENAI_API_KEY in runtime environment",
        priority: 3
      }
    ],
    upgradePlan: [
      {
        step: 1,
        action: "Inject OPENAI_API_KEY into service environment",
        expectedOutcome: "AI structured engineering reasoning enabled"
      }
    ]
  };
}

export async function enhanceAuditWithAI(auditData: unknown): Promise<AiAuditResult> {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return fallbackAiResult();
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a senior systems engineer. Return strict JSON with keys: overallStatus, riskLevel (1-5), issues[], upgradePlan[]. No markdown. No prose outside JSON."
      },
      {
        role: "user",
        content: JSON.stringify(auditData)
      }
    ]
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as AiAuditResult;

  return {
    overallStatus: parsed.overallStatus ?? "WARNING",
    riskLevel: parsed.riskLevel ?? 3,
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    upgradePlan: Array.isArray(parsed.upgradePlan) ? parsed.upgradePlan : []
  };
}
