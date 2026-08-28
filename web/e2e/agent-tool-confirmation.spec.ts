import { expect, test, type Page } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-tools", threadId: "thread-tools", status: "ready" as const, mcpStatuses: {} };

async function openReadyAgent(page: Page, requestId: string, withCanvasContext = false) {
    const toolResults: Array<Record<string, unknown>> = [];
    await page.addInitScript(
        ({ conversation, requestId }) => {
            type TestWindow = Window & { __emitCanvasWriteTool?: () => void };
            class TestEventSource extends EventTarget {
                close() {}
                constructor() {
                    super();
                    window.setTimeout(() => this.dispatchEvent(new MessageEvent("hello", { data: JSON.stringify({ protocolVersion: 6, conversation }) })), 0);
                    (window as TestWindow).__emitCanvasWriteTool = () => this.dispatchEvent(new MessageEvent("tool_call", { data: JSON.stringify({ requestId, name: "canvas_apply_ops", input: { ops: [] } }) }));
                }
            }
            Object.defineProperty(window, "EventSource", { configurable: true, value: TestEventSource });
        },
        { conversation, requestId },
    );
    await page.route("http://127.0.0.1:4173/canvas/result**", async (route) => {
        toolResults.push(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({ json: { ok: true } });
    });
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-tools" }, conversation, data: [] } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, withCanvasContext }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            const snapshot = { nodes: [], connections: [], viewport: { x: 0, y: 0, zoom: 1 } };
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-tool-confirmation-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-tools",
                conversation,
                messages: [],
                threads: [],
                eventLogs: [],
                pendingTool: null,
                loadingThreads: false,
                sending: false,
                waiting: false,
                confirmTools: false,
                canvasContext: withCanvasContext ? { snapshot, applyOps: () => snapshot, undoOps: () => null, canUndo: false } : null,
            });
        },
        { conversation, withCanvasContext },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" })).toBeVisible();
    return toolResults;
}

test("默认自动确认时画布写入工具立即回传结果", async ({ page }) => {
    const toolResults = await openReadyAgent(page, "tool-auto", true);
    await expect(page.getByRole("button", { name: "选择工具确认模式，当前为 自动确认" })).toBeVisible();
    await page.waitForFunction(() => typeof (window as Window & { __emitCanvasWriteTool?: () => void }).__emitCanvasWriteTool === "function");
    await page.evaluate(() => (window as Window & { __emitCanvasWriteTool?: () => void }).__emitCanvasWriteTool?.());

    await expect.poll(() => toolResults).toEqual([expect.objectContaining({ requestId: "tool-auto", result: expect.any(Object) })]);
    await expect(page.getByText("等待确认", { exact: true })).toHaveCount(0);
});

test("手动确认时画布写入工具显示等待确认并可拒绝", async ({ page }) => {
    const toolResults = await openReadyAgent(page, "tool-manual");
    const toolMode = page.getByRole("button", { name: "选择工具确认模式，当前为 自动确认" });
    await toolMode.click();
    await page.getByText("手动确认", { exact: true }).click();
    await expect(page.getByRole("button", { name: "选择工具确认模式，当前为 手动确认" })).toBeVisible();
    await page.waitForFunction(() => typeof (window as Window & { __emitCanvasWriteTool?: () => void }).__emitCanvasWriteTool === "function");
    await page.evaluate(() => (window as Window & { __emitCanvasWriteTool?: () => void }).__emitCanvasWriteTool?.());

    await expect(page.getByText("等待确认", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "拒绝执行" }).click();
    await expect.poll(() => toolResults).toEqual([expect.objectContaining({ requestId: "tool-manual", error: "用户取消了画布工具调用" })]);
    await expect(page.getByText("等待确认", { exact: true })).toHaveCount(0);
});
