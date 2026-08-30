import { expect, test, type Browser, type Page } from "@playwright/test";

const thread = { id: "thread-running-reconnect", name: "刷新后的长任务", preview: "", status: "active", createdAt: 1_788_100_000, updatedAt: 1_788_100_001 };
const runningConversation = { revision: 1, conversationId: "conversation-running-reconnect", threadId: thread.id, status: "running" as const, mcpStatuses: {} };
const completedConversation = { ...runningConversation, revision: 2, status: "ready" as const };
const scope = { thread_id: thread.id, turn_id: "turn-running-reconnect" };

test("刷新后第二页可接续长任务，首发页断开后仍以权威历史收束", async ({ browser }) => {
    const context = await createHarness(browser);
    let settled = false;
    await context.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const conversation = settled ? completedConversation : runningConversation;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: thread.id }, conversation, data: [thread] } });
            return;
        }
        if (path === `/agent/codex/threads/${thread.id}`) {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: thread.id },
                    conversation,
                    thread,
                    messages: settled
                        ? [
                              { id: "user-running-reconnect", itemId: "user-running-reconnect", threadId: thread.id, turnId: scope.turn_id, role: "user", text: "请继续执行长任务" },
                              { id: "assistant-running-reconnect", itemId: "assistant-running-reconnect", threadId: thread.id, turnId: scope.turn_id, role: "assistant", title: "Codex", text: "首发页断开后仍完成的权威回复。" },
                          ]
                        : [{ id: "user-running-reconnect", itemId: "user-running-reconnect", threadId: thread.id, turnId: scope.turn_id, role: "user", text: "请继续执行长任务" }],
                    settledTurnIds: settled ? [scope.turn_id] : [],
                    historyReady: true,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });

    const first = await context.newPage();
    await openAgent(first);
    await emitRunning(first);
    await first.evaluate((eventScope) => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("agent_event", { type: "item.updated", ...eventScope, item: { id: "assistant-running-reconnect", type: "agent_message", delta: "首发页流式片段" } });
    }, scope);
    await expect(first.getByText("首发页流式片段", { exact: true })).toBeVisible();

    const second = await context.newPage();
    await openAgent(second);
    await emitRunning(second);
    await expectRunning(second);

    await second.reload();
    await openAgent(second, { navigate: false });
    await emitRunning(second);
    await expectRunning(second);
    await first.close();

    settled = true;
    await second.evaluate(
        ({ conversation, eventScope }) => {
            const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
            source.emit("conversation_changed", conversation);
            source.emit("agent_event", { type: "turn.completed", ...eventScope, status: "completed" });
            source.emit("codex_state", { busy: false, threadId: eventScope.thread_id, turnId: eventScope.turn_id });
        },
        { conversation: completedConversation, eventScope: scope },
    );
    await expect(second.getByText("首发页断开后仍完成的权威回复。", { exact: true })).toBeVisible();
    await expect(second.getByText("首发页断开后仍完成的权威回复。", { exact: true })).toHaveCount(1);
    await expect(second.getByText("首发页流式片段", { exact: true })).toHaveCount(0);
    const prompt = second.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await expect(prompt).toHaveAttribute("contenteditable", "true");
    await prompt.fill("重连后继续提问");
    await expect(second.getByRole("button", { name: "发送" })).toBeEnabled();
    await context.close();
});

async function createHarness(browser: Browser) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "agent-running-reconnect-token");
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
    return context;
}

async function openAgent(page: Page, options: { navigate?: boolean } = {}) {
    if (options.navigate !== false) await page.goto("/");
    await page.evaluate(
        async ({ conversation, activeThread }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-running-reconnect-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: activeThread.id,
                conversation,
                prompt: "",
                messages: [],
                eventLogs: [],
                threads: [activeThread],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation: runningConversation, activeThread: thread },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => Boolean((window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources?.length));
}

async function emitRunning(page: Page) {
    await page.evaluate(
        ({ conversation, eventScope, activeThread }) => {
            const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
            source.emit("hello", { protocolVersion: 6, workspace: { activeThreadId: activeThread.id }, conversation, codex: { busy: true, threadId: activeThread.id, turnId: eventScope.turn_id }, pendingApprovals: [] });
        },
        { conversation: runningConversation, eventScope: scope, activeThread: thread },
    );
}

async function expectRunning(page: Page) {
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
                const state = useAgentStore.getState();
                return { waiting: state.waiting, activeTurnId: state.activeTurnId };
            }),
        )
        .toEqual({ waiting: true, activeTurnId: scope.turn_id });
}
