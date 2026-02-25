import { describe, expect, it } from "vitest";
import { GitHubClient, type GitHubApiTransport } from "../src/integration/githubClient.js";
import { StaticRuntimeConfigProvider } from "../src/config/runtimeConfig.js";

function createTransportWithFlakyCreateRepo(): GitHubApiTransport {
  let calls = 0;

  return {
    createRepo: async ({ name }) => {
      calls += 1;
      if (calls <= 3) throw new Error("rate limit");
      return { repoUrl: `https://github.com/acme/${name}`, fullName: `acme/${name}` };
    },
    pushFiles: async () => undefined,
    createBranch: async () => undefined,
    createPullRequest: async () => ({ url: "https://github.com/acme/repo/pull/1" }),
    addWorkflowFile: async () => undefined,
  };
}

describe("GitHubClient", () => {
  it("opens breaker and escalates after repeated failures", async () => {
    const client = new GitHubClient(
      new StaticRuntimeConfigProvider({
        secrets: { githubToken: "gh-token", hetznerToken: "hz-token", vercelToken: "vc-token" },
        projects: [],
      }),
      createTransportWithFlakyCreateRepo(),
    );

    await expect(client.createRepo("demo", true)).rejects.toThrow(/GitHub operation escalated/);
  });

  it("passes token via config provider to transport", async () => {
    let seenToken = "";
    const client = new GitHubClient(
      new StaticRuntimeConfigProvider({
        secrets: { githubToken: "gh-secret", hetznerToken: "hz-token", vercelToken: "vc-token" },
        projects: [],
      }),
      {
        createRepo: async ({ token }) => {
          seenToken = token;
          return { repoUrl: "https://github.com/acme/repo", fullName: "acme/repo" };
        },
        pushFiles: async () => undefined,
        createBranch: async () => undefined,
        createPullRequest: async () => ({ url: "https://github.com/acme/repo/pull/1" }),
        addWorkflowFile: async () => undefined,
      },
    );

    const result = await client.createRepo("repo", false);
    expect(result.fullName).toBe("acme/repo");
    expect(seenToken).toBe("gh-secret");
  });
});
