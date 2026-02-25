"use client";

import { Badge, Button, Card, StatCard, StatusChip } from "./ui";
import type { HubDashboardMetrics, HubHealth, ProjectConfigItem, ProjectRuntimeData } from "../lib/types";

const deployIcon: Record<ProjectConfigItem["deployTarget"], string> = {
  vercel: "▲",
  hetzner: "🖥",
  none: "⏸",
};

export function LeftPanel({
  hubHealth,
  hubMetrics,
  projects,
  selectedProject,
  onSelectProject,
  runtime,
}: {
  hubHealth: HubHealth;
  hubMetrics: HubDashboardMetrics;
  projects: ProjectConfigItem[];
  selectedProject: ProjectConfigItem;
  onSelectProject: (id: string) => void;
  runtime: ProjectRuntimeData;
}) {
  const healthStatus = hubHealth.status === "OK" ? "ok" : hubHealth.status === "Degraded" ? "warn" : "error";

  return (
    <aside className="left-wrap">
      <Card title="Building Hub Dashboard" variant="subtle" action={<StatusChip label={hubHealth.status} status={healthStatus} />}>
        <div className="stats-row">
          <StatCard label="Aktiva projekt" value={String(hubMetrics.activeProjects)} helperText="Global allowlist" />
          <StatCard label="Runs 24h" value={String(hubMetrics.runsLast24h)} helperText="Alla projekt" />
          <StatCard label="Fail rate" value={`${hubMetrics.errorsLast24h}/${hubMetrics.totalRunsLast24h}`} helperText="Senaste 24h" />
        </div>
        <div className="chip-row">
          <Badge severity="success" label={`GitHub ${hubHealth.integrations.github}`} />
          <Badge severity="success" label={`Server ${hubHealth.integrations.server}`} />
          <Badge severity="success" label={`Deploy ${hubHealth.integrations.deploy}`} />
        </div>
      </Card>

      <Card title="Projekt" action={<Button label="Skapa nytt projekt" />}>
        <div className="project-list">
          {projects.map((project) => (
            <button key={project.id} onClick={() => onSelectProject(project.id)} className={`project-card ${project.id === selectedProject.id ? "active" : ""}`}>
              <div className="project-top">
                <p className="project-name">{project.name}</p>
                <span className="deploy-icon">{deployIcon[project.deployTarget]}</span>
              </div>
              <p className="muted">📦 {project.repoFullName}</p>
              <div className="mini-statusbar">
                <span className={`mini ${runtime.status.build}`} />
                <span className={`mini ${runtime.status.test}`} />
                <span className={`mini ${runtime.status.deploy}`} />
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Projektinfo" variant="subtle">
        <p className="project-name">{selectedProject.name}</p>
        <a href={`https://github.com/${selectedProject.repoFullName}`} target="_blank" rel="noreferrer" className="repo-link">{selectedProject.repoFullName}</a>
        <div className="chip-row">
          <Badge label={`Deploy: ${selectedProject.deployTarget}`} />
          <Badge label={`Branch: ${selectedProject.defaultBranch}`} />
          <Badge label={`Env: ${selectedProject.environments.join(", ")}`} />
        </div>
      </Card>
    </aside>
  );
}
