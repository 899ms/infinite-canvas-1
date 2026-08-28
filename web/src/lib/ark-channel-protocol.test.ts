import { afterEach, describe, expect, it, vi } from "vitest";

const axiosMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("axios", () => ({ default: { get: axiosMocks.get, post: axiosMocks.post, isCancel: () => false } }));

import { isSeedanceVideoConfig, normalizeSeedanceResolution, seedanceVideoReferenceError, SEEDANCE_REFERENCE_LIMITS } from "@/lib/seedance-video";
import { createModelChannel, defaultBaseUrlForApiFormat, defaultConfig, encodeChannelModel } from "@/stores/use-config-store";
import { requestEdit } from "@/services/api/image";
import { createVideoGenerationTask, pollVideoGenerationTask } from "@/services/api/video";

afterEach(() => vi.clearAllMocks());

function arkConfig(imageModel = "任意生图模型", videoModel = "任意视频模型") {
    const channel = createModelChannel({ id: "ark", apiFormat: "ark", apiKey: "ark-key", models: [{ name: imageModel, capability: "image" }, { name: videoModel, capability: "video" }] });
    return { ...defaultConfig, channels: [channel], model: encodeChannelModel(channel.id, imageModel), imageModel: encodeChannelModel(channel.id, imageModel), videoModel: encodeChannelModel(channel.id, videoModel), apiKey: "", baseUrl: "" };
}

describe("火山方舟渠道协议", () => {
    it("选择方舟协议时使用方舟默认地址，且不依赖模型名称", () => {
        const channel = createModelChannel({ apiFormat: "ark", models: [{ name: "任意生图模型", capability: "image" }, { name: "任意视频模型", capability: "video" }] });
        const config = { ...defaultConfig, channels: [channel], model: encodeChannelModel(channel.id, "任意视频模型"), videoModel: encodeChannelModel(channel.id, "任意视频模型") };

        expect(channel.baseUrl).toBe(defaultBaseUrlForApiFormat("ark"));
        expect(isSeedanceVideoConfig(config)).toBe(true);
    });

    it("允许任意名称模型使用 1080p，并保持官方参考视频边界", () => {
        expect(normalizeSeedanceResolution("1080p-fast")).toBe("720p");
        expect(normalizeSeedanceResolution("1080p")).toBe("1080p");
        expect(SEEDANCE_REFERENCE_LIMITS.videoMaxBytes).toBe(200 * 1024 * 1024);
        expect(seedanceVideoReferenceError([{ id: "video", name: "reference.mp4", type: "video/mp4", url: "https://example.test/video.mp4", bytes: 200 * 1024 * 1024, width: 1280, height: 720, durationMs: 15000 }])).toBe("");
        expect(seedanceVideoReferenceError([{ id: "too-many-pixels", name: "reference.mp4", type: "video/mp4", url: "https://example.test/video.mp4", width: 3840, height: 2161 }])).toContain("像素");
    });

    it("任意名称生图模型按方舟 JSON 格式提交参考图", async () => {
        axiosMocks.post.mockResolvedValue({ data: { data: [{ b64_json: "aGVsbG8=" }] } });
        const config = arkConfig();

        await expect(requestEdit(config, "测试", [{ id: "ref", name: "ref.png", type: "image/png", dataUrl: "data:image/png;base64,aGVsbG8=" }])).resolves.toHaveLength(1);

        expect(axiosMocks.post).toHaveBeenCalledWith(
            "https://ark.cn-beijing.volces.com/api/v3/images/generations",
            expect.objectContaining({ model: "任意生图模型", image: ["data:image/png;base64,aGVsbG8="] }),
            expect.objectContaining({ headers: expect.objectContaining({ "Content-Type": "application/json" }) }),
        );
    });

    it("任意名称视频模型按方舟任务格式创建并查询", async () => {
        axiosMocks.post.mockResolvedValue({ data: { id: "task-1", status: "queued" } });
        axiosMocks.get.mockResolvedValue({ data: { id: "task-1", status: "running" } });
        const config = { ...arkConfig(), model: "ark::任意视频模型" };

        const task = await createVideoGenerationTask(config, "测试视频");
        await expect(pollVideoGenerationTask(config, task)).resolves.toEqual({ status: "pending" });

        expect(axiosMocks.post).toHaveBeenCalledWith(
            "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
            expect.objectContaining({ model: "任意视频模型", resolution: "720p" }),
            expect.anything(),
        );
        expect(axiosMocks.get).toHaveBeenCalledWith("https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/task-1", expect.anything());
    });
});
