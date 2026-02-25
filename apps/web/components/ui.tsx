"use client";

import type { ReactNode } from "react";
import type { Status } from "../lib/types";

const statusClasses: Record<Status, string> = {
  ok: "chip chip-ok",
  warn: "chip chip-warn",
  error: "chip chip-error",
  running: "chip chip-running",
};

export function StatusChip({ label, status }: { label: string; status: Status }) {
  return <span className={statusClasses[status]}>{label}</span>;
}

export function Card({
  title,
  children,
  action,
  className = "",
  variant = "primary",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: "primary" | "subtle" | "danger";
}) {
  return (
    <section className={`ui-card ${variant} ${className}`}>
      <header className="ui-card-header">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Button({
  label,
  variant = "ghost",
  onClick,
}: {
  label: string;
  variant?: "ghost" | "primary" | "danger";
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={variant === "primary" ? "btn btn-primary" : variant === "danger" ? "btn btn-danger" : "btn btn-ghost"}>
      {label}
    </button>
  );
}

export function Badge({ label, severity = "info" }: { label: string; severity?: "success" | "warning" | "error" | "info" }) {
  return <span className={`badge ${severity}`}>{label}</span>;
}

export function Avatar({ label, tone = "architect" }: { label: string; tone?: "architect" | "user" }) {
  return <span className={`avatar ${tone}`}>{label}</span>;
}

export function Tabs({ items, active, onChange }: { items: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="tabs">
      {items.map((item) => (
        <button key={item} onClick={() => onChange(item)} className={`tab ${active === item ? "active" : ""}`}>
          {item}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="section-title-wrap">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function StatCard({ label, value, helperText, trend, onClick, alert = false }: { label: string; value: string; helperText?: string; trend?: string; onClick?: () => void; alert?: boolean }) {
  return (
    <article className={`stat-card ${alert ? "alert" : ""}`} onClick={onClick} role={onClick ? "button" : undefined}>
      <p className="muted">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="muted">{helperText ?? trend ?? ""}</p>
    </article>
  );
}

export function ActionChip({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button className="action-chip" onClick={onClick}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function MiniChart({ values }: { values: number[] }) {
  return (
    <div className="mini-chart" aria-hidden>
      {values.map((v, i) => (
        <span key={`${v}-${i}`} style={{ height: `${Math.max(8, Math.min(100, v))}%` }} />
      ))}
    </div>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="ui-card-header">
          <h3>{title}</h3>
          <Button label="Stäng" onClick={onClose} />
        </header>
        {children}
      </div>
    </div>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <table className="runs-table">
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={idx}>{r.map((c, cIdx) => <td key={cIdx}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
