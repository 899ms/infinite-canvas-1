import type { FrameFlowCommand, FrameFlowEvent, FrameFlowImageAsset } from "./types.js";

export type FeedbackCommand = Extract<FrameFlowCommand, { type: "image.delete" | "feedback.append" }>;

export class FeedbackCommandError extends Error {
    constructor(message: string, readonly statusCode: 409) {
        super(message);
    }
}

export function feedbackCommandEvents(input: { command: FeedbackCommand; image?: FrameFlowImageAsset; eventId: string }): FrameFlowEvent[] {
    const { command, image, eventId } = input;
    if (image?.status === "permanently_deleted") throw new FeedbackCommandError(command.type === "image.delete" ? "图片已经删除" : "已删除图片不能继续反馈", 409);
    if (command.type === "image.delete") return [{ type: "image.permanently_deleted", eventId, imageId: command.imageId }];
    const { imageId, feedback } = command;
    if (feedback.kind === "rating") return [{ type: "feedback.rating_set", eventId, imageId, rating: feedback.rating }];
    if (feedback.kind === "comment") return [{ type: "feedback.comment_set", eventId, imageId, comment: feedback.comment }];
    if (feedback.kind === "soft_delete") return [{ type: "image.soft_deleted", eventId, imageId, reason: feedback.reason, ...(feedback.note ? { note: feedback.note } : {}) }];
    if (feedback.kind === "restore") return [{ type: "image.restored", eventId, imageId }];
    return [{ type: "preference.feature_reviewed", eventId, imageId, featureId: feedback.featureId, decision: feedback.decision, ...(feedback.value ? { value: feedback.value } : {}) }];
}
