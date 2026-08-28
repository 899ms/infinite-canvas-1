import { expect, test, type Page } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-header", threadId: "thread-header", status: "ready" as const, mcpStatuses: {} };

async function openNarrowAgent(page: Page) {
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-header" }, conversation, data: [] } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            width: 360,
            url: "http://127.0.0.1:4173",
            token: "agent-header-token",
            connected: true,
            enabled: false,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "chat",
            activeThreadId: "thread-header",
            conversation: { revision: 1, conversationId: "conversation-header", threadId: "thread-header", status: "ready", mcpStatuses: {} },
            messages: [],
            threads: [],
            eventLogs: [],
            loadingThreads: false,
            sending: false,
            waiting: false,
        });
    });
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByTestId("agent-panel-header")).toBeVisible();
}

test("窄 Agent 面板保留标题、对齐操作并允许标签横向滚动", async ({ page }) => {
    await openNarrowAgent(page);

    const header = page.getByTestId("agent-panel-header");
    const tabList = page.getByTestId("agent-panel-tabs");
    const title = header.getByText("Agent", { exact: true });
    const connection = header.getByRole("button", { name: /连接设置/ });
    const newThread = header.getByRole("button", { name: "新对话" });
    const collapse = header.getByRole("button", { name: "收起 Agent 面板" });

    await expect(title).toBeVisible();
    await expect(connection).toBeVisible();
    await expect(tabList).toHaveCSS("overflow-x", "auto");
    await expect(newThread).toBeVisible();
    await expect(collapse).toBeVisible();

    const centers = await Promise.all(
        [title, connection, tabList, newThread, collapse].map(async (locator) => {
            const box = await locator.boundingBox();
            if (!box) throw new Error("Agent 顶部栏操作未取得布局尺寸");
            return box.y + box.height / 2;
        }),
    );
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);
});
