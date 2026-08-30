import type { AutoRun, FrameFlowCommand, FrameFlowEvent } from "./types.js";

export type AutoRunConfigurationCommand = Extract<FrameFlowCommand, { type: "auto_run.create" | "auto_run.update" }>;

export class AutoRunConfigurationError extends Error {
    constructor(message: string, readonly statusCode: 409) {
        super(message);
    }
}

export function autoRunConfigurationEvents(input: {
    command: AutoRunConfigurationCommand;
    autoRun?: AutoRun;
    eventId: string;
    occurredAt: string;
    createId: () => string;
}): FrameFlowEvent[] {
    const { command, eventId, occurredAt } = input;
    if (command.type === "auto_run.create") {
        return [{ type: "auto_run.created", eventId, autoRun: { id: input.createId(), ...command.input, state: "paused", iteration: 0, createdAt: occurredAt, updatedAt: occurredAt } }];
    }
    const autoRun = input.autoRun;
    if (!autoRun) throw new AutoRunConfigurationError("找不到自动跑", 409);
    if (autoRun.state === "generating" || autoRun.state === "reviewing") throw new AutoRunConfigurationError("请先停止自动跑，再修改名称、每轮数量或最大轮数", 409);
    return [{ type: "auto_run.updated", eventId, autoRun: { ...structuredClone(autoRun), ...command.input, updatedAt: occurredAt } }];
}
