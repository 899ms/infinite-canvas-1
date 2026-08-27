import crypto from "node:crypto";

import type { FrameFlowEvent, GenerationError, PromptVersion } from "./types.js";

export function generationCropPosition(prompt: PromptVersion): "top" | "attention" {
    const context = [
        prompt.compiledPrompt,
        ...prompt.fields.subject,
        ...prompt.fields.composition,
        ...prompt.fields.layout,
        ...prompt.fields.technical,
    ].join(" ");
    return /\b(?:dashboard|user interface|ui concept|web interface|website|web page|app screen|top navigation|header|toolbar)\b/i.test(context) ? "top" : "attention";
}

export function failedSlotEvents(runId: string, slotIds: string[], error: GenerationError): FrameFlowEvent[] {
    return slotIds.map((slotId) => ({ type: "run.slot_failed", eventId: crypto.randomUUID(), runId, slotId, error: structuredClone(error) }));
}
