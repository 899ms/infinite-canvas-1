import { promptTranslationSchema } from "./schemas.js";
import type { FrameFlowEvent, FrameFlowPromptPlanner, PromptDisplayLanguage, PromptVersion } from "./types.js";

export class PromptTranslationError extends Error {
    constructor(message: string, readonly statusCode: 409) {
        super(message);
    }
}

export async function promptTranslationEvents(input: {
    prompt: PromptVersion;
    language: PromptDisplayLanguage;
    eventId: string;
    translate?: NonNullable<FrameFlowPromptPlanner["translate"]>;
}): Promise<FrameFlowEvent[]> {
    const { prompt, language, eventId } = input;
    const existing = prompt.translations?.[language];
    if (existing) return [{ type: "prompt.translation_created", eventId, promptVersionId: prompt.id, language, translation: structuredClone(existing) }];
    if (!input.translate) throw new PromptTranslationError("FrameFlow Codex 中文翻译尚未配置", 409);
    const translation = promptTranslationSchema.parse(await input.translate({ prompt: structuredClone(prompt), language }));
    return [{ type: "prompt.translation_created", eventId, promptVersionId: prompt.id, language, translation }];
}
