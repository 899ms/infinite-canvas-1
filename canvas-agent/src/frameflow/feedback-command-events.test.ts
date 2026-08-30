import assert from "node:assert/strict";
import test from "node:test";

import { FeedbackCommandError, feedbackCommandEvents } from "./feedback-command-events.js";
import type { FrameFlowImageAsset } from "./types.js";

const image = (status: FrameFlowImageAsset["status"] = "pending_review"): FrameFlowImageAsset => ({
    id: "image-1",
    runId: "run-1",
    promptVersionId: "prompt-1",
    referenceImageIds: [],
    file: { relativePath: "image.png", sha256: "hash", bytes: 1, mimeType: "image/png" },
    thumbnail: { relativePath: "thumb.png", width: 1, height: 1 },
    width: 1,
    height: 1,
    status,
    createdAt: "2026-08-29T00:00:00.000Z",
});

test("中性删除和人工反馈映射为可重放事实事件", () => {
    assert.deepEqual(feedbackCommandEvents({ command: { type: "image.delete", imageId: "image-1", idempotencyKey: "delete" }, image: image(), eventId: "event-delete" }), [{ type: "image.permanently_deleted", eventId: "event-delete", imageId: "image-1" }]);
    assert.deepEqual(feedbackCommandEvents({ command: { type: "feedback.append", imageId: "image-1", feedback: { kind: "soft_delete", reason: "aesthetic_dislike", note: "blur" }, idempotencyKey: "feedback" }, image: image(), eventId: "event-feedback" }), [{ type: "image.soft_deleted", eventId: "event-feedback", imageId: "image-1", reason: "aesthetic_dislike", note: "blur" }]);
    assert.deepEqual(feedbackCommandEvents({ command: { type: "feedback.append", imageId: "image-1", feedback: { kind: "preference_feature_review", featureId: "color", decision: "lock" }, idempotencyKey: "feature" }, image: image(), eventId: "event-feature" }), [{ type: "preference.feature_reviewed", eventId: "event-feature", imageId: "image-1", featureId: "color", decision: "lock" }]);
});

test("已永久删除图片拒绝删除与后续反馈，保留原有提示", () => {
    assert.throws(() => feedbackCommandEvents({ command: { type: "image.delete", imageId: "image-1", idempotencyKey: "delete" }, image: image("permanently_deleted"), eventId: "event" }), (error: unknown) => error instanceof FeedbackCommandError && error.message === "图片已经删除");
    assert.throws(() => feedbackCommandEvents({ command: { type: "feedback.append", imageId: "image-1", feedback: { kind: "rating", rating: 5 }, idempotencyKey: "rating" }, image: image("permanently_deleted"), eventId: "event" }), (error: unknown) => error instanceof FeedbackCommandError && error.message === "已删除图片不能继续反馈");
});
