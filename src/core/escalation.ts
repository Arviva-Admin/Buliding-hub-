import type { BuildContext, EscalationLevel } from "./types.js";

export function shouldEscalate(context: BuildContext): EscalationLevel {
  if (context.riskScore > 0.7) return "STOP_IMMEDIATE";
  if (context.modelConfidence < 0.6) return "DRAFT_MODE";
  if (context.retryCount >= 3) return "HUMAN_REVIEW";
  return "AUTONOMOUS";
}
