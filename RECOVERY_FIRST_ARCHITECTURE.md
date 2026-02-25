# Kärnarkitektur: Recovery-First Design

Den viktigaste insikten är att **återhämtningsförmåga är viktigare än att helt undvika fel**. En robust agentplattform designas därför för kontrollerad återhämtning, säker fallback och tydlig eskalering.

## 1) Multi-LLM Orchestration Layer

```ts
const providerConfig = {
  primary: {
    reasoning: "deepseek-v3",      // Arkitektur & planering
    coding: "groq/deepseek-coder", // Snabb kodgenerering
    validation: "mistral-large",   // Kodgranskning & säkerhet
    refinement: "gemini-2.0-flash" // Snabb iteration & fixes
  },
  fallback: {
    tier1: "groq/llama-3-70b",     // Om primary failar
    tier2: "gemini-1.5-pro"        // Emergency backup
  }
};
```

## 2) Fem kritiska patterns

### 2.1 Circuit breakers med state

```ts
class ModelCircuitBreaker {
  private failures = new Map<string, number>();
  private lastAttempt = new Map<string, number>();

  async call(provider: string, task: Task) {
    if ((this.failures.get(provider) || 0) >= 3) {
      if (Date.now() - (this.lastAttempt.get(provider) || 0) < 60_000) {
        return this.fallbackProvider(task);
      }
      this.failures.set(provider, 0);
    }

    try {
      const result = await this.execute(provider, task);
      this.failures.set(provider, 0);
      return result;
    } catch (error) {
      this.failures.set(provider, (this.failures.get(provider) || 0) + 1);
      this.lastAttempt.set(provider, Date.now());
      throw error;
    }
  }
}
```

### 2.2 Validation gates

```ts
interface ValidationGate {
  preGeneration: {
    validatePrompt: (prompt: string) => ValidationResult;
    checkDependencies: (context: BuildContext) => boolean;
    estimateComplexity: (task: Task) => ComplexityScore;
  };

  postGeneration: {
    syntaxCheck: (code: string) => boolean;
    securityScan: (code: string) => SecurityReport;
    testGeneration: (code: string) => Test[];
  };

  preDeployment: {
    integrationTests: () => TestResults;
    performanceCheck: () => PerfMetrics;
    rollbackPrep: () => RollbackSnapshot;
  };
}
```

### 2.3 Saga pattern (idempotenta workflows)

```ts
type StepType = "read-only" | "reversible" | "compensatable" | "final";

interface BuildStep {
  id: string;
  type: StepType;
  execute: () => Promise<Result>;
  compensate?: () => Promise<void>;
  maxRetries: number;
}
```

### 2.4 Separera generering och validering

```ts
async function generateAndValidate(task: CodeTask) {
  const code = await groq.generate({
    model: "deepseek-coder",
    prompt: task.description
  });

  const validation = await mistral.validate({
    model: "mistral-large",
    code,
    requirements: task.requirements
  });

  if (!validation.passed) {
    return mistral.fix({
      code,
      issues: validation.issues
    });
  }

  return code;
}
```

### 2.5 Eskaleringsmatris

| Risk | Confidence | Action |
|---|---|---|
| Låg | Hög | Autonoma retries (max 3) |
| Medium | Osäker | Draft-läge + reviewflagga |
| Hög | Alla | Omedelbart stopp + human escalation |

```ts
function shouldEscalate(context: BuildContext): EscalationLevel {
  const riskScore = calculateRisk(context);
  const confidence = context.modelConfidence;

  if (riskScore > 0.7) return "STOP_IMMEDIATE";
  if (confidence < 0.6) return "DRAFT_MODE";
  if (context.retryCount >= 3) return "HUMAN_REVIEW";

  return "AUTONOMOUS";
}
```

## 3) Implementering för Building Hub

### Phase 1: Intelligent task router

```ts
class BuildingHub {
  private router: TaskRouter;
  private stateManager: WorkflowStateManager;
  private errorRecovery: RecoveryEngine;

  async buildFeature(spec: FeatureSpec) {
    const tasks = await this.router.decompose({
      provider: "deepseek-v3",
      spec,
      outputFormat: "structured-tasks"
    });

    const results = await Promise.allSettled(
      tasks.map(task => this.executeWithRecovery(task))
    );

    return this.validateAndDeploy(results);
  }
}
```

