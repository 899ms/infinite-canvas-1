import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-log-follow", threadId: "thread-log-follow", status: "ready" as const, mcpStatuses: {} };
const initialLogs = Array.from({ length: 60 }, (_, index) => ({
    id: `log-${index + 1}`,
    time: `10:00:${String(index).padStart(2, "0")}`,
    title: `日志 ${String(index + 1).padStart(3, "0")}`,
    text: `按顺序 ${index + 1}`,
}));

test("Agent 日志按时间排列、暂停跟随并可回到底部", async ({ page }) => {
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-log-follow" }, conversation, data: [] } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, initialLogs }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-log-follow-token",
                connected: true,
                enabled: false,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "log",
                activeThreadId: "thread-log-follow",
                conversation,
                messages: [],
                eventLogs: initialLogs,
                threads: [],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation, initialLogs },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.getByRole("tab", { name: /日志 60/ }).click();

    const list = page.getByLabel("排查日志列表");
    await expect(list.locator("details").first()).toContainText("日志 001");
    await expect(list.locator("details").last()).toContainText("日志 060");
    await expect.poll(() => list.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(2);

    await list.evaluate((element) => {
        element.scrollTop = 0;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        const logs = useAgentStore.getState().eventLogs;
        useAgentStore.setState({
            eventLogs: [...logs, { id: "error-61", time: "10:01:00", title: "错误", text: "后续错误一" }, { id: "error-62", time: "10:01:01", title: "错误", text: "后续错误二" }],
        });
    });

    const latestButton = page.getByRole("button", { name: "2 条新日志，查看最新日志" });
    await expect(latestButton).toBeVisible();
    await latestButton.click();
    await expect.poll(() => list.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(2);
    await expect(latestButton).toHaveCount(0);

    await page.getByText("错误 2", { exact: true }).click();
    await expect(list.locator("details").first()).toContainText("后续错误一");
    await expect(list.locator("details").last()).toContainText("后续错误二");
    await expect.poll(() => list.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThanOrEqual(2);
});
