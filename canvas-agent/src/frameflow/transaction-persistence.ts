import type { FrameFlowTransaction } from "./types.js";

export async function persistFrameFlowTransaction<TProjection>(input: {
    transaction: FrameFlowTransaction;
    append: (transaction: FrameFlowTransaction) => Promise<void>;
    remember: (transaction: FrameFlowTransaction) => void;
    currentProjection: () => TProjection;
    writeProjection: (projection: TProjection) => Promise<void>;
    onAppendFailure?: () => Promise<unknown>;
}): Promise<void> {
    try {
        await input.append(input.transaction);
    } catch (error) {
        await input.onAppendFailure?.();
        throw error;
    }
    input.remember(input.transaction);
    await input.writeProjection(input.currentProjection());
}
