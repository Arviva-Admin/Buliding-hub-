# ARVIVA OS – ARKITEKTEN

Referens: Uppbyggnad, komponenter, dataflöden, verktyg och regelverk (L2)

## 1) Vad Arkitekten är

Arkitekten är inte en chatt och inte ”en modell”. Arkitekten är ett operativt systemlager som kan:

- föra fri konversation i realtid,
- alltid veta “var vi är” i projektet,
- fatta beslut baserat på helheten (tech + strategi + risk + roadmap),
- genomföra förändringar via verktyg (L2: safe‑write),
- skapa nya funktioner, agenter och webbsidor,
- göra avancerad debugging baserat på evidens, inte gissning.

Kärnprincip: LLM är en reasoning/rendering‑motor, men verklig “förmåga” kommer från **state + verktyg + regler + verifiering**.

## 2) Arkitektens huvudlager (4 lager)

### Lager A — Conversational Interface (UI)

**Syfte:** ge “kollega i realtid”‑känsla.

**Krav**

- Token‑streaming till UI (SSE/WebSocket).
- UI uppdaterar text utan att lagga (batch:a render 20–33 ms, inte per token).
- Voice‑läge (valfritt): STT/TTS körs på klienten, headless browser används för automation (inte för mic).

**Utdata**

- Konversation (text) är ett gränssnitt, **inte minnet**.

### Lager B — Project World Model (State)

**Syfte:** Arkitekten ska alltid veta exakt var ni är.

Det här är ett kompakt state‑objekt som uppdateras kontinuerligt och används i varje turn.

Exempelstruktur (måste finnas i någon form):

- `phase`: foundation / build / harden / launch
- `stack`: tjänster, versions, ports, health, networks
- `constraints`: (t.ex. “≤30 GB RAM”, “Tailscale‑only ingress”)
- `open_tasks`: top‑prio tasks med status
- `blockers`: vad som stoppar nästa steg
- `recent_changes`: senaste commits, deploys, config‑changes
- `decisions`: beslut + rationale + datum
- `risks`: riskregister med severity/probability
- `capabilities`: vilka verktyg som faktiskt finns just nu
- `revenue_tracks`: affärsspår/idéer + status

Nyckelregel: **Chatlog ≠ minne. State ≠ text. State är sanningen.**

### Lager C — Toolbelt (L2 “hands”)

**Syfte:** Arkitekten ska kunna göra saker, inte bara föreslå.

Toolbelt ska vara maskinanropbar, loggad och gated. Den delas upp:

- **Repo / Kod**
  - `repo.search(q)`
  - `repo.read(path)`
  - `repo.patch(path, diff)`
  - `repo.new_files(files[])`
- **Git (L2)**
  - `git.branch(name)`
  - `git.commit(msg)`
  - `git.push()`
  - (valfritt) `git.pr_create(title, body)`
- **Build/Test**
  - `run(cmd)` (gated till allowlist)
  - `tests.run(scope)`
  - `lint.run()`
- **Ops**
  - `docker.ps()`
  - `docker.logs(service, tail)`
  - `docker.exec(service, cmd)` (allowlist)
  - `docker.restart(service)` (extra bekräftelse)
  - `health.check(url)`
  - `ports.list()`
- **DB (start: read‑only)**
  - `db.schema()`
  - `db.query_readonly(q)`
- **Browser automation (Playwright)**
  - `browser.open(url)`
  - `browser.login(profile)` (via vault)
  - `browser.act(steps[])`
  - `browser.screenshot()`
  - `browser.console_logs()`
  - `browser.har()`

Kärnprincip: **Arkitekten “bygger Arviva OS” genom att komponera verktyg + verifiering + commits.**

### Lager D — Reasoning Runtime (Fast brain + Deep brain)

**Syfte:** snabb konversation + djup problemlösning utan lagg.

- **Fast brain (realtid)**
  - svarar snabbt (mål: 1–2 sek)
  - håller tokenbudget (typ 60–100 tokens default)
  - använder state + senaste delta + minimalt retrieval
- **Deep brain (vid behov / bakgrund)**
  - tar svåra arkitekturval, komplex debugging, större kodförändringar
  - uppdaterar state (decisions/risks/tasks)
  - får aldrig blockera UI‑svar

Viktigt: Deep brain kan triggas av:

- oklarhet/hög risk
- multi‑file refactor
- incident/debug med oklart repro
- säkerhets‑/nätverksändringar

