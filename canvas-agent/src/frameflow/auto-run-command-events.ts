import type { AutoRun, FrameFlowCommand, FrameFlowEvent, GenerationRun, MachineReview } from "./types.js";

export type AutoRunTransitionCommand = Extract<FrameFlowCommand, { type: "auto_run.start" | "auto_run.stop" | "auto_run.extend" | "auto_run.advance" }>;

export class AutoRunCommandError extends Error {
    constructor(message: string, readonly statusCode: 409) {
        super(message);
    }
}

export function autoRunCommandEvents(input: {
    command: AutoRunTransitionCommand;
    autoRun: AutoRun;
    currentRun?: GenerationRun;
    otherActiveAutoRun?: AutoRun;
    imageReviewerConfigured: boolean;
    machineReviewsByImage: Record<string, MachineReview>;
    canContinueExploration: boolean;
    occurredAt: string;
    eventId: string;
}): FrameFlowEvent[] {
    const { command, autoRun, occurredAt, eventId } = input;
    if (command.type === "auto_run.stop") {
        if (autoRun.state !== "generating" && autoRun.state !== "reviewing") throw new AutoRunCommandError("只有正在生成或机器审图的自动跑可以停止", 409);
        return [{ type: "auto_run.paused", eventId, autoRunId: autoRun.id, pausedAt: occurredAt, reason: "user_requested" }];
    }
    if (command.type === "auto_run.start") {
        if (!input.imageReviewerConfigured) throw new AutoRunCommandError("FrameFlow Codex 机器审图尚未配置", 409);
        if (autoRun.state === "generating" || autoRun.state === "reviewing") throw new AutoRunCommandError("自动跑已经启动", 409);
        if (input.otherActiveAutoRun) throw new AutoRunCommandError(`请先停止正在运行的“${input.otherActiveAutoRun.name}”`, 409);
        const currentRun = input.currentRun;
        if (currentRun && (currentRun.status === "queued" || currentRun.status === "running" || currentRun.status === "retrying")) {
            return [{ type: "auto_run.updated", eventId, autoRun: { ...structuredClone(autoRun), state: "generating", updatedAt: occurredAt } }];
        }
        if (currentRun?.imageIds.length) {
            const missingReview = currentRun.imageIds.some((imageId) => !input.machineReviewsByImage[imageId]);
            if (missingReview) return [{ type: "auto_run.review_started", eventId, autoRunId: autoRun.id, runId: currentRun.id, startedAt: occurredAt }];
            if (autoRun.iteration >= autoRun.maxIterations) return [{ type: "auto_run.completed", eventId, autoRunId: autoRun.id, runId: currentRun.id, completedAt: occurredAt }];
        }
        return [{ type: "auto_run.updated", eventId, autoRun: planningAutoRun(autoRun, occurredAt) }];
    }
    if (command.type === "auto_run.extend") {
        if (autoRun.state !== "completed") throw new AutoRunCommandError("只有已完成的自动跑可以继续探索", 409);
        if (!input.canContinueExploration) throw new AutoRunCommandError("最后一轮没有可继续探索的 vary 机器审图，或已达到 20 轮上限", 409);
        const maxIterations = autoRun.maxIterations + command.additionalIterations;
        if (maxIterations > 20) throw new AutoRunCommandError("自动跑最多可累计 20 轮", 409);
        if (input.otherActiveAutoRun) throw new AutoRunCommandError(`请先停止正在运行的“${input.otherActiveAutoRun.name}”`, 409);
        return [{ type: "auto_run.extended", eventId, autoRunId: autoRun.id, previousMaxIterations: autoRun.maxIterations, maxIterations, additionalIterations: command.additionalIterations, extendedAt: occurredAt }];
    }
    if (autoRun.state !== "reviewing" || !autoRun.currentRunId) throw new AutoRunCommandError("当前没有正在自动审图的轮次", 409);
    const run = input.currentRun;
    if (!run?.imageIds.length || run.imageIds.some((imageId) => !input.machineReviewsByImage[imageId])) throw new AutoRunCommandError("Codex 尚未完成本轮机器审图", 409);
    if (autoRun.iteration >= autoRun.maxIterations) return [{ type: "auto_run.completed", eventId, autoRunId: autoRun.id, runId: run.id, completedAt: occurredAt }];
    return [{ type: "auto_run.updated", eventId, autoRun: planningAutoRun(autoRun, occurredAt) }];
}

function planningAutoRun(autoRun: AutoRun, updatedAt: string): AutoRun {
    const next = { ...structuredClone(autoRun), state: "generating" as const, lastStartedAt: updatedAt, updatedAt };
    delete next.currentRunId;
    delete next.lastError;
    return next;
}
