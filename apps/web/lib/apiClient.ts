import type { ProjectRuntimeData } from "./types";

export interface HubApiClient {
  getProjectRuntime(projectId: string): Promise<ProjectRuntimeData | null>;
  triggerIntent(projectId: string, intent: string): Promise<{ ok: boolean; message: string }>;
}

/**
 * Mock-first API client stub.
 * Replace internals with real fetch calls when backend endpoints are ready.
 */
export const hubApiClient: HubApiClient = {
  async getProjectRuntime(_projectId) {
    return null;
  },
  async triggerIntent(_projectId, intent) {
    return { ok: true, message: `Mock intent queued: ${intent}` };
  },
};