## 3) Standard arbetsloop för “avancerad debugging”

För att Arkitekten ska vara “hyper smart” i praktiken krävs evidensloop:

1. **Repro:** konkret felbeskrivning + hur vi reproducerar
2. **Evidence:** logs, traces, config, versions, health
3. **Hypoteser:** 2–3 kandidater
4. **Experiment:** en förändring i taget, mät
5. **Fix:** minsta ändring + test
6. **Verifiering:** test + health + “vad blev bättre”
7. **Commit/PR:** liten commit med tydlig message

Detta ska vara Arkitektens defaultbeteende när något är oklart.

## 4) Regelverk (L2 safety) – kort och hårt

Eftersom ni är i foundation‑fas och inte vill låsa ute er:

### Tillåtet autonomt (L2)

- skapa branch
- patcha filer
- köra test/build
- skapa commit
- föreslå PR

### Kräver explicit “KÖR” (extra bekräftelse)

- docker restart
- ändringar i ingress/ports/firewall
- secrets/env
- databasmigrering
- prod‑deploy (om ens finns)

### Obligatoriskt före merge

- verifieringssteg (test/build/health)
- logg på vad som kördes
- rollback‑notis om risk

## 5) Inventering + Rensning innan expansion

Innan vi lägger till mer måste vi skapa en ren karta:

### Steg 1 — Inventory (hitta sanningen)

Kör detta i repot/servern och spara output i en `audit/`‑mapp:

```bash
# 1) Struktur
pwd
git status
git rev-parse --abbrev-ref HEAD
git log -n 20 --oneline

# 2) Sök efter Arkitekt-relaterat
rg -n "architect|poll|stream|EventSource|SSE|text/event-stream|ollama|qdrant|memory|debate|sandbox" .

# 3) Lista endpoints (FastAPI)
rg -n "@router\.(get|post|put|delete)\(" backend 2>/dev/null || true
rg -n "StreamingResponse|EventSourceResponse|text/event-stream" backend 2>/dev/null || true

# 4) Docker/compose
ls -la /opt/arviva/env/dev/nexus || true
rg -n "ollama|qdrant|mongo|backend|frontend|playwright" /opt/arviva/env/dev/nexus -S 2>/dev/null || true
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# 5) Health
curl -fsS http://127.0.0.1:8001/health || true
curl -fsS http://127.0.0.1:8001/api/health || true
```

### Steg 2 — Klassificera: “Live”, “Legacy”, “Duplicate”

När ni har träffarna från `rg`, märk varje modul som:

- **LIVE:** används av frontend/backends aktuella flöde
- **LEGACY:** gammalt/övergett (ska bort eller flyttas till `deprecated/`)
- **DUPLICATE:** två versioner av samma sak (välj en och rensa resten)

Regel: det får finnas **en** canonical path per förmåga:

- 1 st chat‑endpoint
- 1 st streaming‑endpoint
- 1 st toolbelt‑API
- 1 st state‑store

### Steg 3 — Rensningsprinciper

- Flytta legacy till `deprecated/` först (ingen deletion dag 1).
- Lägg en `README.md` i `deprecated/` som säger varför och vilket som ersätter.
- Rensa frontend: inga dummy‑svar, inga “simulerade” flows.
- Rensa backend: en SSE/WS pipeline, inte tre halvvarianter.

## 6) Capabilities Registry

“Hur kommer den kunna göra allt?” – den kan bara göra saker som:

- finns som verktyg
- är tillåtet enligt L2‑regler
- kan verifieras

Så vi behöver en **Capabilities Registry** (måste finnas):

Arkitekten ska alltid kunna säga:

- “Jag kan göra X”
- “Jag kan inte göra Y än, saknar verktyg Z”
- “Jag kan göra Y om du kör ‘KÖR’”

Detta är avgörande för att den inte ska fantisera.

## 7) Nästa konkreta steg

För att spara detta dokument i projektet: lägg det i `docs/architect/ARCHITECT_REFERENCE.md` (eller motsvarande), så att det finns tillgängligt för utvecklare och eventuella automatiska agenter.

Och innan ni lägger till något nytt: kör Inventory‑kommandona ovan och klistra in outputen (eller de relevanta `rg`‑träffarna). Då kan Arkitekten direkt säga:

- vad som redan finns,
- vad som är legacy,
- vad som duplicerar,
- och exakt vad som ska rensas först (utan att riskera drift).
