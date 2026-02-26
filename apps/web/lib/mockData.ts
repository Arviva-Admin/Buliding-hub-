import type { ChatMessage, HubDashboardMetrics, HubHealth, ProjectConfigItem, ProjectRuntimeData, ProjectHealthView } from "./types";

export const hubHealth: HubHealth = {
  status: "OK",
  integrations: { github: "connected", server: "connected", deploy: "connected" },
};

export const hubMetrics: HubDashboardMetrics = {
  activeProjects: 3,
  runsLast24h: 12,
  errorsLast24h: 3,
  totalRunsLast24h: 12,
};

export const projects: ProjectConfigItem[] = [
  { id: "arviva-os", name: "Arviva OS", repoFullName: "arviva/arviva-os", defaultBranch: "main", deployTarget: "hetzner", serverId: "hetzner-123", environments: ["dev", "staging", "prod"] },
  { id: "landing-page-x", name: "Landing Page X", repoFullName: "studio/landing-page-x", defaultBranch: "main", deployTarget: "vercel", environments: ["preview", "prod"] },
  { id: "demo-app", name: "Demo App", repoFullName: "acme/demo-app", defaultBranch: "main", deployTarget: "none", environments: ["dev"] },
];

export const projectData: Record<string, ProjectRuntimeData> = {
  "arviva-os": {
    status: { build: "running", test: "warn", deploy: "ok", server: "ok" },
    agents: [
      { id: "a1", name: "Arkitekten", role: "Arkitekt", currentStep: "Planerar modul X för staging", status: "running" },
      { id: "a2", name: "Kodare", role: "Kodare", currentStep: "Genererar backend-modul", status: "running" },
      { id: "a3", name: "Reviewer", role: "Reviewer", currentStep: "Verifierar säkerhetsregler", status: "warn" },
    ],
    runs: [
      { id: "r1", time: "12:01", type: "build", status: "running", message: "Type-check av arviva-os" },
      { id: "r2", time: "11:58", type: "test", status: "warn", message: "Integrationstest med retry" },
      { id: "r3", time: "11:52", type: "deploy", status: "ok", message: "Staging deploy lyckades" },
    ],
    tests: [
      { id: "t1", file: "tests/modul-x.test.ts", status: "ok", durationMs: 310, log: "3 passed", history: [80, 90, 70, 90, 100] },
      { id: "t2", file: "tests/recovery.test.ts", status: "warn", durationMs: 910, log: "retry -> pass", history: [60, 60, 55, 65, 70] },
    ],
    logs: [
      { section: "build", severity: "info", message: "Compiling arviva-os", time: "12:01:22" },
      { section: "test", severity: "warn", message: "Retry test recovery path 2/3", time: "12:01:28" },
      { section: "deploy", severity: "info", message: "Staging health-check success", time: "12:01:36" },
      { section: "server", severity: "error", message: "Log fetch timeout recovered", time: "12:01:40" },
    ],
    code: `export async function deployArviva() {\n  return trigger('hetzner');\n}`,
    fileMeta: { path: "src/orchestration/buildingHub.ts", size: "14.2 KB", updatedAt: "2 min sedan", branch: "main", recentlyChanged: ["src/orchestration/buildingHub.ts", "src/core/insights.ts"] },
    recentCommits: [
      { id: "cmt-901", message: "Improve recovery timeout handling", author: "Arkitekten", time: "11:58" },
      { id: "cmt-900", message: "Refactor pipeline status cards", author: "Kodare", time: "11:22" },
    ],
  },
  "landing-page-x": {
    status: { build: "ok", test: "ok", deploy: "running", server: "warn" },
    agents: [{ id: "b1", name: "Arkitekten", role: "Arkitekt", currentStep: "Optimerar preview pipeline", status: "running" }],
    runs: [{ id: "r4", time: "12:03", type: "deploy", status: "running", message: "Vercel preview deploy" }],
    tests: [{ id: "t3", file: "tests/ui-smoke.test.ts", status: "ok", durationMs: 155, log: "1 passed", history: [90, 90, 95, 100, 100] }],
    logs: [{ section: "deploy", severity: "info", message: "Triggered Vercel preview for branch main", time: "12:03:01" }],
    code: `export const hero = 'Landing Page X';`,
    fileMeta: { path: "src/hero.tsx", size: "3.1 KB", updatedAt: "6 min sedan", branch: "main", recentlyChanged: ["src/hero.tsx"] },
    recentCommits: [
      { id: "cmt-450", message: "Tune hero animation timing", author: "Designer", time: "12:01" },
    ],
  },
  "demo-app": {
    status: { build: "ok", test: "ok", deploy: "warn", server: "warn" },
    agents: [{ id: "c1", name: "Arkitekten", role: "Arkitekt", currentStep: "Deploy target is none", status: "warn" }],
    runs: [{ id: "r5", time: "11:40", type: "deploy", status: "warn", message: "Deploy disabled by ProjectConfig" }],
    tests: [{ id: "t4", file: "tests/basic.test.ts", status: "ok", durationMs: 80, log: "ok", history: [100, 100, 100, 100, 100] }],
    logs: [{ section: "deploy", severity: "warn", message: "Skipped (deployTarget=none)", time: "11:40:11" }],
    code: `export const demo = true;`,
    fileMeta: { path: "src/index.ts", size: "1.0 KB", updatedAt: "20 min sedan", branch: "main", recentlyChanged: [] },
    recentCommits: [],
  },
};

