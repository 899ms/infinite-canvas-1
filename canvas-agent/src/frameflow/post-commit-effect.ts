import type { AutoRun, FrameFlowCommand, FrameFlowEvent } from "./types.js";

export type FrameFlowPostCommitEffect =
    | { type: "run.abort"; runId: string }
    | { type: "machine_review.launch"; autoRunId: string; runId: string }
    | { type: "generation.launch"; runId: string; promptVersionId: string; slotIds: string[] }
    | { type: "generation.retry"; runId: string; slotIds: string[] }
    | { type: "auto_run_planning.launch"; autoRunId: string };

export function postCommitEffect(input: {
    command: FrameFlowCommand;
    events: FrameFlowEvent[];
    autoRun?: Pick<AutoRun, "id" | "state" | "currentRunId">;
}): FrameFlowPostCommitEffect | undefined {
    if (input.command.type === "run.cancel") return { type: "run.abort", runId: input.command.runId };
    if (input.command.type === "run.retry") {
        const retry = input.events.find((event) => event.type === "run.retry_started");
        return retry?.type === "run.retry_started" ? { type: "generation.retry", runId: retry.runId, slotIds: retry.slotIds } : undefined;
    }
    if (input.command.type !== "run.start" && input.command.type !== "auto_run.start" && input.command.type !== "auto_run.extend" && input.command.type !== "auto_run.advance") return undefined;
    const review = input.events.find((event) => event.type === "auto_run.review_started");
    if (review?.type === "auto_run.review_started") return { type: "machine_review.launch", autoRunId: review.autoRunId, runId: review.runId };
    const queued = input.events.find((event) => event.type === "run.queued");
    if (queued?.type === "run.queued") return { type: "generation.launch", runId: queued.run.id, promptVersionId: queued.run.promptVersionId, slotIds: queued.run.slotIds };
    if ((input.command.type === "auto_run.start" || input.command.type === "auto_run.extend" || input.command.type === "auto_run.advance") && input.autoRun?.state === "generating" && !input.autoRun.currentRunId) {
        return { type: "auto_run_planning.launch", autoRunId: input.autoRun.id };
    }
    return undefined;
}
