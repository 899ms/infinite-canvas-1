import { queueGenerationRun } from "./generation-run-events.js";
import type { AutoRun, FrameFlowEvent } from "./types.js";

export class AutoRunIterationEventError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AutoRunIterationEventError";
    }
}

export function autoRunIterationEvents(input: {
    planned: FrameFlowEvent[];
    autoRun: Pick<AutoRun, "id" | "briefId" | "iteration" | "count">;
    occurredAt: string;
    createId: () => string;
}): FrameFlowEvent[] {
    const promptEvent = input.planned.find((event) => event.type === "prompt.version_created");
    if (!promptEvent || promptEvent.type !== "prompt.version_created") throw new AutoRunIterationEventError("自动跑未生成 Prompt Version");
    const runId = input.createId();
    const slotIds = Array.from({ length: input.autoRun.count }, input.createId);
    return [
        ...input.planned,
        { type: "prompt.approved", eventId: input.createId(), promptVersionId: promptEvent.promptVersion.id, locks: {} },
        ...queueGenerationRun({ runId, briefId: input.autoRun.briefId, promptVersionId: promptEvent.promptVersion.id, count: input.autoRun.count, slotIds, occurredAt: input.occurredAt, queuedEventId: input.createId(), startedEventId: input.createId() }),
        { type: "auto_run.iteration_started", eventId: input.createId(), autoRunId: input.autoRun.id, iteration: input.autoRun.iteration + 1, runId, startedAt: input.occurredAt },
    ];
}
