import { queueGenerationRun } from "./generation-run-events.js";
import type { FrameFlowCommand, FrameFlowEvent, GenerationRun, GenerationSlot, PromptVersion } from "./types.js";

export type GenerationCommand = Extract<FrameFlowCommand, { type: "run.start" | "run.retry" | "run.cancel" }>;

export class GenerationCommandError extends Error {
    constructor(message: string, readonly statusCode: 404 | 409) {
        super(message);
    }
}

export function generationCommandEvents(input: {
    command: GenerationCommand;
    prompt?: PromptVersion;
    run?: GenerationRun;
    imageGeneratorConfigured: boolean;
    slots: Record<string, GenerationSlot>;
    occurredAt: string;
    eventId: string;
    createId: () => string;
}): FrameFlowEvent[] {
    const { command, prompt, run, occurredAt, eventId } = input;
    if (command.type === "run.start") {
        if (!prompt) throw new GenerationCommandError("找不到 Prompt Version", 404);
        if (prompt.status !== "approved" && prompt.status !== "used") throw new GenerationCommandError("只有已批准 Prompt 才能开始生成", 409);
        if (!input.imageGeneratorConfigured) throw new GenerationCommandError("FrameFlow Codex ImageGen 尚未配置", 409);
        const runId = input.createId();
        const slotIds = Array.from({ length: command.count }, input.createId);
        return queueGenerationRun({ runId, briefId: prompt.briefId, promptVersionId: prompt.id, count: command.count, slotIds, occurredAt, queuedEventId: eventId, startedEventId: input.createId() });
    }
    if (command.type === "run.retry") {
        if (!run) throw new GenerationCommandError("找不到 Generation Run", 404);
        if (!input.imageGeneratorConfigured) throw new GenerationCommandError("FrameFlow Codex ImageGen 尚未配置", 409);
        if (new Set(command.failedSlotIds).size !== command.failedSlotIds.length) throw new GenerationCommandError("失败 slot 不可重复", 409);
        for (const slotId of command.failedSlotIds) {
            const slot = input.slots[slotId];
            if (!slot || slot.runId !== run.id) throw new GenerationCommandError(`slot 不属于该 Run：${slotId}`, 409);
            if (slot.status !== "failed") throw new GenerationCommandError(`只有失败 slot 可以重试：${slotId}`, 409);
        }
        if (!prompt) throw new GenerationCommandError("找不到 Run 对应的 Prompt Version", 404);
        return [{ type: "run.retry_started", eventId, runId: run.id, slotIds: [...command.failedSlotIds], startedAt: occurredAt }];
    }
    if (!run) throw new GenerationCommandError("找不到 Generation Run", 404);
    if (run.status !== "queued" && run.status !== "running" && run.status !== "retrying") throw new GenerationCommandError("只有生成中的 Run 可以取消", 409);
    return [{ type: "run.cancelled", eventId, runId: run.id, cancelledAt: occurredAt, reason: "user_requested" }];
}
