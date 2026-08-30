import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-chat-follow", threadId: "thread-chat-follow", status: "ready" as const, mcpStatuses: {} };
const thread = { id: "thread-chat-follow", name: "对话滚动", preview: "对话消息 060", status: "idle", createdAt: 1_788_000_000, updatedAt: 1_788_000_001 };
const messages = Array.from({ length: 60 }, (_, index) => ({
    id: `message-${index + 1}`,
    itemId: `message-${index + 1}`,
    threadId: thread.id,
    turnId: `turn-${index + 1}`,
    role: index % 2 ? "assistant" : "user",
    title: index % 2 ? "Codex" : undefined,
    text: `对话消息 ${String(index + 1).padStart(3, "0")}：用于验证手动上翻后新消息不会打断阅读。`,
}));

test("Agent 对话可暂停跟随并返回最新消息", async ({ page }) => {
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: thread.id }, conversation, data: [thread] } });
            return;
        }
        if (path === `/agent/codex/threads/${thread.id}`) {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: thread.id }, conversation, thread, messages, settledTurnIds: messages.map((item) => item.turnId), historyReady: true } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, thread, messages }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-chat-follow-token",
                connected: true,
                enabled: false,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: thread.id,
                conversation,
                messages,
                threads: [thread],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation, thread, messages },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();

    const list = page.locator("div.thin-scrollbar.h-full.select-text.overflow-y-auto");
    await expect(page.getByText("对话消息 001", { exact: false })).toBeVisible();
    await expect.poll(() => list.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(2);

    await list.evaluate((element) => {
        element.scrollTop = 0;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
    const latestButton = page.getByRole("button", { name: "查看最新消息" });
    await expect(latestButton).toBeVisible();
    const scrollButtonLayout = await latestButton.evaluate((button) => {
        const parent = button.parentElement?.getBoundingClientRect();
        const rect = button.getBoundingClientRect();
        const style = window.getComputedStyle(button);
        return { width: rect.width, height: rect.height, centerOffset: parent ? rect.left - parent.left + rect.width / 2 - parent.width / 2 : Number.NaN, position: style.position };
    });
    expect(scrollButtonLayout.width).toBeCloseTo(32, 0);
    expect(scrollButtonLayout.height).toBeCloseTo(32, 0);
    expect(scrollButtonLayout.centerOffset).toBeCloseTo(0, 0);
    expect(scrollButtonLayout.position).toBe("absolute");

    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        const state = useAgentStore.getState();
        useAgentStore.setState({ messages: [...state.messages, { id: "message-061", itemId: "message-061", threadId: "thread-chat-follow", turnId: "turn-061", role: "assistant", title: "Codex", text: "对话消息 061：新消息到达但不打断上翻阅读。" }] });
    });
    await expect(page.getByText("对话消息 061", { exact: false })).toBeVisible();
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);

    await latestButton.click();
    await expect.poll(() => list.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(2);
    await expect(latestButton).toHaveCount(0);
    await expect
        .poll(() =>
            list.evaluate((element) => {
                const content = element.firstElementChild;
                const last = content?.lastElementChild;
                if (!content || !last) return Number.POSITIVE_INFINITY;
                return content.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom;
            }),
        )
        .toBeLessThanOrEqual(1);

    await list.evaluate((element) => {
        element.scrollTop = 0;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await expect(latestButton).toBeVisible();
    await page.getByRole("tab", { name: "日志" }).click();
    await page.getByRole("tab", { name: "对话" }).click();
    await expect.poll(() => list.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(2);
    await expect(latestButton).toHaveCount(0);
});
