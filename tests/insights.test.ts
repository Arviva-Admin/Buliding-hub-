import { describe, expect, it } from "vitest";
import { InsightsStore } from "../src/core/insights.js";

describe("InsightsStore", () => {
  it("builds project health report with recurring failures and improvements", () => {
    const store = new InsightsStore();
    store.saveInsight({
      projectId: "arviva-os",
      runType: "build_test_deploy",
      worked: ["build pass"],
      issues: ["deploy timeout", "deploy timeout"],
      unnecessarySteps: ["duplicate health check"],
      createdAt: new Date().toISOString(),
    });

    const report = store.buildHealthReport("arviva-os");
    expect(report.projectId).toBe("arviva-os");
    expect(report.recurringFailures[0]).toContain("deploy timeout");
    expect(report.topImprovements.length).toBe(3);
  });
});
