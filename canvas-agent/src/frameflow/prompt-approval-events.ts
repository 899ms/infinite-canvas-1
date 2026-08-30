import type { FrameFlowEvent, PromptLocks, PromptVersion } from "./types.js";

export class PromptApprovalError extends Error {
    constructor(message: string, readonly statusCode: 409) {
        super(message);
    }
}

export function promptApprovalEvents(input: { prompt: PromptVersion; locks: PromptLocks; eventId: string }): FrameFlowEvent[] {
    const { prompt, locks, eventId } = input;
    if (prompt.status !== "draft") throw new PromptApprovalError("只有 draft Prompt 可以批准", 409);
    for (const [field, values] of Object.entries(locks)) {
        if (values?.some((value) => !prompt.fields[field as keyof typeof prompt.fields].includes(value))) throw new PromptApprovalError(`锁定项不属于 Prompt 字段：${field}`, 409);
    }
    return [{ type: "prompt.approved", eventId, promptVersionId: prompt.id, locks: structuredClone(locks) }];
}
