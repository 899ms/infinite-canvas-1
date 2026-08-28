import { expect, test, type Page } from "@playwright/test";

const preparingConversation = {
    revision: 1,
    conversationId: "conversation-mcp",
    threadId: "",
    status: "preparing" as const,
    mcpStatuses: { "infinite-canvas": { status: "starting" as const } },
};
const warningConversation = {
    revision: 2,
    conversationId: "conversation-mcp",
    threadId: "thread-mcp",
    status: "warning" as const,
    mcpStatuses: {
        "infinite-canvas": { status: "ready" as const },
        notion: { status: "failed" as const, error: "Not signed in" },
    },
};

test("Agent MCP 初始化会阻断输入，可选服务失败后保留可发送对话", async ({ page }) => {
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
        await route.fulfill({ json: { ok: true, workspace: { activeThreadId: "" }, conversation: preparingConversation, data: [] } });
    });
    await openAgentPanel(page);
    await emitHello(page, preparingConversation);

    const input = page.getByRole("textbox", { name: "MCP 初始化中，完成后即可发送" });
    await expect(page.getByText("正在启动 MCP 服务", { exact: true })).toBeVisible();
    await expect(page.getByText("infinite-canvas", { exact: true })).toBeVisible();
    await expect(input).toHaveAttribute("contenteditable", "false");
    await expect(page.getByRole("button", { name: "发送" })).toBeDisabled();

    await page.evaluate((conversation) => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("conversation_changed", conversation);
    }, warningConversation);

    await expect(page.getByText("部分 MCP 服务初始化失败", { exact: true })).toBeVisible();
    await expect(page.getByText("notion", { exact: true })).toBeVisible();
    const readyInput = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await expect(readyInput).toHaveAttribute("contenteditable", "true");
    await readyInput.fill("可选 MCP 失败后仍可继续");
    await expect(page.getByRole("button", { name: "发送" })).toBeEnabled();
});

async function openAgentPanel(page: Page) {
    await page.goto("/");
    await page.evaluate(async (conversation) => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            url: "http://127.0.0.1:4173",
            token: "agent-mcp-initialization-token",
            connected: true,
            enabled: true,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "chat",
            activeThreadId: "",
            conversation,
            prompt: "",
            messages: [],
            eventLogs: [],
            threads: [],
            loadingThreads: false,
            sending: false,
            waiting: false,
        });
    }, preparingConversation);
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => Boolean((window as typeof window & { __agentEventSources?: unknown[] }).__agentEventSources?.length));
}

async function emitHello(page: Page, conversation: typeof preparingConversation) {
    await page.evaluate((state) => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("hello", { protocolVersion: 6, workspace: { activeThreadId: "" }, conversation: state, codex: { busy: false }, pendingApprovals: [] });
    }, conversation);
}
