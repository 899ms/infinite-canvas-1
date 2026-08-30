import { describe, expect, it } from "vitest";

import { buildAgentBootstrapView } from "./agent-bootstrap-view";

const translate = (key: string, options?: Record<string, unknown>) => `${key}:${options?.name || options?.count || ""}`;
const conversation = (status: "idle" | "preparing" | "ready" | "warning" | "running" | "failed", mcpStatuses: Record<string, { status: "starting" | "ready" | "failed" | "cancelled"; error?: string | null }> = {}) => ({
    revision: 1,
    conversationId: "conversation",
    threadId: "thread",
    status,
    mcpStatuses,
});

describe("buildAgentBootstrapView", () => {
    it("启动时汇总 MCP 服务并显示待就绪数量", () => {
        const view = buildAgentBootstrapView(conversation("preparing", { "infinite-canvas": { status: "starting" }, codex_apps: { status: "ready" } }), translate);

        expect(view.bootstrapStatus).toEqual({ key: "mcp:starting", text: "mcpServicesStarting:", detail: "toolServicesPending:1", status: "running" });
        expect(view.mcpStartupStatuses).toMatchObject({
            "infinite-canvas": { key: "mcp:infinite-canvas:starting", text: "mcpStarting:infinite-canvas", status: "running" },
            codex_apps: { key: "mcp:codex_apps:ready", text: "mcpReadyNamed:codex_apps", status: "ready" },
        });
    });

    it("警告、失败与就绪会形成可渲染的终态", () => {
        expect(buildAgentBootstrapView(conversation("warning", { notion: { status: "failed", error: "连接失败" } }), translate).bootstrapStatus).toEqual({ key: "mcp:warning", text: "someMcpFailed:", detail: "remainingToolsReady:", status: "error" });
        expect(buildAgentBootstrapView({ ...conversation("failed"), error: "启动失败" }, translate).bootstrapStatus).toEqual({ key: "codex:prepare_failed", text: "conversationInitFailed:", detail: "启动失败", status: "error" });
        expect(buildAgentBootstrapView(conversation("ready", { codex_apps: { status: "ready" } }), translate).bootstrapStatus).toEqual({ key: "mcp:ready", text: "mcpServicesReady:1", detail: "toolsReady:", status: "ready" });
    });

    it("运行中不会遗留启动状态", () => {
        expect(buildAgentBootstrapView(conversation("running", { codex_apps: { status: "ready" } }), translate).bootstrapStatus).toBeNull();
    });
});
