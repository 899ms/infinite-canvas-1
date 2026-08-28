import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-process-live", threadId: "thread-process-live", status: "ready" as const, mcpStatuses: {} };
const thread = { id: "thread-process-live", name: "实时过程", preview: "", status: "idle", createdAt: 1_788_000_300, updatedAt: 1_788_000_301 };
const scope = { threadId: "thread-process-live", turnId: "turn-process-live" };
const history = [
    { id: "reasoning-1", itemId: "reasoning-1", ...scope, role: "tool" as const, title: "思考摘要", text: "先**分析**\n\n- 查找需求\n\n`query`", detail: { kind: "reasoning", status: "completed" } },
    {
        id: "command-1",
        itemId: "command-1",
        ...scope,
        role: "tool" as const,
        title: "执行命令",
        text: "pnpm test",
        detail: {
            kind: "command",
            status: "completed",
            rows: [
                { label: "工作目录", value: "F:/isolated/workspace" },
                { label: "耗时", value: "1.2 秒" },
                { label: "退出状态", value: "0" },
            ],
            output: "全部通过",
        },
    },
    { id: "file-1", itemId: "file-1", ...scope, role: "tool" as const, title: "修改文件", text: "已修改 1 个文件：src/demo.ts", detail: { kind: "file", status: "completed", files: [{ path: "src/demo.ts", action: "修改" }] } },
    { id: "search-1", itemId: "search-1", ...scope, role: "tool" as const, title: "搜索资料", text: "搜索：FrameFlow", detail: { kind: "search", status: "completed", rows: [{ label: "关键词", value: "FrameFlow" }] } },
    { id: "canvas-1", itemId: "canvas-1", ...scope, role: "tool" as const, title: "画布操作", text: "已完成", detail: { kind: "tool", status: "completed", rows: [{ label: "操作内容", value: "调整视口" }] } },
    {
        id: "plan-1",
        itemId: "plan-1",
        ...scope,
        role: "tool" as const,
        title: "任务进度",
        text: "已完成 2/2 项",
        detail: {
            kind: "todo",
            status: "completed",
            tasks: [
                { step: "读取需求", status: "completed" },
                { step: "执行验证", status: "completed" },
            ],
            explanation: "按步骤完成",
        },
    },
];

test("实时过程事件保持中文时间线，并在完成后从历史恢复", async ({ page }) => {
    let settled = false;
    await page.addInitScript(() => {
        class MockEventSource {
            static instances: MockEventSource[] = [];
            private listeners = new Map<string, Array<(event: MessageEvent) => void>>();
            constructor() {
                MockEventSource.instances.push(this);
            }
            addEventListener(type: string, listener: (event: MessageEvent) => void) {
                this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
            }
            close() {}
            emit(type: string, payload: unknown) {
                for (const listener of this.listeners.get(type) || []) listener({ data: JSON.stringify(payload) } as MessageEvent);
            }
        }
        Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
        Object.assign(window, { __agentEventSources: MockEventSource.instances });
    });
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: scope.threadId }, conversation, data: [thread] } });
            return;
        }
        if (path === `/agent/codex/threads/${scope.threadId}`) {
            await route.fulfill({
                json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: scope.threadId }, conversation, thread, messages: settled ? history : [], settledTurnIds: settled ? [scope.turnId] : [], historyReady: true },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, scope, thread }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-process-live-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: scope.threadId,
                conversation,
                messages: [],
                threads: [thread],
                loadingThreads: false,
                sending: true,
                waiting: true,
                activeTurnId: scope.turnId,
            });
        },
        { conversation, scope, thread },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => Array.isArray((window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources) && (window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources!.length > 0);
    await page.evaluate(
        async ({ conversation, scope }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({ conversation, messages: [], loadingThreads: false, sending: true, waiting: true, activeTurnId: scope.turnId });
        },
        { conversation, scope },
    );
    await page.evaluate((scope) => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        const eventScope = { thread_id: scope.threadId, turn_id: scope.turnId };
        source.emit("agent_event", { type: "turn.started", ...eventScope });
        source.emit("agent_event", { type: "item.started", ...eventScope, item: { id: "reasoning-1", type: "reasoning", summary: "先**分析**\n\n- 查找需求\n\n`query`" } });
        source.emit("agent_event", { type: "item.completed", ...eventScope, item: { id: "reasoning-1", type: "reasoning", summary: "已完成分析" } });
        source.emit("agent_event", {
            type: "plan.updated",
            ...eventScope,
            plan: [
                { step: "读取需求", status: "completed" },
                { step: "执行验证", status: "inProgress" },
            ],
            explanation: "按步骤完成",
        });
        source.emit("agent_event", { type: "item.completed", ...eventScope, item: { id: "command-1", type: "command_execution", command: "pnpm test", cwd: "F:/isolated/workspace", exitCode: 0, durationMs: 1200, aggregatedOutput: "全部通过" } });
        source.emit("agent_event", { type: "item.completed", ...eventScope, item: { id: "file-1", type: "file_change", changes: [{ path: "src/demo.ts", kind: "edit" }] } });
        source.emit("agent_event", { type: "item.completed", ...eventScope, item: { id: "search-1", type: "web_search", action: { type: "search", query: "FrameFlow" } } });
        source.emit("agent_event", { type: "item.completed", ...eventScope, item: { id: "canvas-1", type: "mcp_tool_call", tool: "canvas_apply_ops", arguments: { ops: [{ type: "set_viewport", viewport: { x: 0, y: 0, zoom: 1 } }] } } });
    }, scope);
    await expect(page.getByText("思考摘要", { exact: true })).toBeVisible();
    await expect(page.getByText("任务进度", { exact: true })).toBeVisible();
    await expect(page.getByText("1/2", { exact: true })).toBeVisible();
    await expect(page.getByText("已执行 1 条命令", { exact: true })).toBeVisible();
    await expect(page.getByTitle("pnpm test")).toBeVisible();
    await expect(page.getByText("修改文件", { exact: true })).toBeVisible();
    await expect(page.getByText("搜索资料", { exact: true })).toBeVisible();
    await expect(page.getByText("画布操作", { exact: true })).toBeVisible();
    await expect(page.getByText("canvas_apply_ops", { exact: false })).toHaveCount(0);
    await page.getByText("思考摘要", { exact: true }).click();
    await expect(page.getByText("查找需求", { exact: true })).toBeVisible();
    await expect(page.getByText("已完成分析", { exact: true })).toHaveCount(0);

    await page.evaluate((scope) => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("agent_event", {
            type: "plan.updated",
            thread_id: scope.threadId,
            turn_id: scope.turnId,
            plan: [
                { step: "读取需求", status: "completed" },
                { step: "执行验证", status: "completed" },
            ],
            explanation: "按步骤完成",
        });
    }, scope);
    await expect(page.getByText("2/2", { exact: true })).toBeVisible();
    await expect(page.getByText("任务进度", { exact: true })).toHaveCount(1);

    settled = true;
    await page.evaluate((scope) => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("agent_event", { type: "turn.completed", thread_id: scope.threadId, turn_id: scope.turnId, status: "completed" });
        source.emit("codex_state", { busy: false, threadId: scope.threadId, turnId: scope.turnId });
    }, scope);
    await expect(page.getByText("2/2", { exact: true })).toBeVisible();
    await expect(page.getByText("已修改 1 个文件：src/demo.ts", { exact: true })).toBeVisible();
    await expect(page.getByText("搜索：FrameFlow", { exact: true })).toBeVisible();
});
