export type Status = "ok" | "warn" | "error" | "running";
export type StepStatus = "planned" | "ongoing" | "done" | "failed";

export interface HubHealth {
  status: "OK" | "Degraded" | "Error";
  integrations: {
    github: "connected" | "degraded" | "down";
    server: "connected" | "degraded" | "down";
    deploy: "connected" | "degraded" | "down";
  };
}

export interface HubDashboardMetrics {
  activeProjects: number;
  runsLast24h: number;
  errorsLast24h: number;
  totalRunsLast24h: number;
}

export interface ProjectConfigItem {
  id: string;
  name: string;
  repoFullName: string;
  defaultBranch: string;
  deployTarget: "vercel" | "hetzner" | "none";
  serverId?: string;
  environments: string[];
}

export interface AgentState {
  id: string;
  name: string;
  role: "Arkitekt" | "Kodare" | "Reviewer" | "Deploy" | "Debugger";
  currentStep: string;
  status: Status;
}

export interface RunEvent {
  id: string;
  time: string;
  type: "build" | "test" | "deploy" | "server";
  status: Status;
  message: string;
}

export interface TestResult {
  id: string;
  file: string;
  status: Status;
  durationMs: number;
  log: string;
  history: number[];
}

export interface CommitItem {
  id: string;
  message: string;
  author: string;
  time: string;
}

export interface ProjectRuntimeData {
  status: { build: Status; test: Status; deploy: Status; server: Status };
  agents: AgentState[];
  runs: RunEvent[];
  tests: TestResult[];
  logs: Array<{ section: "build" | "test" | "deploy" | "server"; severity: "info" | "warn" | "error"; message: string; time: string }>;
  code: string;
  fileMeta: { path: string; size: string; updatedAt: string; branch: string; recentlyChanged: string[] };
  recentCommits?: CommitItem[];
}

export interface ProjectHealthView {
  score: number;
  summary: string;
  topRisks: string[];
  topImprovements: string[];
}

export interface PlanStep {
  label: string;
  status: StepStatus;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "architect";
  text: string;
  plan?: PlanStep[];
  links?: Array<{ label: string; targetTab: "Code" | "Tests" | "Logs" }>;
  actions?: string[];
  timestamp: string;
}

export interface FailedRunItem {
  id: string;
  type: "build" | "test" | "deploy" | "server";
  time: string;
  error: string;
  environment: string;
}
