import { ModelCircuitBreaker } from "../core/circuitBreaker.js";
import { SagaRunner } from "../core/saga.js";
import type { Task } from "../core/types.js";
import type { RuntimeConfigProvider } from "../config/runtimeConfig.js";

export interface SshTransport {
  exec(command: string, token: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

export class ServerClient {
  private readonly breaker: ModelCircuitBreaker;
  private readonly saga = new SagaRunner();

  constructor(
    private readonly configProvider: RuntimeConfigProvider,
    private readonly transport: SshTransport,
  ) {
    this.breaker = new ModelCircuitBreaker(
      { failureThreshold: 2, cooldownMs: 20_000 },
      {
        server: async (task) => ({ taskId: task.id, provider: "server", output: JSON.stringify(await this.execRaw(task.prompt)) }),
      },
      () => "server",
    );
  }

  async sshExec(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const task: Task = { id: "server:sshExec", type: "testing", prompt: command };
    const result = await this.breaker.call("server", task);
    return JSON.parse(result.output) as { stdout: string; stderr: string; exitCode: number };
  }

  async getLogs(serviceName: string): Promise<string> {
    const result = await this.sshExec(`journalctl -u ${serviceName} -n 200 --no-pager`);
    if (result.exitCode !== 0) {
      throw new Error(`Failed to get logs for ${serviceName}: ${result.stderr}`);
    }
    return result.stdout;
  }

  async deployService(params: {
    serviceName: string;
    repoUrl: string;
    branch: string;
    buildCommand: string;
    startCommand: string;
  }): Promise<void> {
    const workspace = `/opt/services/${params.serviceName}`;
    const unitFile = `/etc/systemd/system/${params.serviceName}.service`;

    const steps = [
      {
        id: "clone-or-update",
        type: "reversible" as const,
        maxRetries: 1,
        execute: async () => this.ensureRepo(workspace, params.repoUrl, params.branch),
      },
      {
        id: "build",
        type: "compensatable" as const,
        maxRetries: 1,
        execute: async () => this.ensureSuccess(await this.sshExec(`cd ${workspace} && ${params.buildCommand}`), "build failed"),
      },
      {
        id: "start-service",
        type: "compensatable" as const,
        maxRetries: 0,
        execute: async () => {
          await this.sshExec(`printf '%s\n' '[Unit]' 'Description=${params.serviceName}' '[Service]' 'ExecStart=${params.startCommand}' 'WorkingDirectory=${workspace}' 'Restart=always' '[Install]' 'WantedBy=multi-user.target' | sudo tee ${unitFile} >/dev/null`);
          await this.ensureSuccess(await this.sshExec(`sudo systemctl daemon-reload && sudo systemctl restart ${params.serviceName}`), "service start failed");
        },
        compensate: async () => {
          await this.sshExec(`sudo systemctl stop ${params.serviceName} || true`);
          await this.sshExec(`sudo rm -f ${unitFile}`);
        },
      },
    ];

    const result = await this.saga.run(steps);
    const failure = result.find((r) => r.error);
    if (failure?.error) {
      throw failure.error;
    }
  }

  private async ensureRepo(workspace: string, repoUrl: string, branch: string): Promise<void> {
    const command = [
      `mkdir -p ${workspace}`,
      `[ -d ${workspace}/.git ] && (cd ${workspace} && git fetch --all) || git clone ${repoUrl} ${workspace}`,
      `cd ${workspace} && git checkout ${branch} && git pull --ff-only origin ${branch}`,
    ].join(" && ");

    await this.ensureSuccess(await this.sshExec(command), "git sync failed");
  }

  private async execRaw(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const { secrets } = this.configProvider.get();
    return this.transport.exec(command, secrets.hetznerToken, 30_000);
  }

  private async ensureSuccess(
    result: { stdout: string; stderr: string; exitCode: number },
    message: string,
  ): Promise<void> {
    if (result.exitCode !== 0) {
      throw new Error(`${message}: ${result.stderr}`);
    }
  }
}
