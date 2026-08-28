import { expect, test } from "@playwright/test";

async function openReadyAgent(page: import("@playwright/test").Page, turn: (route: import("@playwright/test").Route) => Promise<void>) {
    const conversation = { revision: 1, conversationId: "conversation-send", threadId: "thread-send", status: "ready" as const, mcpStatuses: {} };
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/turn") return await turn(route);
        if (path === "/agent/codex/threads") return await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-send" }, conversation, data: [] } });
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({ url: "http://127.0.0.1:4173", token: "agent-first-send-token", connected: true, enabled: false, panelOpen: false, panelMounted: false, panelClosing: false, activeTab: "chat", activeThreadId: "thread-send", conversation: { revision: 1, conversationId: "conversation-send", threadId: "thread-send", status: "ready", mcpStatuses: {} }, messages: [], threads: [], loadingThreads: false, sending: false, waiting: false });
    });
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        return !useAgentStore.getState().loadingThreads && useAgentStore.getState().conversation.status === "ready";
    });
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.getState().setAgentState({ connected: true, enabled: false, loadingThreads: false, conversation: { revision: 1, conversationId: "conversation-send", threadId: "thread-send", status: "ready", mcpStatuses: {} } });
    });
    await expect(page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" })).toHaveAttribute("contenteditable", "true");
}

test("首次发送立即清空输入并显示用户消息，失败后恢复原草稿", async ({ page }) => {
    await openReadyAgent(page, async (route) => {
        await route.fulfill({ status: 500, json: { ok: false, error: "测试发送失败" } });
    });
    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await prompt.fill("失败后应恢复的草稿");
    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByText("失败后应恢复的草稿", { exact: true })).toHaveCount(1);
    await expect(prompt).toHaveText("失败后应恢复的草稿");
    await expect(page.getByText("测试发送失败", { exact: true })).toBeVisible();
});

test("首次发送成功后不清除运行期间已写入的新草稿", async ({ page }) => {
    let allowTurn: () => void;
    const turnAllowed = new Promise<void>((resolve) => { allowTurn = resolve; });
    let turnStarted: () => void;
    const turnRequested = new Promise<void>((resolve) => { turnStarted = resolve; });
    await openReadyAgent(page, async (route) => {
        turnStarted();
        await turnAllowed;
        await route.fulfill({ json: { ok: true, threadId: "thread-send" } });
    });
    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await prompt.fill("首条消息");
    await page.getByRole("button", { name: "发送" }).click();
    await turnRequested;
    await expect(page.getByText("首条消息", { exact: true })).toBeVisible();
    await expect(prompt).toHaveText("");
    await page.evaluate(async () => (await import("/src/stores/use-agent-store.ts")).useAgentStore.getState().setAgentState({ prompt: "运行中保留的新草稿" }));
    allowTurn();
    await expect(prompt).toHaveText("运行中保留的新草稿");
});
