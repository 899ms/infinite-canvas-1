import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-logs", threadId: "thread-logs", status: "ready" as const, mcpStatuses: {} };

test("Agent 排查日志支持筛选、折叠详情、原始 JSON 与清空", async ({ page }) => {
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") return void (await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-logs" }, conversation, data: [] } }));
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-log-diagnostics-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "logs",
                activeThreadId: "thread-logs",
                conversation,
                messages: [],
                threads: [],
                pendingTool: null,
                loadingThreads: false,
                sending: false,
                waiting: false,
                eventLogs: [
                    { id: "info-1", time: "10:00:00", title: "已连接", text: "Canvas Agent 已就绪" },
                    { id: "warn-1", time: "10:00:01", title: "警告", text: "模型正在重试" },
                    { id: "warn-2", time: "10:00:02", title: "警告", text: "模型正在重试" },
                    { id: "error-1", time: "10:00:03", title: "错误", text: "请求失败", raw: { level: "error", message: "请求失败", requestId: "request-test" } },
                ],
            });
        },
        { conversation },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.getByRole("tab", { name: /日志 5/ }).click();
    await expect(page.getByText("重复 2 次", { exact: true })).toBeVisible();
    await page.getByText("错误 2", { exact: true }).click();
    await expect(page.getByText("请求失败", { exact: true })).toBeVisible();
    await page.getByText("错误", { exact: true }).last().click();
    await expect(page.getByText("详细信息", { exact: true }).first()).toBeVisible();
    await page.getByText("原始 JSON", { exact: true }).click();
    await expect(page.locator("textarea")).toContainText("request-test");
    await page.getByRole("button", { name: "清空日志" }).click();
    await page.getByText("排查日志", { exact: true }).click();
    await expect(page.getByRole("button", { name: "清空日志" })).toBeDisabled();
});
