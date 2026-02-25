import type { BuildContext } from "./types.js";

export class LoopDetector {
  detectLoop(context: BuildContext): boolean {
    const history = context.actionHistory ?? [];
    if (history.length < 3) return false;

    const recentErrors = history.slice(-3).map((h) => h.error ?? "");
    const sameError = recentErrors.every((v) => v.length > 0 && v === recentErrors[0]);
    if (sameError) return true;

    const recentDiffs = history.slice(-5).map((h) => h.codeDiff ?? "");
    if (recentDiffs.length >= 5 && new Set(recentDiffs).size === 1) return true;

    return false;
  }
}
