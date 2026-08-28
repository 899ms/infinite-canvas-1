import { afterEach, expect, it, vi } from "vitest";

import { runSiteTool } from "./agent-site-tools";
import { useWorkbenchAgentStore } from "@/stores/use-workbench-agent-store";

const navigate = vi.fn();

afterEach(() => {
    navigate.mockReset();
    useWorkbenchAgentStore.setState({ imageCommand: null, videoCommand: null, tasks: [] });
});

it("工作台提交返回任务 ID，并可按任务或画布节点查询当前页面的生成状态", async () => {
    const image = (await runSiteTool("workbench_image_generate", { prompt: "隔离生图任务" }, navigate)) as { taskId?: string };
    const video = (await runSiteTool("workbench_video_generate", { prompt: "隔离视频任务" }, navigate)) as { taskId?: string };
    const queued = (await runSiteTool("workbench_image_generate", { prompt: "隔离排队任务" }, navigate)) as { taskId?: string };
    const failed = (await runSiteTool("workbench_video_generate", { prompt: "隔离失败任务" }, navigate)) as { taskId?: string };
    expect(image.taskId).toMatch(/^image-\d+$/);
    expect(video.taskId).toMatch(/^video-\d+$/);
    expect(queued.taskId).toMatch(/^image-\d+$/);
    expect(failed.taskId).toMatch(/^video-\d+$/);
    expect(navigate).toHaveBeenNthCalledWith(1, "/image");
    expect(navigate).toHaveBeenNthCalledWith(2, "/video");

    useWorkbenchAgentStore.getState().updateTask(image.taskId!, { status: "running" });
    useWorkbenchAgentStore.getState().updateTask(video.taskId!, { status: "succeeded", successCount: 1 });
    useWorkbenchAgentStore.getState().updateTask(failed.taskId!, { status: "failed", failCount: 1, error: "隔离失败原因" });

    const all = (await runSiteTool("generation_get_status", {}, navigate)) as { total: number; summary: Record<string, number> };
    expect(all).toMatchObject({ total: 4, summary: { queued: 1, running: 1, succeeded: 1, failed: 1 } });

    const byTask = (await runSiteTool("generation_get_status", { taskId: image.taskId }, navigate)) as { total: number; summary: Record<string, number>; tasks: Array<{ id: string; status: string; source: string }> };
    expect(byTask).toMatchObject({ total: 1, summary: { running: 1 }, tasks: [{ id: image.taskId, status: "running", source: "image" }] });

    const byCanvasNodes = (await runSiteTool("generation_get_status", { scope: "canvas", nodeIds: ["config-running"] }, navigate, {
        canvasSnapshot: {
            projectId: "active-canvas",
            title: "当前标签画布",
            nodes: [
                { id: "config-running", type: "config", title: "当前配置", position: { x: 0, y: 0 }, width: 320, height: 180, metadata: { status: "loading", generationMode: "image", prompt: "当前标签提示词" } },
                { id: "other-node", type: "config", title: "不应返回", position: { x: 360, y: 0 }, width: 320, height: 180, metadata: { status: "error", generationMode: "video" } },
            ],
            connections: [],
            selectedNodeIds: [],
            viewport: { x: 0, y: 0, k: 1 },
        },
    })) as { total: number; summary: Record<string, number>; tasks: Array<{ id: string; source: string; status: string; projectId?: string }> };
    expect(byCanvasNodes).toMatchObject({ total: 1, summary: { running: 1 }, tasks: [{ id: "config-running", source: "canvas", status: "running", projectId: "active-canvas" }] });
});
