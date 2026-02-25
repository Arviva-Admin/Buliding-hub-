"use client";

import { useMemo, useState } from "react";
import { ChatPanel } from "../components/chatPanel";
import { LeftPanel } from "../components/leftPanel";
import { MainPanel, type MainTab } from "../components/mainPanel";
import { chatThreads, failedRuns, hubHealth, hubMetrics, nextActionsByProject, projectData, projectHealthReports, projects } from "../lib/mockData";
import { Badge, Button, Modal, Tabs } from "../components/ui";
import type { ChatMessage, PlanStep } from "../lib/types";

function isVagueInput(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized.length < 24 || ["fixa buggen", "gör det här snabbare", "lägg till en ny modul", "hjälp"].some((p) => normalized.includes(p));
}
function isHealthOverviewRequest(text: string): boolean {
  const normalized = text.toLowerCase();
  return ["hur mår projektet", "lägesrapport", "statusrapport", "health report"].some((k) => normalized.includes(k));
}
function plan(...steps: Array<[string, PlanStep["status"]]>): PlanStep[] {
  return steps.map(([label, status]) => ({ label, status }));
}

function buildHealthMessage(projectId: string): ChatMessage {
  const report = projectHealthReports[projectId];
  return {
    id: `a-${Date.now() + 1}`,
    sender: "architect",
    text: `Kort sammanfattning: ${report.summary}`,
    plan: plan([`Top-risk 1: ${report.topRisks[0]}`, "ongoing"], [`Top-risk 2: ${report.topRisks[1]}`, "planned"], [`Top-risk 3: ${report.topRisks[2]}`, "planned"]),
    links: [{ label: "Öppna Pipelines/Logs", targetTab: "Logs" }],
    actions: ["🐛 Bugfix", "⚡ Prestanda", "➕ Ny modul", "🔍 Gå djupare", "🎯 Hålla det enkelt"],
    timestamp: new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }),
  };
}

function buildArchitectResponse(projectId: string, projectName: string, text: string): ChatMessage {
  if (isHealthOverviewRequest(text)) return buildHealthMessage(projectId);
  const base: ChatMessage = {
    id: `a-${Date.now() + 1}`,
    sender: "architect",
    text: `Kort sammanfattning: jag arbetar nu i projektkontext ${projectName} med globala HUB-nycklar.`,
    plan: plan(["Läs ProjectConfig", "done"], ["Kör executeWithRecovery", "ongoing"], ["Använd GitHub/Server/Deploy-klienter", "planned"], ["Rapportera resultat", "planned"]),
    links: [{ label: "Öppna Code", targetTab: "Code" }, { label: "Öppna Logs", targetTab: "Logs" }],
    actions: ["🐛 Bugfix", "⚡ Prestanda", "➕ Ny modul", "🔍 Gå djupare", "🎯 Hålla det enkelt"],
    timestamp: new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }),
  };
  if (!isVagueInput(text)) return base;
  return {
    ...base,
    text: `${base.text} Instruktionen är lite oklar – välj ett alternativ nedan.`,
    plan: plan(["Fråga 1: Prioritet?", "ongoing"], ["Fråga 2: Hur bråttom?", "planned"], ["Fråga 3: Risknivå?", "planned"]),
  };
}

export default function Page() {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0].id);
  const [threadMap, setThreadMap] = useState(chatThreads);
  const [requestedTab, setRequestedTab] = useState<MainTab>("Code");
  const [topTab, setTopTab] = useState("Overview");
  const [confirmProd, setConfirmProd] = useState(false);

  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId) ?? projects[0], [selectedProjectId]);
  const runtime = projectData[selectedProject.id];
  const health = projectHealthReports[selectedProject.id];
  const messages = threadMap[selectedProject.id] ?? [];
  const nextActions = nextActionsByProject[selectedProject.id] ?? [];

  const sendMessage = (text: string) => {
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, sender: "user", text, timestamp: new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) };
    const architectMessage = buildArchitectResponse(selectedProject.id, selectedProject.name, text);
    setThreadMap((prev) => ({ ...prev, [selectedProject.id]: [...(prev[selectedProject.id] ?? []), userMessage, architectMessage] }));
  };

  const handleActionIntent = (intent: string) => {
    if (intent === "deploy_prod_confirm") {
      setConfirmProd(true);
      return;
    }
    sendMessage(`intent:${intent}`);
  };

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-left"><h1>Building Hub · {selectedProject.name}</h1><p>Premium operator console</p></div>
        <div className="topbar-center"><Tabs items={["Overview", "Pipelines", "Architect"]} active={topTab} onChange={setTopTab} /></div>
        <div className="topbar-right"><Badge label="⚙ Settings" /><Badge label="👤 Operator" /></div>
      </header>
      <div className="app-shell">
        <div className="left-col"><LeftPanel hubHealth={hubHealth} hubMetrics={hubMetrics} projects={projects} selectedProject={selectedProject} onSelectProject={setSelectedProjectId} runtime={runtime} /></div>
        <div className="center-col"><MainPanel runtime={runtime} health={health} failedRuns={failedRuns[selectedProject.id] ?? []} requestedTab={requestedTab} onRerun={() => handleActionIntent("rerun_pipeline")} onCancel={() => handleActionIntent("cancel_run")} onShowHealthInChat={() => sendMessage("hur mår projektet?")} onAction={handleActionIntent} /></div>
        <div className="right-col"><ChatPanel project={selectedProject} health={health} messages={messages} nextActions={nextActions} onSend={sendMessage} onJump={(target) => setRequestedTab(target)} /></div>
      </div>

      <Modal title="Bekräfta deploy till prod" open={confirmProd} onClose={() => setConfirmProd(false)}>
        <p className="muted">Detta är en hög-risk operation. Vill du fortsätta deploy till produktion?</p>
        <div className="chip-row">
          <Button label="Avbryt" onClick={() => setConfirmProd(false)} />
          <Button variant="danger" label="Ja, deploya till prod" onClick={() => { setConfirmProd(false); sendMessage("intent:deploy_prod_confirmed"); }} />
        </div>
      </Modal>
    </div>
  );
}
