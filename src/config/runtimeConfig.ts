export type DeployTarget = "vercel" | "hetzner" | "none";

export interface GlobalSecrets {
  githubToken: string;
  hetznerToken: string;
  vercelToken: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  repoFullName: string;
  defaultBranch: string;
  deployTarget: DeployTarget;
  serverId?: string;
  environments: string[];
}

export interface RuntimeConfig {
  secrets: GlobalSecrets;
  projects: ProjectConfig[];
}

export interface RuntimeConfigProvider {
  get(): RuntimeConfig;
  getProject(projectId: string): ProjectConfig;
}

export class StaticRuntimeConfigProvider implements RuntimeConfigProvider {
  constructor(private readonly config: RuntimeConfig) {}

  get(): RuntimeConfig {
    return this.config;
  }

  getProject(projectId: string): ProjectConfig {
    const project = this.config.projects.find((item) => item.id === projectId);
    if (!project) {
      throw new Error(`Project '${projectId}' is not configured in allowlist`);
    }
    return project;
  }
}
