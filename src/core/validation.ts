import type { Task, ValidationResult } from "./types.js";

export interface ValidationGate {
  preGeneration(task: Task): ValidationResult;
  postGeneration(code: string): ValidationResult;
}

export class BasicValidationGate implements ValidationGate {
  preGeneration(task: Task): ValidationResult {
    const issues = [] as ValidationResult["issues"];

    if (!task.id.trim()) {
      issues.push({ code: "TASK_ID_MISSING", message: "Task id is required." });
    }

    if (!task.prompt.trim()) {
      issues.push({ code: "PROMPT_MISSING", message: "Task prompt is required." });
    }

    return { passed: issues.length === 0, issues };
  }

  postGeneration(code: string): ValidationResult {
    const issues = [] as ValidationResult["issues"];

    if (!code.trim()) {
      issues.push({ code: "EMPTY_OUTPUT", message: "Generated output is empty." });
    }

    // Minimal syntax gate heuristic for generated TS snippets.
    if (code.includes("```")) {
      issues.push({
        code: "MARKDOWN_WRAPPED_CODE",
        message: "Code should be raw source without markdown fences.",
      });
    }

    return { passed: issues.length === 0, issues };
  }
}
