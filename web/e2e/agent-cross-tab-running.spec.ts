import { expect, test, type Page } from "@playwright/test";

const thread = { id: "thread-cross-tab", name: "跨标签长任务", preview: "", status: "active", createdAt: 1_788_001_000, updatedAt: 1_788_001_001 };
const readyConversation = { revision: 1, conversationId: "conversation-cross-tab", threadId: thread.id, status: "ready" as const, mcpStatuses: {} };
const runningConversation = { ...readyConversation, revision: 2, status: "running" as const };
const completedConversation = { ...readyConversation, revision: 3 };
const scope = { thread_id: thread.id, turn_id: "turn-cross-tab" };

test("第二标签在工具完成后打开时同步运行状态，并以本轮完成收束", async ({ browser }) => {
    const context = await browser.newContext();
    let settled = false;
    await context.addInitScript(() => {
        class MockEventSource {
            static instances: MockEventSource[] = [];
            private listeners = new Map<string, Array<(event: MessageEvent) => void>>();

            constructor() {
                MockEventSource.instances.push(this);
            }

            addEventListener(type: string, listener: (event: MessageEvent) => void) {
                this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
            }

            listenerCount(type: string) {
                return (this.listeners.get(type) || []).length;
            }

            close() {}

            emit(type: string, payload: unknown) {
                for (const listener of this.listeners.get(type) || []) listener({ data: JSON.stringify(payload) } as MessageEvent);
            }
        }

        Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
        Object.assign(window, { __agentEventSources: MockEventSource.instances });
    });
    await context.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const conversation = settled ? completedConversation : runningConversation;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: thread.id }, conversation, data: [thread] } });
            return;
        }
        if (path === "/agent/codex/threads/" + thread.id) {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: thread.id }, conversation, thread, messages: [], settledTurnIds: settled ? [scope.turn_id] : [], historyReady: true } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });

    const first = await context.newPage();
    await openAgentPanel(first);
    await emitRunningHello(first);
    await first.evaluate((eventScope) => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("agent_event", { type: "item.completed", ...eventScope, item: { id: "tool-finished", type: "mcp_tool_call", tool: "canvas_get_state" } });
    }, scope);
    await expectRunning(first);
    await first.getByRole("tab", { name: /日志/ }).click();
    await expect(first.getByText("工具完成", { exact: true })).toBeVisible();
    await expect(first.getByText("本轮完成", { exact: true })).toHaveCount(0);

    const second = await context.newPage();
    await openAgentPanel(second);
    await emitRunningHello(second);
    await expectRunning(second);
    await expect(second.getByRole("button", { name: "停止" })).toBeVisible();
    await expect(second.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" })).toHaveAttribute("contenteditable", "false");
    await expect(second.getByRole("button", { name: "发送" })).toHaveCount(0);

    settled = true;
    await Promise.all([emitCompleted(first), emitCompleted(second)]);
    await first.getByRole("tab", { name: /对话/ }).click();
    await expect(first.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" })).toHaveAttribute("contenteditable", "true");
    await expect(second.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" })).toHaveAttribute("contenteditable", "true");
    await expect(second.getByRole("button", { name: "发送" })).toBeEnabled();
    await first.getByRole("tab", { name: /日志/ }).click();
    await second.getByRole("tab", { name: /日志/ }).click();
    await expect(first.getByText("本轮完成", { exact: true })).toBeVisible();
    await expect(second.getByText("本轮完成", { exact: true })).toBeVisible();
    await context.close();
});

async function openAgentPanel(page: Page) {
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, activeThread }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-cross-tab-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: activeThread.id,
                conversation,
                prompt: "第二页不应发送",
                messages: [],
                eventLogs: [],
                threads: [activeThread],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation: readyConversation, activeThread: thread },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => {
        const sources = (window as typeof window & { __agentEventSources?: Array<{ listenerCount: (type: string) => number }> }).__agentEventSources;
        return Boolean(sources?.at(-1)?.listenerCount("hello"));
    });
}

async function emitRunningHello(page: Page) {
    await page.evaluate(
        ({ conversation, eventScope, activeThread }) => {
            const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
            source.emit("hello", {
                protocolVersion: 6,
                workspace: { activeThreadId: activeThread.id },
                conversation,
                codex: { busy: true, threadId: activeThread.id, turnId: eventScope.turn_id },
                pendingApprovals: [],
            });
        },
        { conversation: runningConversation, eventScope: scope, activeThread: thread },
    );
}

async function emitCompleted(page: Page) {
    await page.evaluate(
        ({ conversation, eventScope }) => {
            const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
            source.emit("conversation_changed", conversation);
            source.emit("agent_event", { type: "turn.completed", ...eventScope, status: "completed" });
            source.emit("codex_state", { busy: false, threadId: eventScope.thread_id, turnId: eventScope.turn_id });
        },
        { conversation: completedConversation, eventScope: scope },
    );
}

async function expectRunning(page: Page) {
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
                const state = useAgentStore.getState();
                return { activity: state.activity, waiting: state.waiting, sending: state.sending };
            }),
        )
        .toEqual({ activity: "Codex 正在运行", waiting: true, sending: false });
}
