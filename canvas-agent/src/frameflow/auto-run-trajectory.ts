import { canContinueExploration, requirementState } from "./query-projection.js";
import type { FrameFlowProjection } from "./reducer.js";
import type { AutoRunTrajectoryResult, FrameFlowTransaction } from "./types.js";

type DomainErrorFactory = (message: string, statusCode: 400 | 404 | 409 | 500) => Error;

export function autoRunTrajectory(projection: FrameFlowProjection, transactions: FrameFlowTransaction[], autoRunId: string, domainError: DomainErrorFactory): AutoRunTrajectoryResult {
    const autoRun = projection.autoRuns[autoRunId];
    if (!autoRun) throw domainError("找不到自动跑", 404);
    const brief = projection.briefs[autoRun.briefId];
    if (!brief) throw domainError("自动跑缺少 Exploration Direction 血缘", 500);
    const rounds = transactions
        .flatMap((transaction) => transaction.events)
        .filter((event) => event.type === "auto_run.iteration_started" && event.autoRunId === autoRunId)
        .map((event) => {
            if (event.type !== "auto_run.iteration_started") throw domainError("自动跑演化事件无效", 500);
            const run = projection.runs[event.runId];
            const prompt = run ? projection.prompts[run.promptVersionId] : undefined;
            if (!run || !prompt) throw domainError("自动跑演化血缘不完整", 500);
            return {
                iteration: event.iteration,
                run: structuredClone(run),
                prompt: structuredClone(prompt),
                images: run.imageIds.map((imageId) => {
                    const image = projection.images[imageId];
                    if (!image) throw domainError("自动跑演化图片血缘不完整", 500);
                    const machineReview = projection.machineReviewsByImage[imageId];
                    return {
                        image: structuredClone(image),
                        ...(machineReview ? { machineReview: structuredClone(machineReview) } : {}),
                    };
                }),
            };
        })
        .sort((left, right) => left.iteration - right.iteration);
    return {
        type: "auto_run.trajectory",
        autoRun: {
            ...structuredClone(autoRun),
            ...requirementState(projection, autoRun.briefId),
            canContinueExploration: canContinueExploration(projection, autoRun),
        },
        brief: structuredClone(brief),
        rounds,
        ...(projection.trajectorySummariesByAutoRun[autoRunId] ? { summary: structuredClone(projection.trajectorySummariesByAutoRun[autoRunId]) } : {}),
    };
}
