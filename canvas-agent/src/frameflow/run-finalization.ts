import crypto from "node:crypto";

import { failedSlotEvents } from "./generation-plan.js";
import type { AutoRun, FrameFlowEvent, FrameFlowImageAsset, GenerationError, GenerationRun, GenerationSlot } from "./types.js";

export type RunFinalizationPlan = {
    events: FrameFlowEvent[];
    totalSucceeded: number;
    status: "succeeded" | "partially_succeeded" | "failed";
    reviewAutoRunId?: string;
};

export function runFinalizationPlan(input: {
    run: Pick<GenerationRun, "id" | "requestedCount" | "slotIds">;
    slots: Record<string, Pick<GenerationSlot, "status"> | undefined>;
    slotIds: string[];
    images: FrameFlowImageAsset[];
    error?: GenerationError;
    autoRun?: Pick<AutoRun, "id" | "state">;
    occurredAt: string;
}): RunFinalizationPlan {
    const events: FrameFlowEvent[] = input.images.flatMap((image, index): FrameFlowEvent[] => [
        { type: "run.slot_succeeded", eventId: crypto.randomUUID(), runId: input.run.id, slotId: input.slotIds[index]!, imageId: image.id },
        { type: "image.registered", eventId: crypto.randomUUID(), image },
    ]);
    const failedIds = input.slotIds.slice(input.images.length);
    if (failedIds.length) {
        const error = input.error || { code: "IMAGEGEN_MISSING_RESULT" as const, message: "ImageGen 未返回该 slot 的图片，可单独重试", retryable: true };
        events.push(...failedSlotEvents(input.run.id, failedIds, error));
    }
    const previousSucceeded = input.run.slotIds.filter((slotId) => input.slots[slotId]?.status === "succeeded").length;
    const totalSucceeded = previousSucceeded + input.images.length;
    const status = totalSucceeded === input.run.requestedCount ? "succeeded" : totalSucceeded > 0 ? "partially_succeeded" : "failed";
    events.push({ type: "run.completed", eventId: crypto.randomUUID(), runId: input.run.id, status, completedAt: input.occurredAt });
    const reviewAutoRunId = input.autoRun && totalSucceeded > 0 ? input.autoRun.id : undefined;
    if (input.autoRun?.state === "generating" && reviewAutoRunId) events.push({ type: "auto_run.review_started", eventId: crypto.randomUUID(), autoRunId: reviewAutoRunId, runId: input.run.id, startedAt: input.occurredAt });
    if (input.autoRun?.state === "generating" && totalSucceeded === 0) {
        events.push({ type: "auto_run.failed", eventId: crypto.randomUUID(), autoRunId: input.autoRun.id, error: "本轮没有生成可审核图片，请检查失败项后重新启动", failedAt: input.occurredAt });
    }
    return { events, totalSucceeded, status, ...(reviewAutoRunId ? { reviewAutoRunId } : {}) };
}
