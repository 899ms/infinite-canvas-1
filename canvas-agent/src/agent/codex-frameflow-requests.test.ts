import assert from "node:assert/strict";
import test from "node:test";

import {
  frameFlowImageRequest,
  frameFlowPromptRequest,
  frameFlowReviewRequest,
  frameFlowTrajectorySummaryRequest,
  frameFlowTranslationRequest,
  type FrameFlowImageInput,
  type FrameFlowImageReviewInput,
  type FrameFlowPromptInput,
  type FrameFlowPromptTranslationInput,
  type FrameFlowTrajectorySummaryInput,
} from "./codex-frameflow-requests.js";

const fields = {
  subject: ["chair"],
  composition: ["front view"],
  color: ["red"],
  lighting: ["soft"],
  material: ["wood"],
  layout: ["centered"],
  mood: ["calm"],
  rendering: ["photorealistic"],
  technical: ["35mm"],
  negative: ["text"],
};

const prompt = {
  id: "prompt-1",
  revision: 1,
  fields,
  compiledPrompt: "a red chair",
  briefId: "brief-1",
  translations: {
    "zh-CN": {
      fields: { ...fields, subject: ["红色椅子"] },
      compiledPrompt: "一把红色椅子",
    },
  },
} as FrameFlowImageInput["prompt"];

test("FrameFlow 请求构建器保留规划、翻译、生成、审图和跨轮总结的既有约束", () => {
  const promptRequest = frameFlowPromptRequest({
    strategy: "explore",
    brief: { id: "brief-1", subject: "椅子" },
    preference: {
      boost: [{ imageId: "image-like" }],
      avoid: [{ imageId: "image-avoid" }],
    },
    machineReviews: [{ imageId: "image-1", decision: "vary" }],
  } as FrameFlowPromptInput);
  assert.match(promptRequest, /策略：explore/);
  assert.match(promptRequest, /image-like/);
  assert.match(promptRequest, /image-avoid/);
  assert.match(promptRequest, /image-1/);
  assert.match(
    promptRequest,
    /decision\.evidence 必须与 Preference DNA 的 boost 和 avoid 图片一一对应/,
  );

  const translationRequest = frameFlowTranslationRequest({
    prompt,
    language: "zh-CN",
  } as FrameFlowPromptTranslationInput);
  assert.match(translationRequest, /目标语言：zh-CN/);
  assert.match(translationRequest, /a red chair/);

  const imageRequest = frameFlowImageRequest({
    prompt,
    count: 2,
    aspectRatio: "16:9",
    cropPosition: "attention",
    referenceFiles: ["reference.png"],
    signal: new AbortController().signal,
  } as FrameFlowImageInput);
  assert.match(imageRequest, /生成 2 张互相独立的 PNG 图片/);
  assert.match(imageRequest, /硬性输出画幅：16:9/);
  assert.match(imageRequest, /提供了 1 张参考图/);
  assert.match(imageRequest, /Negative：\ntext/);
  assert.match(imageRequest, /已批准 Prompt：\na red chair/);
  assert.doesNotMatch(imageRequest, /一把红色椅子|红色椅子/);

  const reviewRequest = frameFlowReviewRequest({
    brief: { id: "brief-1", subject: "椅子" },
    prompt,
    autoRunId: "auto-1",
    runId: "run-1",
    iteration: 2,
    images: [
      { imageId: "image-1", filePath: "one.png" },
      { imageId: "image-2", filePath: "two.png" },
    ],
  } as FrameFlowImageReviewInput);
  assert.match(reviewRequest, /自动跑：auto-1；第 2 轮；Run：run-1/);
  assert.match(reviewRequest, /"imageId": "image-1"/);
  assert.match(reviewRequest, /"imageId": "image-2"/);

  const summaryRequest = frameFlowTrajectorySummaryRequest({
    brief: { id: "brief-1", subject: "椅子" },
    rounds: [
      {
        iteration: 1,
        prompt: { revision: 1, reason: "初稿", diff: { added: ["wood"] } },
        machineReviews: [
          {
            rating: 4,
            decision: "keep",
            comment: "保留",
            strengths: ["构图"],
            issues: [],
          },
        ],
      },
    ],
  } as FrameFlowTrajectorySummaryInput);
  assert.match(summaryRequest, /bestIteration 必须是上述真实 iteration 之一/);
  assert.match(summaryRequest, /"iteration": 1/);
});
