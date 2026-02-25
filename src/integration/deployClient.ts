import { ModelCircuitBreaker } from "../core/circuitBreaker.js";
import { SagaRunner } from "../core/saga.js";
import type { DeploymentStatus, Task } from "../core/types.js";

export interface DeployAdapter {
  trigger(params: { repoFullName: string; branch: string }): Promise<{ deploymentId: string; url?: string }>;
  status(deploymentId: string): Promise<DeploymentStatus["status"]>;
  rollback?(deploymentId: string): Promise<void>;
}

export class DeployClient {
  private readonly breaker: ModelCircuitBreaker;
  private readonly saga = new SagaRunner();

  constructor(private readonly adapters: Record<"vercel" | "hetzner", DeployAdapter | undefined>) {
    this.breaker = new ModelCircuitBreaker(
      { failureThreshold: 2, cooldownMs: 20_000 },
      {
        deploy: async (task) => ({ taskId: task.id, provider: "deploy", output: await this.dispatch(task) }),
      },
      () => "deploy",
    );
  }

  async triggerDeployment(params: {
    target: "vercel" | "hetzner";
    repoFullName: string;
    branch: string;
  }): Promise<DeploymentStatus> {
    const adapter = this.getAdapter(params.target);
    let deploymentId = "";

    const steps = [
      {
        id: "trigger-deployment",
        type: "compensatable" as const,
        maxRetries: 1,
        execute: async () => {
          const output = await this.callWithBreaker("deploy:trigger", JSON.stringify(params));
          const parsed = JSON.parse(output) as { deploymentId: string; url?: string };
          deploymentId = parsed.deploymentId;
          return parsed;
        },
        compensate: async () => {
          if (deploymentId && adapter.rollback) {
            await adapter.rollback(deploymentId);
          }
        },
      },
      {
        id: "poll-deployment",
        type: "read-only" as const,
        maxRetries: 0,
        execute: async () => this.waitForCompletion(params.target, deploymentId),
      },
    ];

    const result = await this.saga.run(steps);
    const failure = result.find((r) => r.error);
    if (failure?.error) {
      throw failure.error;
    }

    const triggerResult = result[0]?.result as { deploymentId: string; url?: string };
    return {
      id: triggerResult.deploymentId,
      target: params.target,
      status: "success",
      url: triggerResult.url,
    };
  }

  async getDeploymentStatus(params: {
    target: "vercel" | "hetzner";
    deploymentId: string;
  }): Promise<DeploymentStatus> {
    const status = await this.callWithBreaker("deploy:status", JSON.stringify(params));
    return JSON.parse(status) as DeploymentStatus;
  }

  private async waitForCompletion(target: "vercel" | "hetzner", deploymentId: string): Promise<void> {
    for (let i = 0; i < 10; i += 1) {
      const status = await this.getDeploymentStatus({ target, deploymentId });
      if (status.status === "success") return;
      if (status.status === "failed") {
        throw new Error(`Deployment failed for ${deploymentId}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Deployment timeout for ${deploymentId}`);
  }

  private getAdapter(target: "vercel" | "hetzner"): DeployAdapter {
    const adapter = this.adapters[target];
    if (!adapter) {
      throw new Error(`Deploy target '${target}' is not configured`);
    }
    return adapter;
  }

  private async callWithBreaker(id: string, prompt: string): Promise<string> {
    const task: Task = { id, type: "testing", prompt };
    const result = await this.breaker.call("deploy", task);
    return result.output;
  }

  private async dispatch(task: Task): Promise<string> {
    const payload = JSON.parse(task.prompt) as Record<string, unknown>;

    if (task.id === "deploy:trigger") {
      const target = String(payload.target) as "vercel" | "hetzner";
      const adapter = this.getAdapter(target);
      return JSON.stringify(
        await adapter.trigger({
          repoFullName: String(payload.repoFullName),
          branch: String(payload.branch),
        }),
      );
    }

    if (task.id === "deploy:status") {
      const target = String(payload.target) as "vercel" | "hetzner";
      const adapter = this.getAdapter(target);
      const deploymentId = String(payload.deploymentId);
      const status = await adapter.status(deploymentId);
      return JSON.stringify({ id: deploymentId, target, status } satisfies DeploymentStatus);
    }

    throw new Error(`Unsupported deploy operation: ${task.id}`);
  }
}
