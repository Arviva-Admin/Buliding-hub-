export type TaskType = "architecture" | "codegen" | "refactor" | "security" | "testing";

export interface Task {
  id: string;
  type: TaskType;
  prompt: string;
  requirements?: string[];
  providerHint?: string;
  complexity?: number;
}

export interface TaskResult {
  taskId: string;
  provider: string;
  output: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
}

export type EscalationLevel = "AUTONOMOUS" | "DRAFT_MODE" | "HUMAN_REVIEW" | "STOP_IMMEDIATE";

export interface BuildContext {
  task: Task;
  retryCount: number;
  modelConfidence: number;
  riskScore: number;
  actionHistory?: Array<{ action: string; error?: string; codeDiff?: string }>;
}

export interface ProviderClient {
  complete(task: Task): Promise<TaskResult>;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ProjectSpec {
  name: string;
  description: string;
  idea: string;
  privateRepo?: boolean;
  baseBranch?: string;
  featureBranch?: string;
  files?: ProjectFile[];
  deployTarget?: "vercel" | "hetzner" | "none";
}

export interface DeploymentStatus {
  id: string;
  target: "vercel" | "hetzner";
  status: "pending" | "running" | "success" | "failed";
  url?: string;
}
