import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-message-layout", threadId: "thread-message-layout", status: "ready" as const, mcpStatuses: {} };
const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const longText = Array.from({ length: 30 }, (_, index) => `第 ${index + 1} 段用户长文本，验证消息在窄面板中自动换行而不横向溢出。`).join(" ");
const historyMessages = [
    {
        id: "user-layout",
        itemId: "user-layout",
        threadId: conversation.threadId,
        turnId: "turn-layout",
        role: "user",
        text: longText,
        attachments: [
            { id: "image-1", name: "参考图一.png", url: image },
            { id: "image-2", name: "参考图二.png", url: image },
        ],
    },
    { id: "assistant-layout", itemId: "assistant-layout", threadId: conversation.threadId, turnId: "turn-layout", role: "assistant", title: "Codex", text: "## 商品建议\n\n使用 **柔和侧光**，并保留参考图的主色调。" },
    { id: "error-layout", itemId: "error-layout", threadId: conversation.threadId, turnId: "turn-layout", role: "error", title: "处理失败", text: "模型暂时不可用，请稍后重试。" },
];

test("Agent 用户、助手、附件与错误消息在双主题下保持可读布局", async ({ page }) => {
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: conversation.threadId },
                    conversation,
                    data: [{ id: conversation.threadId, name: "消息布局", preview: "", status: "idle", createdAt: 1, updatedAt: 1 }],
                },
            });
            return;
        }
        if (path === `/agent/codex/threads/${conversation.threadId}`) {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: conversation.threadId },
                    conversation,
                    thread: { id: conversation.threadId, name: "消息布局", preview: "", status: "idle", createdAt: 1, updatedAt: 1 },
                    messages: historyMessages,
                    settledTurnIds: ["turn-layout"],
                    historyReady: true,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, image, longText }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-message-layout-token",
                connected: true,
                enabled: false,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: conversation.threadId,
                conversation,
                threads: [],
                loadingThreads: false,
                sending: false,
                waiting: false,
                messages: [
                    {
                        id: "user-layout",
                        itemId: "user-layout",
                        threadId: conversation.threadId,
                        turnId: "turn-layout",
                        role: "user",
                        text: longText,
                        attachments: [
                            { id: "image-1", name: "参考图一.png", url: image },
                            { id: "image-2", name: "参考图二.png", url: image },
                        ],
                    },
                    { id: "assistant-layout", itemId: "assistant-layout", threadId: conversation.threadId, turnId: "turn-layout", role: "assistant", title: "Codex", text: "## 商品建议\n\n使用 **柔和侧光**，并保留参考图的主色调。" },
                    { id: "error-layout", itemId: "error-layout", threadId: conversation.threadId, turnId: "turn-layout", role: "error", title: "处理失败", text: "模型暂时不可用，请稍后重试。" },
                ],
            });
        },
        { conversation, image, longText },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();

    const user = page.getByText("第 1 段用户长文本", { exact: false });
    const assistant = page.getByText("商品建议", { exact: true });
    const error = page.getByText("模型暂时不可用，请稍后重试。", { exact: true });
    await expect(user).toBeVisible();
    await expect(assistant).toBeVisible();
    await expect(error).toBeVisible();
    await expect(page.getByAltText("参考图一.png")).toBeVisible();
    await expect(page.getByAltText("参考图二.png")).toBeVisible();
    await expect(user.evaluate((element) => element.closest("div.flex")?.className || "")).resolves.toContain("justify-end");
    await expect(user.evaluate((element) => element.parentElement?.className || "")).resolves.not.toMatch(/(?:rounded|bg-)/);
    await expect(assistant.evaluate((element) => element.closest("div.flex")?.className || "")).resolves.toContain("justify-start");
    await expect(error.evaluate((element) => getComputedStyle(element).color)).resolves.toBe("rgb(220, 38, 38)");

    for (const toggle of ["切换到浅色主题", "切换到深色主题"]) {
        const button = page.getByRole("button", { name: toggle });
        if (await button.count()) await button.click();
        await expect(page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).resolves.toBe(true);
        await expect(user).toBeVisible();
        await expect(assistant).toBeVisible();
        await expect(error).toBeVisible();
    }
});
