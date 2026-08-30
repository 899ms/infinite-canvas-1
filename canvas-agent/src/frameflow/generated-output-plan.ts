import type { QuarantineReason } from "./types.js";

export type GeneratedOutputPlan = {
    importFiles: string[];
    quarantinedFiles: string[];
    quarantineReason?: QuarantineReason;
};

export function generatedOutputPlan(input: {
    generatedFiles: string[];
    slotCount: number;
    cancelled: boolean;
}): GeneratedOutputPlan {
    if (input.cancelled) {
        return {
            importFiles: [],
            quarantinedFiles: input.generatedFiles,
            quarantineReason: "generation_cancelled",
        };
    }
    const importFiles = input.generatedFiles.slice(0, input.slotCount);
    const quarantinedFiles = input.generatedFiles.slice(input.slotCount);
    return {
        importFiles,
        quarantinedFiles,
        ...(quarantinedFiles.length ? { quarantineReason: "orphan_recovery" as const } : {}),
    };
}
