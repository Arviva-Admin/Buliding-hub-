"use client";

import { useState } from "react";
import { ActionChip, Avatar, Badge, Button, Card, EmptyState, ErrorState, Skeleton, Toggle } from "./ui";
import type { ChatMessage, ProjectConfigItem, ProjectHealthView, StepStatus } from "../lib/types";

const stepIcon: Record<StepStatus, string> = { planned: "○", ongoing: "◔", done: "✓", failed: "✕" };

const quickPrompts = ["Status", "Deploy dev", "Investigate failing run", "Generate runbook entry"];

export function ChatPanel({
  project,
  health,
  messages,
  nextActions,
  onSend,
  onJump,
  loading = false,
  error,
}: {
  project: ProjectConfigItem;
  health: ProjectHealthView;
  messages: ChatMessage[];
  nextActions: string[];
  onSend: (text: string) => void;
  onJump: (target: "Code" | "Tests" | "Logs") => void;
  loading?: boolean;
  error?: string;
}) {
  const [input, setInput] = useState("");
  const [expandPlans, setExpandPlans] = useState(true);

  if (loading) {
    return (
      <aside className="chat-wrap">
        <Card title="Architect Assistant"><Skeleton height={300} /></Card>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="chat-wrap">
        <ErrorState title="Chat unavailable" description={error} />
      </aside>
    );
  }

  return (
    <aside className="chat-wrap">
      <Card title="Architect Assistant" variant="subtle" action={<Badge label={`Health ${health.score}`} severity={health.score > 80 ? "success" : health.score > 65 ? "warning" : "error"} />}>
        <div className="chip-row">
          <Badge label={`📁 ${project.name}`} />
          <Badge label={`🌿 ${project.defaultBranch}`} />
          <Badge label={`🌍 ${project.environments[0] ?? "dev"}`} />
          <Badge label={`🚀 ${project.deployTarget}`} />
        </div>
      </Card>

      <Card title="Quick prompts" variant="subtle">
        <div className="chip-row">
          {quickPrompts.map((prompt) => <ActionChip key={prompt} icon="⚡" label={prompt} onClick={() => onSend(prompt)} />)}
        </div>
      </Card>

      <Card title="Next actions" variant="primary">
        <p className="muted">Det här är de 3 viktigaste sakerna du kan göra nu:</p>
        <div className="next-actions-list">
          {nextActions.slice(0, 3).map((action, idx) => (
            <div key={action} className="next-action-item">
              <span>{idx + 1}) {action}</span>
              <Button variant="primary" label="Kör" onClick={() => onSend(`intent:${action}`)} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Arkitekten" action={<Toggle label="Expand plans" checked={expandPlans} onChange={setExpandPlans} />}>
        <div className="chat-feed">
          {messages.length === 0 ? <EmptyState title="Ingen chatthistorik" description="Starta med en snabb prompt ovan." /> : messages.map((m) => (
            <div key={m.id} className={`chat-message ${m.sender}`}>
              <div className="chat-header"><Avatar label={m.sender === "architect" ? "A" : "U"} tone={m.sender === "architect" ? "architect" : "user"} /><p>{m.sender === "architect" ? "Arkitekten" : "Du"}</p><span className="muted">{m.timestamp}</span></div>
              <p>{m.text}</p>
              {expandPlans && m.plan ? (
                <ol className="plan-list">
                  {m.plan.map((s, i) => <li key={`${s.label}-${i}`}><span>{stepIcon[s.status]}</span><span>{s.label}</span><Badge label={s.status} /></li>)}
                </ol>
              ) : null}
              {m.links ? <div className="chip-row">{m.links.map((link) => <Button key={link.label} label={link.label} onClick={() => onJump(link.targetTab)} />)}</div> : null}
              {m.actions ? <div className="chip-row">{m.actions.map((a) => <ActionChip key={a} icon="✨" label={a.replace(/[🐛⚡➕🔍🎯]\s*/g, "")} onClick={() => onSend(a)} />)}</div> : null}
            </div>
          ))}
        </div>

        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); if (!input.trim()) return; onSend(input); setInput(""); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Skriv till Arkitekten..." aria-label="Skriv meddelande" />
          <Button variant="primary" type="submit" label="Send ↵" />
        </form>
      </Card>
    </aside>
  );
}
