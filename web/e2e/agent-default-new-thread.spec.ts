import { expect, test } from "@playwright/test";

const idleConversation = { revision: 1, conversationId: "conversation-empty", threadId: "", status: "idle" as const, mcpStatuses: {} };

test("连接 Agent 后保持空对话，并在首条发送时才创建线程", async ({ page }) => {
    let resetRequests = 0;
    const turnRequests: Array<Record<string, unknown>> = [];
    await page.addInitScript(
        ({ conversation }) => {
            class MockEventSource extends EventTarget {
                constructor() {
                    super();
                    window.setTimeout(() => this.dispatchEvent(new MessageEvent("hello", { data: JSON.stringify({ protocolVersion: 6, conversation }) })), 0);
                }

                close() {}
            }
            Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
        },
        { conversation: idleConversation },
    );
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads/reset") {
            resetRequests += 1;
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "draft-thread" }, conversation: { ...idleConversation, threadId: "draft-thread", status: "ready" } } });
            return;
        }
        if (path === "/agent/codex/threads") {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "" },
                    conversation: idleConversation,
                    data: [{ id: "old-thread", name: "旧对话", preview: "不应自动恢复", status: "idle", createdAt: 1_788_003_000, updatedAt: 1_788_003_001 }],
                },
            });
            return;
        }
        if (path === "/agent/codex/turn") {
            turnRequests.push(route.request().postDataJSON() as Record<string, unknown>);
            await route.fulfill({ json: { ok: true, threadId: "first-thread" } });
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
                token: "agent-default-thread-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "",
                conversation,
                messages: [],
                threads: [],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation: idleConversation },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();

    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await expect(prompt).toHaveAttribute("contenteditable", "true");
    await expect.poll(() => resetRequests).toBe(0);
    await expect(page.getByText("不应自动恢复", { exact: true })).toHaveCount(0);
    await prompt.fill("第一条消息才建线程");
    await page.getByRole("button", { name: "发送" }).click();
    await expect.poll(() => turnRequests).toEqual([expect.objectContaining({ threadId: "", prompt: "第一条消息才建线程" })]);
});
