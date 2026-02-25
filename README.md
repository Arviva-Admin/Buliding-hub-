# Building Hub

Recovery-First implementation för en **global** Building Hub-motor som styr flera projekt via samma centrala nycklar.

## Kärnmodell: global secrets + projektkontext

- **GlobalSecrets** (en gång i HUB runtime): `githubToken`, `hetznerToken`, `vercelToken`.
- **ProjectConfig** (en per projekt): `id`, `name`, `repoFullName`, `defaultBranch`, `deployTarget`, `serverId?`, `environments`.
- Klienter (`GitHubClient`, `ServerClient`, `DeployClient`) läser alltid secrets via `RuntimeConfigProvider`.
- UI visar projektkontext och resurser per projekt, men exponerar aldrig hemligheter.

## End-to-end flöde (idé → live)

1. Välj projektkontext (`ProjectConfig`).
2. `createAndInitializeProject(spec, projectConfig)`
3. `createGitHubRepositoryAndPush(spec, projectConfig)`
4. `openPullRequest(spec, projectConfig)`
5. `triggerDeployment(spec, projectConfig)`
6. `diagnoseAndRecoverDeployment(spec, projectConfig)`

## Arkitekturöversikt

- `src/core`: ren domänlogik (circuit breaker, validation, saga, loop-skydd, escalation).
- `src/orchestration`: komposition av core + integrationer.
- `src/integration`: externa klienter för GitHub, server och deploy.
- `src/config`: runtime-konfig (centrala nycklar + tillåten projektlista).
- `apps/web`: panelbaserat SPA-gränssnitt (global HUB + projektbunden vy/chatt).

## Scripts (root)

- `npm run build` – TypeScript compile (core/orchestration/integration)
- `npm run test` – kör Vitest en gång
- `npm run test:watch` – watch mode
- `npm run check` – build + test

## Web UI (apps/web)

```bash
cd apps/web
npm install
npm run dev
```

Öppna `http://localhost:3000` för 3-panel-UI:
- vänster: **Building Hub + projektval + projektresurser**,
- mitten: Code/Tests/Logs för aktivt projekt,
- höger: pinned Arkitekt-chat, stateful per projekt.

## Miljövariabler / hemligheter

Dessa behövs i verklig runtime (injiceras via `RuntimeConfigProvider`):

- `GITHUB_TOKEN`
- `HETZNER_TOKEN`
- `VERCEL_TOKEN`

> Viktigt: nycklar används via central runtime-config, inte i UI eller domänlogik.

## Notering om riktig deploy

Deploy-flödet använder `DeployClient`-adapters. För första produktionsaktivering behövs normalt manuell engångskoppling mellan GitHub-repo och deploy-target (t.ex. Vercel project import).