### Phase 2: Error classification & recovery

```ts
enum ErrorCategory {
  CLI_INVOCATION = "cli",
  SYNTAX_ERROR = "syntax",
  TYPE_ERROR = "type",
  NETWORK_ERROR = "network",
  PROCESS_CRASH = "crash",
  DEPENDENCY_MISSING = "dependency"
}
```

### Phase 3: Deployment pipeline med auto-rollback

- Snapshot före deploy
- Deploy till staging
- Automatiska integrationstester
- Risk scoring och manuell approval vid hög risk
- Produktion + 5 min KPI-monitorering
- Rollback vid tröskelbrott

### Phase 4: Loop detection & prevention

- Samma error tre gånger i rad
- Ingen progress över flera iterationer
- Oscillation (A→B→A→B)
- Bryt loop via strategi-byte, provider-byte, ytterligare dekomposition eller human escalation

## 4) Best practices för multi-provider

### Unified API gateway

- En gemensam request/response-modell
- Provider-specifik adaptation under huven
- Retry med backoff
- Standardiserad output för resten av systemet

### Cost/performance optimizer

- Matcha modell till task-komplexitet
- Sätt latens- och kostbudget som hårda constraints
- Prioritera snabb/billig modell för enkla tasks, stark reasoning-modell för komplexa tasks

## 5) Rekommenderad stack

### Backend

- Node.js eller Bun + TypeScript
- Redis för state/circuit breaker
- PostgreSQL för loggar/metrics
- BullMQ för idempotenta retries

### Frontend

- React/Next.js för webb
- React Native för app
- Supabase Realtime för live-status

### Deployment

- GitHub Actions (CI/CD)
- Vercel (frontend)
- Railway/Fly.io (backend)

---

## Kort handlingsplan (nästa steg)

1. Implementera gateway + circuit breaker + fallback i ett isolerat modul-lager.
2. Inför validation gates mellan varje pipeline-fas.
3. Bygg recovery engine med explicit error-klassificering.
4. Lägg till eskaleringsmatris och human-in-the-loop för high risk.
5. Aktivera deploy-snapshots + auto-rollback + KPI-vakter.
6. Logga allt i strukturerad form för förbättrad success-rate över tid.

## 6) Integrationslager (tillägg)

För att hålla core-logik ren delas externa system ut i ett integrationslager:

- `src/integration/githubClient.ts`
  - All GitHub API-kommunikation (repo, branch, push, PR, workflowfil).
  - Recovery via circuit breaker och eskaleringsregler.
- `src/integration/serverClient.ts`
  - Serveroperationer (SSH, loggar, deploy/restart).
  - Deploysekvenser körs som saga med kompensation/rollback.
- `src/integration/deployClient.ts`
  - Generellt deploy-interface med target (`vercel`/`hetzner`).
  - Trigger + statuspolling + rollback-stöd via adapter.

Detta följer Recovery-First-principen att externa anrop alltid ska vara kapslade, observerbara och återhämtningsbara.

## 7) Operator Console UI (tillägg)

För att göra Recovery-First operativt i vardagen behövs ett panelbaserat UI:

- Vänsterpanel: projekt, statuschips (build/test/deploy/health), agentstatus.
- Mittenpanel: code/tests/logs med filter och quick-jumps.
- Högerpanel (pinned): stateful Arkitekt-chat per projekt (single source of truth).

Designkrav:
- Desktop-first 3-kolumnslayout (16:9).
- Responsiv fallback: kollapsad vänsterpanel + högerpanel som overlay på smalare skärm.
- Kontrollfunktioner synliga i UI: avbryt körning, kör om pipeline, och manuell confirm för high-risk deploy.

## 8) Global Hub Runtime Model (tillägg)

Building Hub körs som en global motor:

- En central `GlobalSecrets`-uppsättning (GitHub/Hetzner/Vercel) delas mellan projekt.
- Projekt isoleras genom `ProjectConfig` (repo, branch, deployTarget, serverId, environments).
- All åtkomst begränsas av en allowlist i `runtimeConfig.projects`.
- UI arbetar i aktiv projektkontext men visar att integrationer är globalt anslutna.
