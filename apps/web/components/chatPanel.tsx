"use client";

import { Avatar, Badge, Button, Card, ActionChip } from "./ui";
import type { ChatMessage, ProjectConfigItem, ProjectHealthView, StepStatus } from "../lib/types";
import { useState } from "react";

const stepIcon: Record<StepStatus, string> = { planned: "○", ongoing: "◔", done: "✓", failed: "✕" };

export function ChatPanel({
  project,
  health,
  messages,
  nextActions,
  onSend,
  onJump,
}: {
  project: ProjectConfigItem;
  health: ProjectHealthView;
  messages: ChatMessage[];
  nextActions: string[];
  onSend: (text: string) => void;
  onJump: (target: "Code" | "Tests" | "Logs") => void;
}) {
  const [input, setInput] = useState("");

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

      <Card title="Arkitekten">
        <div className="chat-feed">
          {messages.map((m) => (
            <div key={m.id} className={`chat-message ${m.sender}`}>
              <div className="chat-header"><Avatar label={m.sender === "architect" ? "A" : "U"} tone={m.sender === "architect" ? "architect" : "user"} /><p>{m.sender === "architect" ? "Arkitekten" : "Du"}</p><span className="muted">{m.timestamp}</span></div>
              <p>{m.text}</p>
              {m.plan && (
                <ol className="plan-list">
                  {m.plan.map((s, i) => (
                    <li key={`${s.label}-${i}`}><span>{stepIcon[s.status]}</span><span>{s.label}</span><Badge label={s.status} /></li>
                  ))}
                </ol>
              )}
              {m.links && <div className="chip-row">{m.links.map((link) => <Button key={link.label} label={link.label} onClick={() => onJump(link.targetTab)} />)}</div>}
              {m.actions && (
                <div className="chip-row">
                  {m.actions.map((a) => {
                    const icon = a.includes("Bug") || a.includes("🐛") ? "🐛" : a.includes("Prestanda") || a.includes("⚡") ? "⚡" : a.includes("Ny modul") || a.includes("➕") ? "➕" : a.includes("djupare") ? "🔍" : "🎯";
                    return <ActionChip key={a} icon={icon} label={a.replace(/[🐛⚡➕🔍🎯]\s*/g, "")} onClick={() => onSend(a)} />;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); if (!input.trim()) return; onSend(input); setInput(""); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Skriv till Arkitekten..." />
          <Button variant="primary" label="Send ↵" />
        </form>
      </Card>
    </aside>
  );
}
