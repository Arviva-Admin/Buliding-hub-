import type { Task, TaskResult } from "./types.js";

interface CircuitConfig {
  failureThreshold: number;
  cooldownMs: number;
}

interface ProviderExecutor {
  [provider: string]: (task: Task) => Promise<TaskResult>;
}

export class ModelCircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureAt = new Map<string, number>();

  constructor(
    private readonly config: CircuitConfig,
    private readonly executors: ProviderExecutor,
    private readonly fallbackProvider: (task: Task) => string,
  ) {}

  async call(provider: string, task: Task): Promise<TaskResult> {
    if (this.isOpen(provider)) {
      const fallback = this.fallbackProvider(task);
      return this.execute(fallback, task);
    }

    try {
      const result = await this.execute(provider, task);
      this.failures.set(provider, 0);
      return result;
    } catch (error) {
      this.failures.set(provider, (this.failures.get(provider) ?? 0) + 1);
      this.lastFailureAt.set(provider, Date.now());
      throw error;
    }
  }

  openCircuit(provider: string): void {
    this.failures.set(provider, this.config.failureThreshold);
    this.lastFailureAt.set(provider, Date.now());
  }

  private isOpen(provider: string): boolean {
    const failures = this.failures.get(provider) ?? 0;
    if (failures < this.config.failureThreshold) {
      return false;
    }

    const lastFailure = this.lastFailureAt.get(provider) ?? 0;
    const inCooldown = Date.now() - lastFailure < this.config.cooldownMs;
    if (!inCooldown) {
      this.failures.set(provider, 0);
      return false;
    }

    return true;
  }

  private execute(provider: string, task: Task): Promise<TaskResult> {
    const executor = this.executors[provider];
    if (!executor) {
      throw new Error(`No executor configured for provider: ${provider}`);
    }
    return executor(task);
  }
}
