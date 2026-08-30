import type { FrameFlowTransaction } from "./types.js";

export function autoRunFailureTransaction(input: {
    autoRunId: string;
    message: string;
    sequence: number;
    occurredAt: string;
    createId: () => string;
}): FrameFlowTransaction {
    return {
        schemaVersion: 1,
        sequence: input.sequence + 1,
        transactionId: input.createId(),
        idempotencyKey: `system:auto-run-failure:${input.autoRunId}:${input.createId()}`,
        occurredAt: input.occurredAt,
        actor: { type: "system" },
        events: [{ type: "auto_run.failed", eventId: input.createId(), autoRunId: input.autoRunId, error: input.message.slice(0, 500), failedAt: input.occurredAt }],
    };
}
