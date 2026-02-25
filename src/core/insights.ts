export interface RunInsight {
  projectId: string;
  runType: "build_test_deploy" | "refactor" | "other";
  worked: string[];
  issues: string[];
  unnecessarySteps: string[];
  createdAt: string;
}

export interface ProjectHealthReport {
  projectId: string;
  summary: string;
  recurringFailures: string[];
  riskAreas: string[];
  topImprovements: string[];
}

export class InsightsStore {
  private readonly insights: RunInsight[] = [];

  saveInsight(entry: RunInsight): void {
    this.insights.push(entry);
  }

  getByProject(projectId: string): RunInsight[] {
    return this.insights.filter((item) => item.projectId === projectId);
  }

  getLatest(projectId: string): RunInsight | undefined {
    return this.getByProject(projectId).at(-1);
  }

  buildHealthReport(projectId: string): ProjectHealthReport {
    const entries = this.getByProject(projectId);
    const recurringFailures = [...new Set(entries.flatMap((e) => e.issues).filter(Boolean))].slice(0, 3);
    const unnecessary = [...new Set(entries.flatMap((e) => e.unnecessarySteps).filter(Boolean))];

    const riskAreas = recurringFailures.length
      ? recurringFailures.map((issue) => `Risk: ${issue}`)
      : ["Risk: limited run history – confidence is low"];

    const topImprovements = [
      recurringFailures.length ? `Automate remediation for: ${recurringFailures[0]}` : "Collect more run telemetry for this project",
      "Tighten pre-generation validation for vague requests",
      unnecessary.length ? `Remove unnecessary step: ${unnecessary[0]}` : "Reduce pipeline overhead with cached successful steps",
    ].slice(0, 3);

    return {
      projectId,
      summary: entries.length
        ? `Collected ${entries.length} insight runs. ${recurringFailures.length} recurring failure pattern(s) detected.`
        : "No runs recorded yet. Start with build/test/deploy to generate a meaningful report.",
      recurringFailures,
      riskAreas,
      topImprovements,
    };
  }
}
