import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-attachment", threadId: "thread-attachment", status: "ready" as const, mcpStatuses: {} };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAIAAAAW4yFwAAAADElEQVR42mNk+M8AAAICAQB7CY+7AAAAAElFTkSuQmCC", "base64");

test("Agent 附件工具在发起画布持久化原比例图片节点并回传结果", async ({ page }) => {
    const toolResults: Array<Record<string, unknown>> = [];
    await page.addInitScript(
        ({ conversation }) => {
            type TestWindow = Window & { __emitAttachmentTool?: () => void; __emitAttachmentGraph?: () => void; __attachmentOps?: Array<Record<string, unknown>> };
            class TestEventSource extends EventTarget {
                close() {}

                constructor() {
                    super();
                    window.setTimeout(() => this.dispatchEvent(new MessageEvent("hello", { data: JSON.stringify({ protocolVersion: 6, conversation }) })), 0);
                    (window as TestWindow).__emitAttachmentTool = () =>
                        this.dispatchEvent(
                            new MessageEvent("tool_call", {
                                data: JSON.stringify({
                                    requestId: "attachment-tool-1",
                                    name: "canvas_create_attachment_nodes",
                                    input: {
                                        nodes: [
                                            {
                                                id: "image-attachment-1",
                                                attachmentId: "attachment-1",
                                                title: "商品参考.png",
                                                position: { x: 120, y: 80 },
                                            },
                                        ],
                                    },
                                }),
                            }),
                        );
                    (window as TestWindow).__emitAttachmentGraph = () =>
                        this.dispatchEvent(
                            new MessageEvent("tool_call", {
                                data: JSON.stringify({
                                    requestId: "attachment-graph-2",
                                    name: "canvas_apply_ops",
                                    input: {
                                        ops: [
                                            { type: "add_node", id: "analysis-text-1", nodeType: "text", title: "商品分析提示词", position: { x: 420, y: 80 }, metadata: { content: "提取商品卖点并生成电商主图提示词", status: "success" } },
                                            {
                                                type: "add_node",
                                                id: "image-config-1",
                                                nodeType: "config",
                                                title: "商品主图生成",
                                                position: { x: 760, y: 80 },
                                                metadata: { generationMode: "image", composerContent: "@[node:analysis-text-1]\n@[node:image-attachment-1]", status: "idle" },
                                            },
                                            { type: "connect_nodes", fromNodeId: "analysis-text-1", toNodeId: "image-config-1" },
                                            { type: "connect_nodes", fromNodeId: "image-attachment-1", toNodeId: "image-config-1" },
                                        ],
                                    },
                                }),
                            }),
                        );
                }
            }
            Object.defineProperty(window, "EventSource", { configurable: true, value: TestEventSource });
        },
        { conversation },
    );
    await page.route("http://127.0.0.1:4173/canvas/result**", async (route) => {
        toolResults.push(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({ json: { ok: true } });
    });
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/attachments/attachment-1") {
            await route.fulfill({ contentType: "image/png", body: png });
            return;
        }
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-attachment" }, conversation, data: [] } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation }) => {
            type TestWindow = Window & { __attachmentOps?: Array<Record<string, unknown>> };
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            const snapshot = { projectId: "canvas-attachment", nodes: [] as Array<Record<string, unknown>>, connections: [], selectedNodeIds: [], viewport: { x: 0, y: 0, k: 1 } };
            const ops: Array<Record<string, unknown>> = [];
            (window as TestWindow).__attachmentOps = ops;
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-attachment-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-attachment",
                conversation,
                messages: [],
                threads: [],
                eventLogs: [],
                pendingTool: null,
                loadingThreads: false,
                sending: false,
                waiting: false,
                confirmTools: false,
                canvasContext: {
                    snapshot,
                    applyOps: (nextOps: Array<Record<string, unknown>>) => {
                        ops.push(...nextOps);
                        return snapshot;
                    },
                    undoOps: () => null,
                    canUndo: false,
                },
            });
        },
        { conversation },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => typeof (window as Window & { __emitAttachmentTool?: () => void }).__emitAttachmentTool === "function");
    await page.evaluate(() => (window as Window & { __emitAttachmentTool?: () => void }).__emitAttachmentTool?.());
    await expect.poll(() => toolResults).toEqual([expect.objectContaining({ requestId: "attachment-tool-1", result: expect.any(Object) })]);
    await page.evaluate(() => (window as Window & { __emitAttachmentGraph?: () => void }).__emitAttachmentGraph?.());

    await expect.poll(() => toolResults).toEqual([expect.objectContaining({ requestId: "attachment-tool-1", result: expect.any(Object) }), expect.objectContaining({ requestId: "attachment-graph-2", result: expect.any(Object) })]);
    await expect
        .poll(() => page.evaluate(() => (window as Window & { __attachmentOps?: Array<Record<string, unknown>> }).__attachmentOps))
        .toEqual([
            expect.objectContaining({
                type: "add_node",
                id: "image-attachment-1",
                nodeType: "image",
                title: "商品参考.png",
                position: { x: 120, y: 80 },
                width: 1,
                height: 2,
                metadata: expect.objectContaining({
                    status: "success",
                    naturalWidth: 1,
                    naturalHeight: 2,
                    mimeType: "image/png",
                    storageKey: expect.stringMatching(/^image:/),
                }),
            }),
            expect.objectContaining({ type: "add_node", id: "analysis-text-1", nodeType: "text", title: "商品分析提示词", metadata: expect.objectContaining({ content: "提取商品卖点并生成电商主图提示词", status: "success" }) }),
            expect.objectContaining({
                type: "add_node",
                id: "image-config-1",
                nodeType: "config",
                title: "商品主图生成",
                metadata: expect.objectContaining({ generationMode: "image", composerContent: "@[node:analysis-text-1]\n@[node:image-attachment-1]", status: "idle" }),
            }),
            { type: "connect_nodes", fromNodeId: "analysis-text-1", toNodeId: "image-config-1" },
            { type: "connect_nodes", fromNodeId: "image-attachment-1", toNodeId: "image-config-1" },
        ]);
});
