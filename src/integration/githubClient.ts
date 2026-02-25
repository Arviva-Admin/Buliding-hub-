import { ModelCircuitBreaker } from "../core/circuitBreaker.js";
import { shouldEscalate } from "../core/escalation.js";
import type { BuildContext, Task } from "../core/types.js";
import type { RuntimeConfigProvider } from "../config/runtimeConfig.js";

export interface GitHubApiTransport {
  createRepo(params: { name: string; privateRepo: boolean; token: string }): Promise<{ repoUrl: string; fullName: string }>;
  pushFiles(params: {
    repoFullName: string;
    branch: string;
    files: { path: string; content: string }[];
    message: string;
    token: string;
  }): Promise<void>;
  createBranch(params: { repoFullName: string; fromBranch: string; newBranch: string; token: string }): Promise<void>;
  createPullRequest(params: {
    repoFullName: string;
    title: string;
    body: string;
    head: string;
    base: string;
    token: string;
  }): Promise<{ url: string }>;
  addWorkflowFile(params: {
    repoFullName: string;
    path: string;
    content: string;
    message: string;
    token: string;
  }): Promise<void>;
}

export class GitHubClient {
  private readonly breaker: ModelCircuitBreaker;

  constructor(
    private readonly configProvider: RuntimeConfigProvider,
    private readonly transport: GitHubApiTransport,
  ) {
    this.breaker = new ModelCircuitBreaker(
      { failureThreshold: 3, cooldownMs: 30_000 },
      {
        github: async (task) => ({ taskId: task.id, provider: "github", output: await this.dispatch(task) }),
      },
      () => "github",
    );
  }

  async createRepo(name: string, privateRepo = true): Promise<{ repoUrl: string; fullName: string }> {
    const output = await this.callWithRecovery("github:createRepo", JSON.stringify({ name, privateRepo }));
    return JSON.parse(output) as { repoUrl: string; fullName: string };
  }

  async pushFiles(params: {
    repoFullName: string;
    branch: string;
    files: { path: string; content: string }[];
    message: string;
  }): Promise<void> {
    await this.callWithRecovery("github:pushFiles", JSON.stringify(params));
  }

  async createBranch(params: { repoFullName: string; fromBranch: string; newBranch: string }): Promise<void> {
    await this.callWithRecovery("github:createBranch", JSON.stringify(params));
  }

  async createPullRequest(params: {
    repoFullName: string;
    title: string;
    body: string;
    head: string;
    base: string;
  }): Promise<{ url: string }> {
    const output = await this.callWithRecovery("github:createPullRequest", JSON.stringify(params));
    return JSON.parse(output) as { url: string };
  }

  async addWorkflowFile(params: {
    repoFullName: string;
    path: string;
    content: string;
    message: string;
  }): Promise<void> {
    await this.callWithRecovery("github:addWorkflowFile", JSON.stringify(params));
  }

  private async callWithRecovery(id: string, prompt: string): Promise<string> {
    const task: Task = { id, type: "testing", prompt };
    try {
      const result = await this.breaker.call("github", task);
      return result.output;
    } catch (error) {
      const context: BuildContext = {
        task,
        retryCount: 3,
        modelConfidence: 0.5,
        riskScore: 0.6,
      };
      const escalation = shouldEscalate(context);
      if (escalation !== "AUTONOMOUS") {
        throw new Error(`GitHub operation escalated (${escalation}): ${String(error)}`);
      }
      throw error;
    }
  }

  private async dispatch(task: Task): Promise<string> {
    const { secrets } = this.configProvider.get();
    const githubToken = secrets.githubToken;
    const payload = JSON.parse(task.prompt) as Record<string, unknown>;

    switch (task.id) {
      case "github:createRepo":
        return JSON.stringify(
          await this.transport.createRepo({
            name: String(payload.name),
            privateRepo: Boolean(payload.privateRepo),
            token: githubToken,
          }),
        );
      case "github:pushFiles":
        await this.transport.pushFiles({
          repoFullName: String(payload.repoFullName),
          branch: String(payload.branch),
          files: payload.files as { path: string; content: string }[],
          message: String(payload.message),
          token: githubToken,
        });
        return "ok";
      case "github:createBranch":
        await this.transport.createBranch({
          repoFullName: String(payload.repoFullName),
          fromBranch: String(payload.fromBranch),
          newBranch: String(payload.newBranch),
          token: githubToken,
        });
        return "ok";
      case "github:createPullRequest":
        return JSON.stringify(
          await this.transport.createPullRequest({
            repoFullName: String(payload.repoFullName),
            title: String(payload.title),
            body: String(payload.body),
            head: String(payload.head),
            base: String(payload.base),
            token: githubToken,
          }),
        );
      case "github:addWorkflowFile":
        await this.transport.addWorkflowFile({
          repoFullName: String(payload.repoFullName),
          path: String(payload.path),
          content: String(payload.content),
          message: String(payload.message),
          token: githubToken,
        });
        return "ok";
      default:
        throw new Error(`Unsupported GitHub operation: ${task.id}`);
    }
  }
}
