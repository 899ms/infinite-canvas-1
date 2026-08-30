import { expect, test } from "@playwright/test";

test("Agent 新对话立即清空旧消息，并将首次发送绑定到新会话", async ({ page }) => {
    const oldConversation = { revision: 1, conversationId: "conversation-old", threadId: "thread-old", status: "ready" as const, mcpStatuses: {} };
    const newConversation = { revision: 2, conversationId: "conversation-new", threadId: "thread-new", status: "ready" as const, mcpStatuses: {} };
    const oldThread = { id: "thread-old", name: "已有会话", preview: "旧会话消息", status: "idle", createdAt: 1_788_000_000, updatedAt: 1_788_000_001 };
    let allowReset: () => void;
    const resetAllowed = new Promise<void>((resolve) => {
        allowReset = resolve;
    });
    let markResetRequested: () => void;
    const resetRequested = new Promise<void>((resolve) => {
        markResetRequested = resolve;
    });
    const turnRequests: Array<Record<string, unknown>> = [];

    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads/reset") {
            markResetRequested();
            await resetAllowed;
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-new" }, conversation: newConversation } });
            return;
        }
        if (path === "/agent/codex/turn") {
            turnRequests.push(route.request().postDataJSON() as Record<string, unknown>);
            await route.fulfill({ json: { ok: true, threadId: "thread-new" } });
            return;
        }
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-old" }, conversation: oldConversation, data: [oldThread] } });
            return;
        }
        if (path === "/agent/codex/threads/thread-old") {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-old" },
                    conversation: oldConversation,
                    thread: oldThread,
                    messages: [{ id: "message-old", itemId: "message-old", threadId: "thread-old", turnId: "turn-old", role: "assistant", title: "Codex", text: "旧会话消息" }],
                    settledTurnIds: ["turn-old"],
                    historyReady: true,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });

    await page.goto("/");
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            url: "http://127.0.0.1:4173",
            token: "agent-new-thread-token",
            connected: true,
            enabled: false,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "chat",
            activeThreadId: "thread-old",
            conversation: { revision: 1, conversationId: "conversation-old", threadId: "thread-old", status: "ready", mcpStatuses: {} },
            messages: [{ id: "message-old", itemId: "message-old", threadId: "thread-old", turnId: "turn-old", role: "assistant", title: "Codex", text: "旧会话消息" }],
            threads: [{ id: "thread-old", name: "已有会话", preview: "旧会话消息", status: "idle", createdAt: 1_788_000_000, updatedAt: 1_788_000_001 }],
            loadingThreads: false,
            sending: false,
            waiting: false,
        });
    });
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByText("旧会话消息", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "新对话" }).click();
    await resetRequested;
    await expect(page.getByText("旧会话消息", { exact: true })).toHaveCount(0);

    allowReset();
    await expect.poll(async () => await page.evaluate(async () => (await import("/src/stores/use-agent-store.ts")).useAgentStore.getState().activeThreadId)).toBe("thread-new");
    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await prompt.fill("只发送到新会话");
    await page.getByRole("button", { name: "发送" }).click();
    await expect.poll(() => turnRequests.length).toBe(1);
    expect(turnRequests[0]).toMatchObject({ threadId: "thread-new", prompt: "只发送到新会话" });

    await page.getByRole("tab", { name: /历史/ }).click();
    await expect(page.getByText("已有会话", { exact: true })).toBeVisible();
    await expect(page.getByText("thread-new", { exact: true })).toHaveCount(0);
});
