export type StepType = "read-only" | "reversible" | "compensatable" | "final";

export interface BuildStep<T = unknown> {
  id: string;
  type: StepType;
  execute: () => Promise<T>;
  compensate?: () => Promise<void>;
  maxRetries: number;
}

export interface StepExecution<T = unknown> {
  stepId: string;
  result?: T;
  error?: Error;
  attempts: number;
}

export class SagaRunner {
  async run(steps: Array<BuildStep<unknown>>): Promise<StepExecution<unknown>[]> {
    const executed: Array<BuildStep<unknown>> = [];
    const output: StepExecution<unknown>[] = [];

    for (const step of steps) {
      let attempts = 0;
      let lastError: Error | undefined;

      while (attempts <= step.maxRetries) {
        attempts += 1;
        try {
          const result = await step.execute();
          executed.push(step);
          output.push({ stepId: step.id, result, attempts });
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      if (lastError) {
        output.push({ stepId: step.id, error: lastError, attempts });
        await this.rollback(executed);
        return output;
      }
    }

    return output;
  }

  private async rollback(steps: Array<BuildStep<unknown>>): Promise<void> {
    for (const step of [...steps].reverse()) {
      if (step.type === "final") {
        continue;
      }
      if (step.compensate) {
        await step.compensate();
      }
    }
  }
}
