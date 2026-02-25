import { describe, expect, it } from "vitest";
import { BuildingHub } from "../src/orchestration/buildingHub.js";
import { TaskRouter } from "../src/orchestration/providerRouter.js";
import { BasicValidationGate } from "../src/core/validation.js";
import { ModelCircuitBreaker } from "../src/core/circuitBreaker.js";
import { GitHubClient } from "../src/integration/githubClient.js";
import { ServerClient } from "../src/integration/serverClient.js";
import { DeployClient } from "../src/integration/deployClient.js";
import { StaticRuntimeConfigProvider } from "../src/config/runtimeConfig.js";

function makeHub() {
  const breaker = new ModelCircuitBreaker(
    { failureThreshold: 3, cooldownMs: 1_000 },
    {
      "deepseek-v3": async (input) => ({ taskId: input.id, provider: "deepseek-v3", output: "scaffold ok" }),
      "groq/deepseek-coder": async (input) => ({ taskId: input.id, provider: "groq/deepseek-coder", output: "export const ok = true;" }),
      "gemini-2.0-flash": async (input) => ({ taskId: input.id, provider: "gemini-2.0-flash", output: "refactor ok" }),
      "mistral-large": async (input) => ({ taskId: input.id, provider: "mistral-large", output: "secure" }),
      "groq/llama-3-70b": async (input) => ({ taskId: input.id, provider: "groq/llama-3-70b", output: "tests" }),
    },
    () => "groq/llama-3-70b",
  );

  const cfg = new StaticRuntimeConfigProvider({ secrets: { githubToken: "gh", hetznerToken: "hz", vercelToken: "vc" }, projects: [] });
  const github = new GitHubClient(cfg, {
    createRepo: async ({ name }) => ({ repoUrl: `https://github.com/acme/${name}`, fullName: `acme/${name}` }),
    pushFiles: async () => undefined,
    createBranch: async () => undefined,
    createPullRequest: async () => ({ url: "https://github.com/acme/demo/pull/1" }),
    addWorkflowFile: async () => undefined,
  });

  const server = new ServerClient(cfg, {
    exec: async () => ({ stdout: "ok", stderr: "", exitCode: 0 }),
  });

  const deploy = new DeployClient({
    vercel: {
      trigger: async () => ({ deploymentId: "dep-1", url: "https://demo.vercel.app" }),
      status: async () => "success",
    },
    hetzner: undefined,
  });

  return new BuildingHub({
    router: new TaskRouter(),
    validation: new BasicValidationGate(),
    breaker,
    validateWithIndependentModel: async () => ({ passed: true, issues: [] }),
    autoFix: async (result) => result,
    githubClient: github,
    deployClient: deploy,
    serverClient: server,
  });
}

describe("BuildingHub integration flow", () => {
  it("goes from spec to PR + deploy", async () => {
    const hub = makeHub();
    const spec = { name: "demo", description: "demo app", idea: "todo", deployTarget: "vercel" as const };
    const projectConfig = {
      id: "demo",
      name: "Demo",
      repoFullName: "acme/demo",
      defaultBranch: "main",
      deployTarget: "vercel" as const,
      environments: ["staging", "prod"],
    };

    const pr = await hub.openPullRequest(spec, projectConfig);
    const deployment = await hub.triggerDeployment(spec, projectConfig);

    expect(pr.url).toContain("pull");
    expect(deployment.status).toBe("success");
  });
});
