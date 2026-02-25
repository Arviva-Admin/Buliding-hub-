import { describe, expect, it } from "vitest";
import { BuildingHub } from "../src/orchestration/buildingHub.js";
import { ModelCircuitBreaker } from "../src/core/circuitBreaker.js";
import { TaskRouter } from "../src/orchestration/providerRouter.js";
import { BasicValidationGate } from "../src/core/validation.js";
import type { Task } from "../src/core/types.js";
import { GitHubClient } from "../src/integration/githubClient.js";
import { ServerClient } from "../src/integration/serverClient.js";
import { DeployClient } from "../src/integration/deployClient.js";
import { StaticRuntimeConfigProvider } from "../src/config/runtimeConfig.js";

const task: Task = {
  id: "code-task",
  type: "codegen",
  prompt: "create a function",
};

function deps() {
  const cfg = new StaticRuntimeConfigProvider({ secrets: { githubToken: "gh", hetznerToken: "hz", vercelToken: "vc" }, projects: [] });

  return {
    githubClient: new GitHubClient(cfg, {
      createRepo: async ({ name }) => ({ repoUrl: `https://github.com/acme/${name}`, fullName: `acme/${name}` }),
      pushFiles: async () => undefined,
      createBranch: async () => undefined,
      createPullRequest: async () => ({ url: "https://github.com/acme/repo/pull/1" }),
      addWorkflowFile: async () => undefined,
    }),
    serverClient: new ServerClient(cfg, { exec: async () => ({ stdout: "ok", stderr: "", exitCode: 0 }) }),
    deployClient: new DeployClient({
      vercel: { trigger: async () => ({ deploymentId: "d1" }), status: async () => "success" },
      hetzner: undefined,
    }),
  };
}

describe("BuildingHub", () => {
  it("runs generation + independent validation successfully", async () => {
    const breaker = new ModelCircuitBreaker(
      { failureThreshold: 3, cooldownMs: 1_000 },
      {
        "groq/deepseek-coder": async (input) => ({
          taskId: input.id,
          provider: "groq/deepseek-coder",
          output: "export const x = 1;",
        }),
      },
      () => "groq/deepseek-coder",
    );

    const hub = new BuildingHub({
      router: new TaskRouter(),
      validation: new BasicValidationGate(),
      breaker,
      validateWithIndependentModel: async () => ({ passed: true, issues: [] }),
      autoFix: async (result) => result,
      ...deps(),
    });

    const result = await hub.executeWithRecovery(task);
    expect(result.output).toContain("export const x");
  });

  it("auto-fixes when post-generation validation fails", async () => {
    const breaker = new ModelCircuitBreaker(
      { failureThreshold: 3, cooldownMs: 1_000 },
      {
        "groq/deepseek-coder": async (input) => ({
          taskId: input.id,
          provider: "groq/deepseek-coder",
          output: "```ts broken ```",
        }),
      },
      () => "groq/deepseek-coder",
    );

    const hub = new BuildingHub({
      router: new TaskRouter(),
      validation: new BasicValidationGate(),
      breaker,
      validateWithIndependentModel: async () => ({ passed: true, issues: [] }),
      autoFix: async (result) => ({ ...result, output: "export const repaired = true;" }),
      ...deps(),
    });

    const result = await hub.executeWithRecovery(task);
    expect(result.output).toContain("repaired");
  });
});