export const chatThreads: Record<string, ChatMessage[]> = {
  "arviva-os": [
    {
      id: "c1",
      sender: "architect",
      text: "Kort sammanfattning: modul X planerad för staging med recovery-first pipeline.",
      plan: [
        { label: "Validera ProjectConfig", status: "done" },
        { label: "Generera modul + tester", status: "ongoing" },
        { label: "Push + PR", status: "planned" },
        { label: "Deploy staging", status: "planned" },
      ],
      links: [{ label: "Öppna Pipelines/Logs", targetTab: "Logs" }],
      actions: ["🐛 Bugfix", "⚡ Prestanda", "➕ Ny modul"],
      timestamp: "12:00",
    },
  ],
  "landing-page-x": [],
  "demo-app": [],
};

export const projectHealthReports: Record<string, ProjectHealthView> = {
  "arviva-os": {
    score: 74,
    summary: "Arviva OS är stabilt men har återkommande test-retries i recovery-flödet.",
    topRisks: ["Flaky integrationstest i deploy-sekvens", "Risk vid staging->prod confirm", "Serverlogg-timeouts"],
    topImprovements: ["Stabilare test-fixtures", "Tydlig prod confirm-gate", "Backoff + cache i logghämtning"],
  },
  "landing-page-x": {
    score: 88,
    summary: "Landing Page X mår bra med låg risk i preview-flödet.",
    topRisks: ["Preview drift", "Låg e2e-täckning", "Deploy API rate-limit"],
    topImprovements: ["Öka e2e", "Branch-hygien", "Batcha deploy-anrop"],
  },
  "demo-app": {
    score: 55,
    summary: "Demo App saknar deployTarget och har begränsad drift-signal.",
    topRisks: ["Ingen deploy pipeline", "Låg signal", "Oklar release scope"],
    topImprovements: ["Sätt deployTarget", "Fler kontinuerliga tester", "Definiera release scope"],
  },
};


export const failedRuns: Record<string, import("./types").FailedRunItem[]> = {
  "arviva-os": [
    { id: "f1", type: "deploy", time: "10:30", error: "Health-check timeout", environment: "staging" },
    { id: "f2", type: "test", time: "09:14", error: "Recovery test flaky", environment: "staging" },
    { id: "f3", type: "server", time: "08:51", error: "SSH log fetch timeout", environment: "prod" },
  ],
  "landing-page-x": [
    { id: "f4", type: "deploy", time: "11:05", error: "Vercel rate-limit", environment: "preview" },
  ],
  "demo-app": [
    { id: "f5", type: "deploy", time: "11:40", error: "Deploy target disabled", environment: "dev" },
  ],
};

export const nextActionsByProject: Record<string, string[]> = {
  "arviva-os": [
    "Kör felsökning på senaste deploy-felet",
    "Starta pipeline för modul X",
    "Förbered staging deploy med confirm-gate",
  ],
  "landing-page-x": [
    "Deploya ny preview-build",
    "Kör prestandapass på hero-sidan",
    "Analysera senaste fail-rate spike",
  ],
  "demo-app": [
    "Definiera deployTarget",
    "Kör full testsvit",
    "Skapa release-checklista",
  ],
};
