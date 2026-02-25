import { describe, expect, it } from "vitest";
import { DeployClient } from "../src/integration/deployClient.js";
import { ServerClient } from "../src/integration/serverClient.js";
import { StaticRuntimeConfigProvider } from "../src/config/runtimeConfig.js";

describe("DeployClient", () => {
  it("rolls back when deployment fails", async () => {
    let rolledBack = false;
    const deploy = new DeployClient({
      vercel: {
        trigger: async () => ({ deploymentId: "dep-1" }),
        status: async () => "failed",
        rollback: async () => {
          rolledBack = true;
        },
      },
      hetzner: undefined,
    });

    await expect(
      deploy.triggerDeployment({ target: "vercel", repoFullName: "acme/repo", branch: "main" }),
    ).rejects.toThrow(/Deployment failed/);
    expect(rolledBack).toBe(true);
  });
});

describe("ServerClient", () => {
  it("executes deploy steps via saga", async () => {
    const commands: string[] = [];
    const client = new ServerClient(
      new StaticRuntimeConfigProvider({
        secrets: { githubToken: "gh", hetznerToken: "hz", vercelToken: "vc" },
        projects: [],
      }),
      {
        exec: async (command) => {
          commands.push(command);
          return { stdout: "ok", stderr: "", exitCode: 0 };
        },
      },
    );

    await client.deployService({
      serviceName: "api",
      repoUrl: "https://github.com/acme/repo.git",
      branch: "main",
      buildCommand: "npm run build",
      startCommand: "npm run start",
    });

    expect(commands.some((c) => c.includes("git"))).toBe(true);
    expect(commands.some((c) => c.includes("systemctl restart"))).toBe(true);
  });
});
