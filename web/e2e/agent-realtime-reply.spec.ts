import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-realtime", threadId: "thread-realtime", status: "ready" as const, mcpStatuses: {} };
const thread = { id: "thread-realtime", name: "实时回复", preview: "", status: "idle", createdAt: 1_788_000_000, updatedAt: 1_788_000_001 };

test("Agent 流式回复在完成事件后自动同步完整历史", async ({ page }) => {
    let completeHistory = false;
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
        if (path === "/agent/codex/turn") {
            await route.fulfill({ json: { ok: true, threadId: "thread-realtime" } });
            return;
        }
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-realtime" }, conversation, data: [thread] } });
            return;
        }
        if (path === "/agent/codex/threads/thread-realtime") {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-realtime" },
                    conversation,
                    thread,
                    messages: completeHistory
                        ? [
                              { id: "user-realtime", itemId: "user-realtime", threadId: "thread-realtime", turnId: "turn-realtime", role: "user", text: "请完整同步回复" },
                              { id: "assistant-realtime", itemId: "assistant-realtime", threadId: "thread-realtime", turnId: "turn-realtime", role: "assistant", title: "Codex", text: "这是一条完整同步回复。" },
                          ]
                        : [],
                    settledTurnIds: completeHistory ? ["turn-realtime"] : [],
                    historyReady: completeHistory,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, thread }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-realtime-reply-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-realtime",
                conversation,
                messages: [],
                threads: [thread],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation, thread },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => Array.isArray((window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources) && (window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources!.length > 0);
    await page.evaluate(
        async ({ conversation }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({ conversation, loadingThreads: false });
        },
        { conversation },
    );

    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await prompt.fill("请完整同步回复");
    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByText("请完整同步回复", { exact: true })).toBeVisible();
    await expect(page.getByText(/正在思考/)).toBeVisible();

    await page.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        const scope = { thread_id: "thread-realtime", turn_id: "turn-realtime" };
        source.emit("agent_event", { type: "turn.started", ...scope });
        source.emit("agent_event", { type: "item.updated", ...scope, item: { id: "assistant-realtime", type: "agent_message", delta: "流式片段" } });
    });
    await expect(page.getByText("流式片段", { exact: true })).toBeVisible();

    completeHistory = true;
    await page.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        const scope = { thread_id: "thread-realtime", turn_id: "turn-realtime" };
        source.emit("agent_event", { type: "turn.completed", ...scope, status: "completed" });
        source.emit("codex_state", { busy: false, threadId: "thread-realtime", turnId: "turn-realtime" });
    });
    await expect(page.getByText("这是一条完整同步回复。", { exact: true })).toBeVisible();
    await expect(page.getByText("流式片段", { exact: true })).toHaveCount(0);

    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({ messages: [], eventLogs: [], sending: true, waiting: true, activeTurnId: "turn-failure" });
    });
    await page.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("agent_error", { type: "error", thread_id: "thread-realtime", turn_id: "turn-failure", message: "selected model is at capacity" });
        source.emit("codex_state", { busy: false, threadId: "thread-realtime", turnId: "turn-failure" });
    });
    await expect(page.getByText("当前选择的模型请求量过大，暂时无法处理。请稍后重试，或切换其他模型后再试。", { exact: true })).toBeVisible();
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
                const state = useAgentStore.getState();
                return { sending: state.sending, waiting: state.waiting, logs: state.eventLogs.map((item) => item.title) };
            }),
        )
        .toEqual({ sending: false, waiting: false, logs: ["处理失败"] });
});
