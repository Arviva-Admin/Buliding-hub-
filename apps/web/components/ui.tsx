"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
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

export function Card({ title, children, action, className = "", variant = "primary" }: { title: string; children: ReactNode; action?: ReactNode; className?: string; variant?: "primary" | "subtle" | "danger" }) {
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

export function Button({ label, variant = "ghost", onClick, type = "button" }: { label: string; variant?: "ghost" | "primary" | "danger"; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} className={`btn btn-${variant}`}>
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
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button key={item} role="tab" aria-selected={active === item} onClick={() => onChange(item)} className={`tab ${active === item ? "active" : ""}`}>
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

export function StatCard({ label, value, helperText, onClick, alert = false }: { label: string; value: string; helperText?: string; onClick?: () => void; alert?: boolean }) {
  return (
    <article className={`stat-card ${alert ? "alert" : ""}`} onClick={onClick} role={onClick ? "button" : undefined}>
      <p className="muted">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="muted">{helperText ?? ""}</p>
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

export function Input({ value, onChange, placeholder, ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel: string }) {
  return <input aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="ui-input" />;
}

export function Select({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: string[]; ariaLabel: string }) {
  return (
    <select aria-label={ariaLabel} className="ui-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <label className="toggle-wrap">
      <span>{label}</span>
      <button aria-label={label} aria-pressed={checked} onClick={() => onChange(!checked)} className={`toggle ${checked ? "on" : "off"}`}>
        <span />
      </button>
    </label>
  );
}

export function Skeleton({ width = "100%", height = 14 }: { width?: string; height?: number }) {
  return <div className="skeleton" style={{ width, height }} aria-hidden />;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <p className="section-title">{title}</p>
      <p className="muted">{description}</p>
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="error-state">
      <p className="section-title">{title}</p>
      <p>{description}</p>
    </div>
  );
}

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
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
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="muted">Ingen data.</td>
          </tr>
        ) : (
          rows.map((r, idx) => <tr key={idx}>{r.map((c, cIdx) => <td key={cIdx}>{c}</td>)}</tr>)
        )}
      </tbody>
    </table>
  );
}

export interface ToastItem {
  id: string;
  tone?: "info" | "success" | "warning" | "error";
  message: string;
}

export function ToastViewport({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone ?? "info"}`}>
          <span>{toast.message}</span>
          <button aria-label="Stäng notis" onClick={() => onClose(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  action: () => void;
}

export function CommandPalette({ open, onClose, query, onQuery, items }: { open: boolean; onClose: () => void; query: string; onQuery: (v: string) => void; items: CommandItem[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card command-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
        <input ref={inputRef} aria-label="Sök kommando" className="ui-input" placeholder="Sök kommando..." value={query} onChange={(e) => onQuery(e.target.value)} />
        <div className="command-list">
          {filtered.map((item) => (
            <button key={item.id} className="command-item" onClick={() => { item.action(); onClose(); }}>
              <span>{item.label}</span>
              <span className="muted">{item.hint}</span>
            </button>
          ))}
          {filtered.length === 0 ? <p className="muted">Inga kommandon matchar.</p> : null}
        </div>
      </div>
    </div>
  );
}
