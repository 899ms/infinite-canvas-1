import { expect, test } from "@playwright/test";

const oldConversation = { revision: 1, conversationId: "conversation-usage-old", threadId: "thread-usage-old", status: "ready" as const, mcpStatuses: {} };
const newConversation = { revision: 2, conversationId: "conversation-usage-new", threadId: "thread-usage-new", status: "ready" as const, mcpStatuses: {} };
const oldThread = { id: "thread-usage-old", name: "统计会话", preview: "统计 Codex 回复", status: "idle", createdAt: 1_788_000_000, updatedAt: 1_788_000_001 };

test("Agent 对话保持简洁排版，并在新会话时清空最新用量", async ({ page }) => {
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads/reset") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-usage-new" }, conversation: newConversation } });
            return;
        }
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-usage-old" }, conversation: oldConversation, data: [oldThread] } });
            return;
        }
        if (path === "/agent/codex/threads/thread-usage-old") {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-usage-old" },
                    conversation: oldConversation,
                    thread: oldThread,
                    messages: [
                        { id: "user-usage", itemId: "user-usage", threadId: "thread-usage-old", turnId: "turn-usage", role: "user", text: "统计用户消息", meta: "2026-08-28 10:00:00 · 99 Token" },
                        { id: "assistant-usage", itemId: "assistant-usage", threadId: "thread-usage-old", turnId: "turn-usage", role: "assistant", title: "Codex", text: "统计 Codex 回复", meta: "2026-08-28 10:00:01 · 88 Token" },
                    ],
                    settledTurnIds: ["turn-usage"],
                    historyReady: true,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ oldConversation, oldThread }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-chat-usage-token",
                connected: true,
                enabled: false,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-usage-old",
                conversation: oldConversation,
                messages: [
                    { id: "user-usage", itemId: "user-usage", threadId: "thread-usage-old", turnId: "turn-usage", role: "user", text: "统计用户消息", meta: "2026-08-28 10:00:00 · 99 Token" },
                    { id: "assistant-usage", itemId: "assistant-usage", threadId: "thread-usage-old", turnId: "turn-usage", role: "assistant", title: "Codex", text: "统计 Codex 回复", meta: "2026-08-28 10:00:01 · 88 Token" },
                ],
                tokenUsage: { input: 1200, cached: 300, output: 45 },
                threads: [oldThread],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { oldConversation, oldThread },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();

    const userMessage = page.getByText("统计用户消息", { exact: true });
    await expect(userMessage).toBeVisible();
    await expect(page.getByText("统计 Codex 回复", { exact: true })).toBeVisible();
    await expect(page.getByText("最新调用", { exact: true })).toBeVisible();
    await expect(page.getByLabel("输入 1,200")).toBeVisible();
    await expect(page.getByLabel("缓存 300")).toBeVisible();
    await expect(page.getByLabel("输出 45")).toBeVisible();
    await expect(page.getByText(/2026-08-28 10:00:0[01]/)).toHaveCount(0);
    await expect
        .poll(() => userMessage.evaluate((element) => ({ row: element.closest("div.flex")?.className, bubble: element.parentElement?.className, images: element.closest("div.flex")?.querySelectorAll("img").length })))
        .toMatchObject({ row: expect.stringContaining("justify-end"), images: 0 });
    await expect(userMessage.evaluate((element) => element.parentElement?.className || "")).resolves.not.toMatch(/(?:bg-|rounded)/);

    await page.getByRole("button", { name: "新对话" }).click();
    await expect(page.getByText("统计用户消息", { exact: true })).toHaveCount(0);
    await expect(page.getByText("最新调用", { exact: true })).toHaveCount(0);
    await expect.poll(async () => await page.evaluate(async () => (await import("/src/stores/use-agent-store.ts")).useAgentStore.getState().activeThreadId)).toBe("thread-usage-new");
});
