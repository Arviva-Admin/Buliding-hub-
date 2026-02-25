import type { Task, TaskType } from "../core/types.js";

export interface ProviderConfig {
  primary: Record<string, string>;
  fallback: {
    tier1: string;
    tier2: string;
  };
}

export const defaultProviderConfig: ProviderConfig = {
  primary: {
    reasoning: "deepseek-v3",
    coding: "groq/deepseek-coder",
    validation: "mistral-large",
    refinement: "gemini-2.0-flash",
  },
  fallback: {
    tier1: "groq/llama-3-70b",
    tier2: "gemini-1.5-pro",
  },
};

export class TaskRouter {
  constructor(private readonly config: ProviderConfig = defaultProviderConfig) {}

  selectProvider(taskType: TaskType): string {
    const mapping: Record<TaskType, string> = {
      architecture: this.config.primary.reasoning,
      codegen: this.config.primary.coding,
      refactor: this.config.primary.refinement,
      security: this.config.primary.validation,
      testing: this.config.fallback.tier1,
    };

    return mapping[taskType];
  }

  fallbackProvider(_task: Task): string {
    return this.config.fallback.tier1;
  }
}
