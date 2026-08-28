import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-streaming", threadId: "thread-streaming", status: "ready" as const, mcpStatuses: {} };
const thread = { id: "thread-streaming", name: "长回复", preview: "", status: "idle", createdAt: 1_788_000_100, updatedAt: 1_788_000_101 };
const history = Array.from({ length: 80 }, (_, index) => ({
    id: `history-${index}`,
    itemId: `history-${index}`,
    threadId: "thread-streaming",
    turnId: `turn-history-${index}`,
    role: "assistant" as const,
    title: "Codex",
    text: `历史消息 ${String(index + 1).padStart(3, "0")}`,
}));

test("长回复只更新当前流式消息，历史行保持内容隔离且不轮询健康检查", async ({ page }) => {
    let healthRequests = 0;
    let completeHistory = false;
    page.on("request", (request) => {
        if (new URL(request.url()).pathname === "/health") healthRequests += 1;
    });
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
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-streaming" }, conversation, data: [thread] } });
            return;
        }
        if (path === "/agent/codex/threads/thread-streaming") {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-streaming" },
                    conversation,
                    thread,
                    messages: completeHistory ? [...history, { id: "message-streaming", itemId: "message-streaming", threadId: "thread-streaming", turnId: "turn-streaming", role: "assistant", title: "Codex", text: "完整长回复" }] : history,
                    settledTurnIds: completeHistory ? ["turn-streaming"] : [],
                    historyReady: true,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, history, thread }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-streaming-performance-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-streaming",
                conversation,
                messages: history,
                threads: [thread],
                loadingThreads: false,
                sending: true,
                waiting: true,
                activeTurnId: "turn-streaming",
            });
        },
        { conversation, history, thread },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => Array.isArray((window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources) && (window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources!.length > 0);
    await page.evaluate(
        async ({ conversation, history }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({ conversation, messages: history, loadingThreads: false, sending: true, waiting: true, activeTurnId: "turn-streaming" });
        },
        { conversation, history },
    );
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('[style*="content-visibility: auto"]').length)).toBe(history.length);

    await page.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        const scope = { thread_id: "thread-streaming", turn_id: "turn-streaming" };
        for (let index = 0; index < 120; index += 1) {
            source.emit("agent_event", { type: "item.updated", ...scope, item: { id: "message-streaming", type: "agent_message", delta: `片段${index + 1} ` } });
        }
    });
    await expect(page.getByText("片段120", { exact: false })).toBeVisible();
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
                const messages = useAgentStore.getState().messages;
                return { total: messages.length, streaming: messages.filter((item) => item.streamId).map((item) => item.id) };
            }),
        )
        .toEqual({ total: history.length + 1, streaming: ["thread-streaming:turn-streaming:message-streaming"] });
    const timeline = page.locator("div.thin-scrollbar.h-full.select-text.overflow-y-auto");
    await expect.poll(() => timeline.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await timeline.evaluate((element) => {
        element.scrollTop = 0;
        element.dispatchEvent(new Event("scroll"));
    });
    await page.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("agent_event", { type: "item.updated", thread_id: "thread-streaming", turn_id: "turn-streaming", item: { id: "message-streaming", type: "agent_message", delta: "继续流式更新" } });
    });
    await expect(page.getByText("继续流式更新", { exact: false })).toBeVisible();
    await expect.poll(() => timeline.evaluate((element) => element.scrollTop)).toBe(0);
    completeHistory = true;
    await page.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        const scope = { thread_id: "thread-streaming", turn_id: "turn-streaming" };
        source.emit("agent_event", { type: "turn.completed", ...scope, status: "completed" });
        source.emit("codex_state", { busy: false, threadId: "thread-streaming", turnId: "turn-streaming" });
    });
    await expect(page.getByText("完整长回复", { exact: true })).toBeVisible();
    await expect.poll(() => healthRequests).toBe(0);
});
