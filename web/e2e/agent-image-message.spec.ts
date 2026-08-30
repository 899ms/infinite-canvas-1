import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-image", threadId: "thread-image", status: "ready" as const, mcpStatuses: {} };
const assetUrl = "http://127.0.0.1:4173/agent/message-assets/message-key/preview.png?token=image-token";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const thread = { id: "thread-image", name: "图片历史", preview: "请参考这张图", status: "idle", createdAt: 1_788_010_000, updatedAt: 1_788_010_001 };

test("Agent 历史图片消息保持紧凑缩略图并可打开预览", async ({ page }) => {
    await page.addInitScript(
        ({ conversation }) => {
            class MockEventSource extends EventTarget {
                constructor() {
                    super();
                    window.setTimeout(() => this.dispatchEvent(new MessageEvent("hello", { data: JSON.stringify({ protocolVersion: 6, conversation }) })), 0);
                }
                close() {}
            }
            Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
        },
        { conversation },
    );
    await page.route("**/agent/message-assets/**", (route) => route.fulfill({ contentType: "image/png", body: png }));
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-image" }, conversation, data: [thread] } });
            return;
        }
        if (path === "/agent/codex/threads/thread-image") {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-image" },
                    conversation,
                    thread,
                    messages: [{ id: "image-message", itemId: "image-message", threadId: "thread-image", turnId: "turn-image", role: "user", text: "请参考这张图", attachments: [{ id: "attachment-image", name: "参考图.png", url: assetUrl }] }],
                    settledTurnIds: ["turn-image"],
                    historyReady: true,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ conversation, assetUrl }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "image-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-image",
                conversation,
                messages: [{ id: "image-message", itemId: "image-message", threadId: "thread-image", turnId: "turn-image", role: "user", text: "请参考这张图", attachments: [{ id: "attachment-image", name: "参考图.png", url: assetUrl }] }],
                threads: [],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation, assetUrl },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    const image = page.getByAltText("参考图.png");
    await expect(image).toBeVisible();
    await expect(image).toHaveClass(/size-10/);
    await image.click();
    await expect(page.getByRole("dialog", { name: "图片附件预览" })).toBeVisible();
});
