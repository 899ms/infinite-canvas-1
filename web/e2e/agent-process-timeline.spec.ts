import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-timeline", threadId: "thread-timeline", status: "ready" as const, mcpStatuses: {} };
const thread = { id: "thread-timeline", name: "过程时间线", preview: "", status: "idle", createdAt: 1_788_000_200, updatedAt: 1_788_000_201 };
const command = {
    id: "command-1",
    itemId: "command-1",
    threadId: "thread-timeline",
    turnId: "turn-timeline",
    role: "tool" as const,
    title: "执行命令",
    text: "pnpm test",
    detail: {
        kind: "command",
        status: "completed",
        rows: [
            { label: "工作目录", value: "F:/isolated/workspace" },
            { label: "耗时", value: "1.2 秒" },
            { label: "退出状态", value: "0" },
        ],
        output: "全部通过",
    },
};

test("过程时间线在折叠命令行显示预览，并在展开后显示诊断详情", async ({ page }) => {
    await page.addInitScript(() => {
        class MockEventSource {
            addEventListener() {}
            close() {}
        }
        Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
    });
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-timeline" }, conversation, data: [thread] } });
            return;
        }
        if (path === "/agent/codex/threads/thread-timeline") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-timeline" }, conversation, thread, messages: [command], settledTurnIds: ["turn-timeline"], historyReady: true } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ command, conversation, thread }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-process-timeline-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-timeline",
                conversation,
                messages: [command],
                threads: [thread],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { command, conversation, thread },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.evaluate(
        async ({ command, conversation }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({ conversation, messages: [command], loadingThreads: false });
        },
        { command, conversation },
    );

    await expect(page.getByText("已执行 1 条命令", { exact: true })).toBeVisible();
    const preview = page.getByTitle("pnpm test");
    await expect(preview).toBeVisible();
    await expect(page.getByText("全部通过", { exact: true })).toBeHidden();
    await preview.click();
    await expect(page.getByText("工作目录", { exact: true })).toBeVisible();
    await expect(page.getByText("F:/isolated/workspace", { exact: true })).toBeVisible();
    await expect(page.getByText("耗时", { exact: true })).toBeVisible();
    await expect(page.getByText("退出状态", { exact: true })).toBeVisible();
    await expect(page.getByText("全部通过", { exact: true })).toBeVisible();
});
