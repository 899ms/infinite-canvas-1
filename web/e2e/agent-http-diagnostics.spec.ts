import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-http-log", threadId: "thread-http-log", status: "ready" as const, mcpStatuses: {} };

test("普通 Agent 消息只保留精简生命周期日志和完成用量", async ({ page }) => {
    const turnRequests: Array<Record<string, unknown>> = [];
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
            turnRequests.push(route.request().postDataJSON() as Record<string, unknown>);
            await route.fulfill({ json: { ok: true, threadId: "thread-http-log" } });
            return;
        }
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-http-log" }, conversation, data: [] } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-http-diagnostics-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-http-log",
                conversation,
                messages: [],
                eventLogs: [],
                threads: [],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => Array.isArray((window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources) && (window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources!.length > 0);

    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await prompt.fill("验证精简诊断日志");
    await page.getByRole("button", { name: "发送" }).click();
    await expect.poll(() => turnRequests.length).toBe(1);

    await page.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        const scope = { thread_id: "thread-http-log", turn_id: "turn-http-log" };
        source.emit("agent_event", { type: "thread.started", ...scope });
        source.emit("agent_event", { type: "turn.started", ...scope });
        source.emit("agent_event", { type: "item.updated", ...scope, item: { id: "message-1", type: "agent_message", delta: "流式摘要不应进入日志" } });
        source.emit("agent_event", { type: "item.completed", ...scope, item: { id: "message-1", type: "agent_message", text: "已收到完整回复" } });
        source.emit("agent_event", { type: "usage.updated", ...scope, usage: { input_tokens: 1200, cached_input_tokens: 300, output_tokens: 45 } });
        source.emit("agent_event", { type: "turn.completed", ...scope, status: "completed", duration_ms: 1250, usage: { input_tokens: 1200, cached_input_tokens: 300, output_tokens: 45 } });
    });

    await page.getByRole("tab", { name: /日志/ }).click();
    await expect(page.getByText("验证精简诊断日志", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("开始处理", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("已收到完整回复", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("1.3 秒 · 输入 1,200 · 缓存 300 · 输出 45", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("thread-http-log", { exact: false })).toHaveCount(0);
    await expect(page.getByText("流式摘要不应进入日志", { exact: true })).toHaveCount(0);
});
