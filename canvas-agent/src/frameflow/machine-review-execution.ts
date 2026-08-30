import { machineReviewResultSchema } from "./schemas.js";
import type { AutoRun, CreativeBrief, FrameFlowImageAsset, FrameFlowImageReviewer, GenerationRun, MachineReview, PromptVersion } from "./types.js";

export class MachineReviewExecutionError extends Error {
    constructor(message: string, readonly statusCode: 404) {
        super(message);
        this.name = "MachineReviewExecutionError";
    }
}

export type MachineReviewExecutionResult =
    | { type: "already_reviewed" }
    | { type: "reviewed"; pendingImageIds: string[]; reviews: Array<Omit<MachineReview, "autoRunId" | "runId" | "iteration" | "createdAt">> };

export async function executeMachineReview(input: {
    reviewer: FrameFlowImageReviewer;
    brief: CreativeBrief;
    prompt: PromptVersion;
    autoRun: Pick<AutoRun, "id" | "iteration">;
    run: Pick<GenerationRun, "id" | "imageIds">;
    images: Record<string, FrameFlowImageAsset | undefined>;
    reviewedImageIds: ReadonlySet<string>;
    imagePath: (image: FrameFlowImageAsset) => string;
}): Promise<MachineReviewExecutionResult> {
    const pendingImages = input.run.imageIds.filter((imageId) => !input.reviewedImageIds.has(imageId)).map((imageId) => {
        const image = input.images[imageId];
        if (!image) throw new MachineReviewExecutionError(`找不到机器审图图片：${imageId}`, 404);
        return { imageId, filePath: input.imagePath(image) };
    });
    if (!pendingImages.length) return { type: "already_reviewed" };
    const rawReviews = await input.reviewer.review({
        brief: structuredClone(input.brief),
        prompt: structuredClone(input.prompt),
        autoRunId: input.autoRun.id,
        runId: input.run.id,
        iteration: input.autoRun.iteration,
        images: pendingImages,
    });
    return {
        type: "reviewed",
        pendingImageIds: pendingImages.map((image) => image.imageId),
        reviews: rawReviews.map((review) => machineReviewResultSchema.parse(review)),
    };
}
