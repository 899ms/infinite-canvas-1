import { generatedOutputPlan } from "./generated-output-plan.js";
import type { FrameFlowImageAsset, FrameFlowImageGenerator, GenerationError, PromptVersion, QuarantineReason } from "./types.js";

export type GenerationExecutionResult =
    | { type: "discarded" }
    | { type: "finalize"; images: FrameFlowImageAsset[]; error?: GenerationError };

export async function executeImageGeneration(input: {
    generator: FrameFlowImageGenerator;
    assets: {
        importGenerated: (files: string[], details: { runId: string; promptVersionId: string; aspectRatio: string; cropPosition: "top" | "attention"; createdAt: string }) => Promise<FrameFlowImageAsset[]>;
        quarantineGenerated: (files: string[], details: { reason: QuarantineReason; runId?: string; promptVersionId?: string }) => Promise<unknown>;
    };
    prompt: PromptVersion;
    aspectRatio: string;
    cropPosition: "top" | "attention";
    runId: string;
    slotIds: string[];
    referenceFiles: string[];
    signal: AbortSignal;
    now: () => string;
}): Promise<GenerationExecutionResult> {
    let generatedFiles: string[];
    try {
        generatedFiles = await input.generator.generate({
            prompt: structuredClone(input.prompt),
            count: input.slotIds.length,
            aspectRatio: input.aspectRatio,
            cropPosition: input.cropPosition,
            referenceFiles: input.referenceFiles,
            signal: input.signal,
        });
    } catch {
        if (input.signal.aborted) return { type: "discarded" };
        return { type: "finalize", images: [], error: { code: "IMAGEGEN_FAILED", message: "Codex ImageGen 生成失败，可重试该 slot", retryable: true } };
    }

    const output = generatedOutputPlan({ generatedFiles, slotCount: input.slotIds.length, cancelled: input.signal.aborted });
    if (output.quarantineReason === "generation_cancelled") {
        await input.assets.quarantineGenerated(output.quarantinedFiles, { reason: output.quarantineReason, runId: input.runId, promptVersionId: input.prompt.id });
        return { type: "discarded" };
    }

    let images: FrameFlowImageAsset[];
    try {
        images = await input.assets.importGenerated(output.importFiles, {
            runId: input.runId,
            promptVersionId: input.prompt.id,
            aspectRatio: input.aspectRatio,
            cropPosition: input.cropPosition,
            createdAt: input.now(),
        });
    } catch {
        await input.assets.quarantineGenerated(generatedFiles, { reason: input.signal.aborted ? "generation_cancelled" : "asset_import_failed", runId: input.runId, promptVersionId: input.prompt.id });
        if (input.signal.aborted) return { type: "discarded" };
        return { type: "finalize", images: [], error: { code: "IMAGE_VALIDATION_FAILED", message: "ImageGen 返回的图片未通过 PNG 校验，可重试该 slot", retryable: true } };
    }

    if (output.quarantinedFiles.length) {
        await input.assets.quarantineGenerated(output.quarantinedFiles, { reason: output.quarantineReason!, runId: input.runId, promptVersionId: input.prompt.id });
    }
    return {
        type: "finalize",
        images: images.map((image) => ({ ...image, referenceImageIds: [...input.prompt.referenceImageIds] })),
    };
}
