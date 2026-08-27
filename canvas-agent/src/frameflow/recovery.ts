import type { FrameFlowProjection } from "./reducer.js";
import type { FrameFlowTransaction } from "./types.js";

export function staleRunRecoveryTransaction(projection: FrameFlowProjection, occurredAt: string, createId: () => string): FrameFlowTransaction | undefined {
    const staleRuns = Object.values(projection.runs).filter((run) => run.status === "queued" || run.status === "running" || run.status === "retrying");
    if (!staleRuns.length) return undefined;
    return {
        schemaVersion: 1,
        sequence: projection.sequence + 1,
        transactionId: createId(),
        idempotencyKey: `system:restart-recovery:${createId()}`,
        occurredAt,
        actor: { type: "system" },
        events: staleRuns.map((run) => ({ type: "run.cancelled", eventId: createId(), runId: run.id, cancelledAt: occurredAt, reason: "agent_restart" })),
    };
}
