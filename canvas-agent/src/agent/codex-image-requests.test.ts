import assert from "node:assert/strict";
import test from "node:test";

import {
    canvasImageRequest,
    interiorImageRequest,
    interiorPromptRequest,
    type CanvasImageInput,
    type InteriorImageInput,
    type InteriorPromptInput,
} from "./codex-image-requests.js";

test("图像请求构建器保留室内阶段、参考图与画布图片约束", () => {
    const whiteModel = interiorPromptRequest({ stage: "white-model", roomType: "客厅", style: "现代", requirements: "保留落地窗" } as InteriorPromptInput);
    assert.match(whiteModel, /纯白建筑白膜提示词/);
    assert.match(whiteModel, /空间类型：客厅/);
    assert.match(whiteModel, /附加要求：保留落地窗/);

    const walkthrough = interiorPromptRequest({ stage: "walkthrough", roomType: "书房" } as InteriorPromptInput);
    assert.match(walkthrough, /第一人称室内漫游视频提示词/);

    const designImage = interiorImageRequest({ stage: "design", roomType: "客厅", style: "日式", requirements: "暖光", prompt: "living room", count: 8 } as InteriorImageInput);
    assert.match(designImage, /生成 3 张独立候选图/);
    assert.match(designImage, /唯一空间参考图/);
    assert.match(designImage, /生成日式室内设计成品图/);

    const canvasImage = canvasImageRequest({ prompt: "a chair", count: 10, aspectRatio: "1:1", attachments: [{ id: "attachment-1" }] } as CanvasImageInput);
    assert.match(canvasImage, /生成 8 张独立图片/);
    assert.match(canvasImage, /目标画幅：1:1/);
    assert.match(canvasImage, /提供了 1 张参考图/);
    assert.match(canvasImage, /用户提示词：\na chair/);
});
