"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, EmptyState, ErrorState, Input, MiniChart, Modal, SectionTitle, Select, Skeleton, StatCard, StatusChip, Tabs } from "./ui";
import type { FailedRunItem, ProjectHealthView, ProjectRuntimeData } from "../lib/types";

const tabs = ["Code", "Tests", "Logs"] as const;
export type MainTab = (typeof tabs)[number];

export function MainPanel({
  runtime,
  health,
  failedRuns,
  requestedTab,
  onRerun,
  onCancel,
  onShowHealthInChat,
  onAction,
  onCopy,
  loading = false,
  error,
}: {
  runtime: ProjectRuntimeData;
  health: ProjectHealthView;
  failedRuns: FailedRunItem[];
  requestedTab?: MainTab;
  onRerun: () => void;
  onCancel: () => void;
  onShowHealthInChat: () => void;
  onAction: (intent: string) => void;
  onCopy: (text: string) => void;
  loading?: boolean;
  error?: string;
}) {
  const [activeTab, setActiveTab] = useState<MainTab>(requestedTab ?? "Code");
  const [logSection, setLogSection] = useState<"all" | "build" | "test" | "deploy" | "server">("all");
  const [logSeverity, setLogSeverity] = useState<"all" | "error" | "warn" | "info">("all");
  const [logQuery, setLogQuery] = useState("");
  const [selectedTest, setSelectedTest] = useState(runtime.tests[0] ?? null);
  const [openFailedRuns, setOpenFailedRuns] = useState(false);
  const [openHealthModal, setOpenHealthModal] = useState(false);

  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    setSelectedTest(runtime.tests[0] ?? null);
  }, [runtime]);

  const filteredLogs = useMemo(
    () =>
      runtime.logs.filter((line) => {
        const sectionOk = logSection === "all" ? true : line.section === logSection;
        const severityOk = logSeverity === "all" ? true : line.severity === logSeverity;
        const queryOk = logQuery.trim() ? `${line.section} ${line.message}`.toLowerCase().includes(logQuery.toLowerCase()) : true;
        return sectionOk && severityOk && queryOk;
      }),
    [runtime.logs, logSection, logSeverity, logQuery],
  );

  if (loading) {
    return (
      <main className="main-wrap">
        <Card title="Loading"><Skeleton height={180} /></Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-wrap">
        <ErrorState title="Kunde inte läsa paneldata" description={error} />
      </main>
    );
  }

  return (
    <main className="main-wrap">
      <section className="hero-top">
        <SectionTitle title="Building Hub · Operations Center" subtitle="Mock runtime · redo för live API-anslutning" />

        <Card title="Primary actions" variant="subtle">
          <div className="chip-row">
            <Button variant="primary" label="▶ Starta pipeline" onClick={() => onAction("start_pipeline")} />
            <Button variant="primary" label="🚀 Deploy till staging" onClick={() => onAction("deploy_staging")} />
            <Button variant="danger" label="🛡 Deploy till prod" onClick={() => onAction("deploy_prod_confirm")} />
            <Button label="🧪 Kör felsökning" onClick={() => onAction("run_diagnostics")} />
          </div>
        </Card>

        <div className="stats-row five">
          <StatCard label="Runs 24h" value="12" helperText="+8% vs igår" />
          <StatCard label="Fail rate" value="3/12" helperText="Klicka för drill-down" onClick={() => setOpenFailedRuns(true)} alert />
          <StatCard label="Project Health" value={`${health.score}/100`} helperText="Klicka för detaljer" onClick={() => setOpenHealthModal(true)} alert={health.score < 70} />
          <StatCard label="Open risks" value={String(health.topRisks.length)} helperText="Top issues" />
          <StatCard label="Successful deploys" value="9" helperText="Senaste dygnet" />
        </div>
      </section>

      <section className="analytics-grid">
        <Card title="Runs per day (7D)"><MiniChart values={[35, 50, 48, 68, 55, 80, 66]} /></Card>
        <Card title="Error rate by hour"><MiniChart values={[12, 22, 30, 18, 26, 10, 8, 14]} /></Card>
      </section>

      <Card title="Latest pipeline runs" action={<div className="chip-row"><Button label="Avbryt" onClick={onCancel} /><Button variant="primary" label="Kör om pipeline" onClick={onRerun} /></div>}>
        <DataTable
          headers={["Type", "Status", "Starttid", "Duration", "Errors", "Environment"]}
          rows={runtime.runs.map((r, idx) => [r.type, <StatusChip key={`${r.id}-status`} label={r.status.toUpperCase()} status={r.status} />, r.time, `${idx * 2 + 3}m`, r.status === "error" ? "2" : r.status === "warn" ? "1" : "0", "staging"])}
        />
      </Card>

      <Card title="Recovery & Risk" variant="subtle" action={<Badge label={`Score ${health.score}`} severity={health.score > 80 ? "success" : health.score > 65 ? "warning" : "error"} />}>
        <div className="risk-progress"><span style={{ width: `${health.score}%` }} /></div>
        <p className="muted">{health.summary}</p>
        <div className="chip-row"><Button variant="primary" label="Åtgärda topp-risker" onClick={() => onAction("fix_top_risks")} /><Button label="Visa i chatten" onClick={onShowHealthInChat} /></div>
      </Card>

      <Card title="Code / Tests / Logs">
        <Tabs items={[...tabs]} active={activeTab} onChange={(t) => setActiveTab(t as MainTab)} />

        {activeTab === "Code" && (
          <div className="code-grid">
            <div className="file-tree">
              <p className="section-title">Recent files</p>
              <p className="muted">{`Project / ${runtime.fileMeta.path}`}</p>
              <ul>{runtime.fileMeta.recentlyChanged.length ? runtime.fileMeta.recentlyChanged.map((f) => <li key={f}>✨ {f}</li>) : <li className="muted">Inga nyliga filer.</li>}</ul>
              <p className="section-title">Recent commits</p>
              <ul>
                {(runtime.recentCommits ?? []).length ? (runtime.recentCommits ?? []).map((c) => <li key={c.id}>{c.time} · {c.author} · {c.message}</li>) : <li className="muted">Inga commits tillgängliga.</li>}
              </ul>
            </div>
            <div>
              <div className="code-meta"><Badge label={`Size: ${runtime.fileMeta.size}`} /><Badge label={`Updated: ${runtime.fileMeta.updatedAt}`} /><Badge label={`Branch: ${runtime.fileMeta.branch}`} /><Button label="Kopiera kod" onClick={() => onCopy(runtime.code)} /></div>
              <pre className="code-pre">{runtime.code}</pre>
            </div>
          </div>
        )}

        {activeTab === "Tests" && (
          <div>
            <div className="stats-row">
              <StatCard label="Total tests" value={String(runtime.tests.length)} helperText="Aktivt projekt" />
              <StatCard label="Warnings" value={String(runtime.tests.filter((t) => t.status === "warn").length)} helperText="Behöver uppföljning" alert={runtime.tests.some((t) => t.status === "warn")} />
              <StatCard label="Avg duration" value={`${Math.round(runtime.tests.reduce((acc, t) => acc + t.durationMs, 0) / Math.max(1, runtime.tests.length))}ms`} helperText="Snitt" />
            </div>
            <div className="tests-grid">
              <div className="test-list">
                {runtime.tests.length === 0 ? <EmptyState title="Inga tester" description="Inga testresultat ännu." /> : runtime.tests.map((t) => (
                  <button key={t.id} className={`test-row ${t.status}`} onClick={() => setSelectedTest(t)}>
                    <div><p>{t.file}</p><p className="muted">{t.durationMs}ms</p></div>
                    <StatusChip label={t.status.toUpperCase()} status={t.status} />
                    <MiniChart values={t.history} />
                  </button>
                ))}
              </div>
              <pre className="code-pre">{selectedTest?.log ?? "Välj test"}</pre>
            </div>
          </div>
        )}

        {activeTab === "Logs" && (
          <div>
            <div className="chip-row">
              <Input ariaLabel="Sök loggar" value={logQuery} onChange={setLogQuery} placeholder="Sök i loggar" />
              <Select ariaLabel="Filtrera sektion" value={logSection} onChange={(v) => setLogSection(v as typeof logSection)} options={["all", "build", "test", "deploy", "server"]} />
              <Select ariaLabel="Filtrera nivå" value={logSeverity} onChange={(v) => setLogSeverity(v as typeof logSeverity)} options={["all", "error", "warn", "info"]} />
              <Button label="Kopiera vy" onClick={() => onCopy(filteredLogs.map((l) => `${l.time} ${l.section} ${l.severity} ${l.message}`).join("\n"))} />
            </div>
            <div className="logs-grid">
              {filteredLogs.length === 0 ? <EmptyState title="Inga loggar matchar" description="Justera filter eller sökning." /> : filteredLogs.map((log, i) => (
                <article key={i} className={`log-card ${log.severity}`}>
                  <p className="section-title">{log.section.toUpperCase()} • {log.time}</p>
                  <p>{log.message}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Modal title="Fail rate drill-down" open={openFailedRuns} onClose={() => setOpenFailedRuns(false)}>
        <DataTable
          headers={["Typ", "Tid", "Fel", "Miljö", "Actions"]}
          rows={failedRuns.map((run) => [run.type, run.time, run.error, run.environment, <div key={run.id} className="chip-row"><Button label="Öppna i logg" onClick={() => setActiveTab("Logs")} /><Button label="Föreslå fix" onClick={() => onAction(`suggest_fix:${run.id}`)} /></div>])}
        />
      </Modal>

      <Modal title="Project Health drill-down" open={openHealthModal} onClose={() => setOpenHealthModal(false)}>
        <div className="health-grid">
          <div><p className="section-title">Top-risker</p><ul>{health.topRisks.map((risk) => <li key={risk}>⚠ {risk}</li>)}</ul></div>
          <div><p className="section-title">Top-förbättringar</p><ul>{health.topImprovements.map((item) => <li key={item}>✅ {item}</li>)}</ul></div>
        </div>
      </Modal>
    </main>
  );
}
