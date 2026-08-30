import { expect, test } from "@playwright/test";

const threadId = "thread-reference-refresh";
const referenceImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const conversation = { revision: 1, conversationId: "conversation-reference-refresh", threadId, status: "ready" as const, mcpStatuses: {} };
const historyMessage = {
    id: "message-reference-refresh",
    itemId: "message-reference-refresh",
    clientMessageId: "client-reference-refresh",
    threadId,
    turnId: "turn-reference-refresh",
    role: "user" as const,
    text: "先执行 $product-grid，再参考 @图片1 调整构图",
    canvasReferences: [{ nodeId: "history-image", label: "图片1", title: "历史参考图片", kind: "image" as const, previewUrl: referenceImage }],
    skill: { name: "product-grid", path: "F:/isolated/workspace/.agents/skills/product-grid/SKILL.md", displayName: "产品九宫格" },
};

test("刷新后从 Agent 权威历史恢复画布引用标签与图片预览", async ({ page }) => {
    let threadHistoryReads = 0;
    await page.addInitScript(
        ({ conversation, threadId }) => {
            localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
            localStorage.setItem("canvas-agent-token", "agent-reference-refresh-token");
            class MockEventSource extends EventTarget {
                constructor() {
                    super();
                    window.setTimeout(
                        () =>
                            this.dispatchEvent(
                                new MessageEvent("hello", {
                                    data: JSON.stringify({ protocolVersion: 6, workspace: { activeThreadId: threadId }, conversation, codex: { busy: false } }),
                                }),
                            ),
                        0,
                    );
                }
                close() {}
            }
            Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
        },
        { conversation, threadId },
    );
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: threadId }, conversation, data: [{ id: threadId, name: "引用恢复对话", preview: "画布引用", status: "idle" }] } });
            return;
        }
        if (path === `/agent/codex/threads/${threadId}`) {
            threadHistoryReads += 1;
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: threadId },
                    conversation,
                    thread: { id: threadId, name: "引用恢复对话", preview: "画布引用", status: "idle" },
                    messages: [historyMessage],
                    settledTurnIds: [historyMessage.turnId],
                    historyReady: true,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });

    await page.goto("/");
    await page.getByRole("button", { name: "打开 Agent" }).click();
    const agentState = () =>
        page.evaluate(async () => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            const state = useAgentStore.getState();
            return { connected: state.connected, activeThreadId: state.activeThreadId, messages: state.messages.map((item) => ({ id: item.id, itemId: item.itemId, text: item.text, threadId: item.threadId, turnId: item.turnId })) };
        });
    const expectedAgentState = { connected: true, activeThreadId: threadId, messages: expect.arrayContaining([expect.objectContaining({ itemId: "synthetic:user", text: historyMessage.text })]) };
    await expect.poll(agentState).toMatchObject(expectedAgentState);
    await page.getByRole("tab", { name: "对话" }).click();
    const skillToken = page.getByTitle("F:/isolated/workspace/.agents/skills/product-grid/SKILL.md");
    await expect(skillToken).toBeVisible();
    await expect(skillToken.locator("xpath=..")).toHaveText("先执行 /产品九宫格，再参考 @图片1 调整构图");
    const reference = page.getByLabel(/历史参考图片/);
    await expect(reference).toBeVisible();
    await reference.hover();
    await expect(page.getByRole("img", { name: "历史参考图片" })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect.poll(agentState).toMatchObject(expectedAgentState);
    await page.getByRole("tab", { name: "对话" }).click();
    await expect(skillToken).toBeVisible();
    await expect(skillToken.locator("xpath=..")).toHaveText("先执行 /产品九宫格，再参考 @图片1 调整构图");
    await expect(reference).toBeVisible();
    await reference.hover();
    await expect(page.getByRole("img", { name: "历史参考图片" })).toBeVisible();
    expect(threadHistoryReads).toBeGreaterThanOrEqual(2);
});
