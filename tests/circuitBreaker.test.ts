import { describe, expect, it } from "vitest";
import { ModelCircuitBreaker } from "../src/core/circuitBreaker.js";
import type { Task } from "../src/core/types.js";

const task: Task = { id: "t1", type: "codegen", prompt: "make" };

describe("ModelCircuitBreaker", () => {
  it("falls back after repeated failures", async () => {
    let primaryCalls = 0;
    let fallbackCalls = 0;

    const breaker = new ModelCircuitBreaker(
      { failureThreshold: 3, cooldownMs: 60_000 },
      {
        primary: async () => {
          primaryCalls += 1;
          throw new Error("primary down");
        },
        fallback: async (input) => {
          fallbackCalls += 1;
          return { taskId: input.id, provider: "fallback", output: "ok" };
        },
      },
      () => "fallback",
    );

    await expect(breaker.call("primary", task)).rejects.toThrow("primary down");
    await expect(breaker.call("primary", task)).rejects.toThrow("primary down");
    await expect(breaker.call("primary", task)).rejects.toThrow("primary down");

    const result = await breaker.call("primary", task);
    expect(result.provider).toBe("fallback");
    expect(primaryCalls).toBe(3);
    expect(fallbackCalls).toBe(1);
  });
});
