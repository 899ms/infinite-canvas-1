import { expect, test } from "@playwright/test";

const firstThread = { id: "thread-history-first", name: "第一段对话", preview: "第一段摘要", status: "idle", createdAt: 1_788_001_000, updatedAt: 1_788_001_100 };
const secondThread = { id: "thread-history-second", name: "第二段对话", preview: "第二段摘要", status: "idle", createdAt: 1_788_002_000, updatedAt: 1_788_002_100 };
const secondThreadMessages = Array.from({ length: 60 }, (_, index) => ({
    id: `message-second-${index + 1}`,
    itemId: `message-second-${index + 1}`,
    threadId: secondThread.id,
    turnId: `turn-second-${index + 1}`,
    role: index % 2 ? "assistant" : "user",
    title: index % 2 ? "Codex" : undefined,
    text: index === 58 ? "请改写 @文本1 $product-grid" : `第二段对话历史 ${String(index + 1).padStart(3, "0")}`,
    ...(index === 58
        ? {
              canvasReferences: [{ nodeId: "history-text", label: "文本1", title: "历史产品说明", kind: "text", text: "历史中的原始产品说明" }],
              skill: { name: "product-grid", path: "F:/isolated/workspace/.agents/skills/product-grid/SKILL.md", displayName: "产品九宫格" },
          }
        : {}),
}));

test("Agent 历史卡片可直接恢复，并支持全选删除当前对话", async ({ page }) => {
    let remainingThreads = [firstThread, secondThread];
    let activeThreadId = firstThread.id;
    let conversationRevision = 1;
    const deletedThreadIds: string[] = [];
    await page.addInitScript(() => {
        class MockEventSource extends EventTarget {
            close() {}
        }
        Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
    });
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const conversation = { revision: conversationRevision, conversationId: `conversation-${activeThreadId || "empty"}`, threadId: activeThreadId, status: "ready", mcpStatuses: {} };
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId }, conversation, data: remainingThreads } });
            return;
        }
        if (path === `/agent/codex/threads/${secondThread.id}/resume`) {
            activeThreadId = secondThread.id;
            conversationRevision = 2;
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId },
                    conversation: { revision: conversationRevision, conversationId: "conversation-second", threadId: secondThread.id, status: "ready", mcpStatuses: {} },
                },
            });
            return;
        }
        if (path === `/agent/codex/threads/${firstThread.id}` || path === `/agent/codex/threads/${secondThread.id}`) {
            const thread = path.endsWith(secondThread.id) ? secondThread : firstThread;
            const threadMessages =
                thread.id === secondThread.id ? secondThreadMessages : [{ id: `message-${thread.id}`, itemId: `message-${thread.id}`, threadId: thread.id, turnId: `turn-${thread.id}`, role: "assistant", title: "Codex", text: `${thread.name}的历史消息` }];
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId },
                    conversation,
                    thread,
                    messages: threadMessages,
                    settledTurnIds: threadMessages.map((message) => message.turnId),
                    historyReady: true,
                },
            });
            return;
        }
        if (path.startsWith("/agent/codex/threads/") && path.endsWith("/delete")) {
            const threadId = decodeURIComponent(path.split("/")[4]);
            deletedThreadIds.push(threadId);
            remainingThreads = remainingThreads.filter((thread) => thread.id !== threadId);
            if (activeThreadId === threadId) {
                activeThreadId = "";
                conversationRevision = 3;
            }
            await route.fulfill({
                json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId }, conversation: { revision: conversationRevision, conversationId: "conversation-empty", threadId: activeThreadId, status: "ready", mcpStatuses: {} } },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ firstThread }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-history-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: firstThread.id,
                conversation: { revision: 1, conversationId: "conversation-first", threadId: firstThread.id, status: "ready", mcpStatuses: {} },
                messages: [{ id: "message-first", itemId: "message-first", threadId: firstThread.id, turnId: "turn-first", role: "assistant", title: "Codex", text: "第一段对话的历史消息" }],
                threads: [firstThread, { id: "thread-history-second", name: "第二段对话", preview: "第二段摘要", status: "idle", createdAt: 1_788_002_000, updatedAt: 1_788_002_100 }],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { firstThread },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.getByRole("tab", { name: "历史" }).click();
    await expect(page.getByRole("button", { name: "第二段对话 第二段摘要" })).toBeVisible();
    await expect(page.getByRole("button", { name: "进入" })).toHaveCount(0);
    await page.getByRole("button", { name: "第二段对话 第二段摘要" }).click();
    await expect(page.getByRole("tab", { name: "对话" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/^请改写/)).toBeVisible();
    await expect(page.getByLabel(/历史产品说明/)).toBeVisible();
    await expect(page.getByTitle("F:/isolated/workspace/.agents/skills/product-grid/SKILL.md")).toBeVisible();
    const restoredList = page.locator("div.thin-scrollbar.h-full.select-text.overflow-y-auto");
    await expect.poll(() => restoredList.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(2);

    await page.getByRole("tab", { name: "历史" }).click();
    await page.getByRole("checkbox").first().check();
    await expect(page.getByText("已选 2 条", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "删除 2 条" }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("删除 2 条对话记录");
    await confirm.getByRole("button", { name: /删\s*除/ }).click();
    await expect.poll(() => deletedThreadIds.sort()).toEqual([firstThread.id, secondThread.id].sort());
    await expect(page.getByText("当前工作空间还没有对话记录", { exact: true })).toBeVisible();
    await expect
        .poll(() =>
            page.evaluate(async () => {
                const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
                const state = useAgentStore.getState();
                return { activeThreadId: state.activeThreadId, messages: state.messages.length };
            }),
        )
        .toEqual({ activeThreadId: "", messages: 0 });
});
