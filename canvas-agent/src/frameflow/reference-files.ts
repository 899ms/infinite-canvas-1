import type { FrameFlowImageAsset, FrameFlowReferenceAsset } from "./types.js";

export function resolvePromptReferenceFiles(input: {
    referenceImageIds: string[];
    references: Record<string, FrameFlowReferenceAsset>;
    images: Record<string, FrameFlowImageAsset>;
    referencePath: (reference: FrameFlowReferenceAsset) => string;
    imagePath: (image: FrameFlowImageAsset) => string;
    missing: (imageId: string) => Error;
}): string[] {
    return input.referenceImageIds.map((imageId) => {
        const reference = input.references[imageId];
        if (reference) return input.referencePath(reference);
        const image = input.images[imageId];
        if (image) return input.imagePath(image);
        throw input.missing(imageId);
    });
}
