import { expect, test, type Page } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-composer", threadId: "thread-composer", status: "ready" as const, mcpStatuses: {} };

test("Agent 输入区在窄与宽面板中保持图标、提示和发送操作可用", async ({ page }) => {
    await openAgentPanel(page, 360);
    const panel = page.locator("aside[data-canvas-shortcuts-ignore]");
    const input = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    const upload = page.getByRole("button", { name: "上传图片" });
    const tools = page.getByRole("button", { name: /选择工具确认模式，当前为\s*自动确认/ });
    const permissions = page.getByRole("button", { name: /选择 Codex 权限模式，当前为\s*请求批准/ });
    const send = page.getByRole("button", { name: "发送" });

    await expect(panel).toHaveCSS("width", "360px");
    await expect(input).toBeVisible();
    await expect(upload).toBeVisible();
    await expect(tools).toBeVisible();
    await expect(permissions).toBeVisible();
    await expect(send).toBeDisabled();
    await input.fill("窄面板输入仍可发送");
    await expect(send).toBeEnabled();
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.getState().setAgentState({ width: 700 });
    });
    await expect(panel).toHaveCSS("width", "700px");
    await expect(input).toHaveAttribute("contenteditable", "true");
    await expect(upload).toBeVisible();
    await expect(tools).toBeVisible();
    await expect(permissions).toBeVisible();
    await expect(send).toBeEnabled();
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

async function openAgentPanel(page: Page, width: number) {
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        await route.fulfill({ json: { ok: true, workspace: { activeThreadId: conversation.threadId }, conversation, data: [] } });
    });
    await page.goto("/");
    await page.evaluate(async ({ initialWidth, initialConversation }) => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            width: initialWidth,
            url: "http://127.0.0.1:4173",
            token: "agent-composer-layout-token",
            connected: true,
            enabled: false,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "chat",
            activeThreadId: initialConversation.threadId,
            conversation: initialConversation,
            prompt: "",
            messages: [],
            threads: [],
            eventLogs: [],
            loadingThreads: false,
            sending: false,
            waiting: false,
            confirmTools: false,
            permissionMode: "request",
        });
    }, { initialWidth: width, initialConversation: conversation });
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByTestId("agent-panel-header")).toBeVisible();
}
