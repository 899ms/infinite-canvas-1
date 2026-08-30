import { expect, test } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-markdown", threadId: "thread-markdown", status: "ready" as const, mcpStatuses: {} };
const localPath = "/Users/isolated-user/a-very-long-workspace-path/with-several-nested-directories/and-a-source-file.ts";
const markdown = [
    "## Markdown 验收",
    "",
    "行内 `inline-token` 与一段正常说明。",
    "",
    "```ts",
    "const answer = 'compact code block';",
    "```",
    "",
    "[外部文档](https://example.com/a-very-long-external-documentation-path/that-must-wrap-in-the-confirmation-dialog)",
    "",
    `[本地路径](${localPath})`,
].join("\n");

test("Agent Markdown 代码、链接确认和本地路径定位在双主题下保持紧凑可读", async ({ page }) => {
    const revealedPaths: string[] = [];
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === "/agent/local-file/reveal") {
            revealedPaths.push(JSON.parse(request.postData() || "{}").path);
            await route.fulfill({ json: { ok: true } });
            return;
        }
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: conversation.threadId }, conversation, data: [] } });
            return;
        }
        if (path === `/agent/codex/threads/${conversation.threadId}`) {
            await route.fulfill({
                json: {
                    ok: true,
                    workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: conversation.threadId },
                    conversation,
                    thread: { id: conversation.threadId, name: "Markdown 验收", preview: "", status: "idle", createdAt: 1, updatedAt: 1 },
                    messages: [{ id: "assistant-markdown", itemId: "assistant-markdown", threadId: conversation.threadId, turnId: "turn-markdown", role: "assistant", title: "Codex", text: markdown }],
                    settledTurnIds: ["turn-markdown"],
                    historyReady: true,
                },
            });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });

    await page.goto("/");
    await page.evaluate(
        async ({ conversation, markdown }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-markdown-token",
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
                messages: [{ id: "assistant-markdown", itemId: "assistant-markdown", threadId: conversation.threadId, turnId: "turn-markdown", role: "assistant", title: "Codex", text: markdown }],
            });
        },
        { conversation, markdown },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();

    const codeBlock = page.locator('[data-streamdown="code-block"]');
    const codeBody = page.locator('[data-streamdown="code-block-body"]');
    const codeActions = page.locator('[data-streamdown="code-block-actions"]');
    await expect(page.getByRole("heading", { name: "Markdown 验收", exact: true })).toBeVisible();
    await expect(page.locator('[data-streamdown="inline-code"]')).toContainText("inline-token");
    await expect(codeBlock).toBeVisible();
    await expect(codeBody).toContainText("compact code block");
    await expect(page.locator('[data-streamdown="code-block-header"]')).toHaveCount(1);
    await expect(page.locator('[data-streamdown="code-block-header"]')).toHaveCSS("display", "none");
    await expect(
        codeBlock.evaluate((element) => {
            const parent = element.parentElement!;
            const body = getComputedStyle(element.querySelector('[data-streamdown="code-block-body"]')!);
            return Math.abs(element.getBoundingClientRect().width - parent.getBoundingClientRect().width) < 1 && Number.parseFloat(body.minHeight) === 0 && body.backgroundColor === "rgba(0, 0, 0, 0)";
        }),
    ).resolves.toBe(true);
    await expect(codeActions.evaluate((element) => getComputedStyle(element).opacity)).resolves.toBe("0");
    await page.getByRole("button", { name: "复制代码", exact: true }).focus();
    await expect.poll(() => codeActions.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity))).toBeGreaterThan(0);

    await page.getByRole("button", { name: "外部文档", exact: true }).click();
    const externalDialog = page.getByRole("dialog", { name: "打开外部链接？" });
    await expect(externalDialog).toBeVisible();
    await expect(externalDialog).toContainText("即将打开以下外部链接，请确认链接可信。");
    await expect(externalDialog).toContainText("a-very-long-external-documentation-path");
    await externalDialog.press("Escape");
    await expect(externalDialog).toBeHidden();

    await page.getByRole("button", { name: "本地路径", exact: true }).click();
    const localDialog = page.getByRole("dialog", { name: "打开本地文件？" });
    await expect(localDialog).toBeVisible();
    await expect(localDialog).toContainText("将在本机文件管理器中定位该路径，不会通过浏览器打开。");
    await expect(localDialog).toContainText(localPath);
    await localDialog.getByRole("button", { name: "在文件管理器中显示" }).click();
    await expect.poll(() => revealedPaths).toEqual([localPath]);

    for (const toggle of ["切换到浅色主题", "切换到深色主题"]) {
        const button = page.getByRole("button", { name: toggle });
        if (await button.count()) await button.click();
        await expect(page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).resolves.toBe(true);
        await expect(codeBlock).toBeVisible();
        await expect(page.getByRole("button", { name: "外部文档", exact: true })).toBeVisible();
    }
});
