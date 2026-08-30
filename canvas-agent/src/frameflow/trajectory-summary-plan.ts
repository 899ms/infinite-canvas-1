import type { AutoRunTrajectoryResult, AutoRunTrajectorySummary, AutoRunTrajectorySummaryInput } from "./types.js";

export class TrajectorySummaryPlanError extends Error {
    constructor(message: string, readonly statusCode: 409) {
        super(message);
        this.name = "TrajectorySummaryPlanError";
    }
}

export type TrajectorySummaryPlan =
    | { type: "cached"; summary: AutoRunTrajectorySummary }
    | { type: "summarize"; throughIteration: number; reviewedIterations: Set<number>; input: AutoRunTrajectorySummaryInput };

export function trajectorySummaryPlan(input: { trajectory: AutoRunTrajectoryResult; existing?: AutoRunTrajectorySummary; force: boolean }): TrajectorySummaryPlan {
    const reviewedRounds = input.trajectory.rounds.filter((round) => round.images.length > 0 && round.images.every((item) => item.machineReview));
    if (reviewedRounds.length < 2) throw new TrajectorySummaryPlanError("至少需要两轮完整 Machine Review 才能生成跨轮总结", 409);
    const throughIteration = reviewedRounds.at(-1)!.iteration;
    if (!input.force && input.existing?.throughIteration === throughIteration) return { type: "cached", summary: structuredClone(input.existing) };
    return {
        type: "summarize",
        throughIteration,
        reviewedIterations: new Set(reviewedRounds.map((round) => round.iteration)),
        input: {
            brief: structuredClone(input.trajectory.brief),
            rounds: reviewedRounds.map((round) => ({
                iteration: round.iteration,
                prompt: structuredClone(round.prompt),
                machineReviews: round.images.flatMap((item) => item.machineReview ? [structuredClone(item.machineReview)] : []),
            })),
        },
    };
}
