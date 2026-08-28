import { expect, test, type Page } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-model", threadId: "thread-model", status: "ready" as const, mcpStatuses: {} };
const models = [
    { id: "internal-review", model: "codex-auto-review", displayName: "内部审查", supportedReasoningEfforts: [{ reasoningEffort: "low" }], defaultReasoningEffort: "low" },
    { id: "terra", model: "gpt-5.6-terra", displayName: "Terra", supportedReasoningEfforts: [{ reasoningEffort: "low" }, { reasoningEffort: "medium" }, { reasoningEffort: "high" }], defaultReasoningEffort: "medium" },
    { id: "terra-duplicate", model: "gpt-preview", displayName: "Terra", supportedReasoningEfforts: [{ reasoningEffort: "low" }], defaultReasoningEffort: "low" },
    { id: "mini", model: "gpt-5.4-mini", displayName: "Mini", supportedReasoningEfforts: [{ reasoningEffort: "low" }, { reasoningEffort: "xhigh" }], defaultReasoningEffort: "low" },
    { id: "unsupported", model: "gpt-unsupported", displayName: "不支持的模型", supportedReasoningEfforts: [{ reasoningEffort: "auto" }], defaultReasoningEffort: "auto" },
];

async function primeAgent(page: Page) {
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            url: "http://127.0.0.1:4173",
            token: "agent-model-token",
            connected: true,
            enabled: false,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "chat",
            activeThreadId: "thread-model",
            conversation: { revision: 1, conversationId: "conversation-model", threadId: "thread-model", status: "ready", mcpStatuses: {} },
            messages: [],
            threads: [],
            eventLogs: [],
            loadingThreads: false,
            sending: false,
            waiting: false,
        });
    });
}

test("Agent 仅显示可用模型，随模型更新强度并将选择用于发送和日志", async ({ page }) => {
    const turnRequests: Array<Record<string, unknown>> = [];
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/models") {
            await route.fulfill({ json: { ok: true, data: models } });
            return;
        }
        if (path === "/agent/codex/turn") {
            turnRequests.push(route.request().postDataJSON() as Record<string, unknown>);
            await route.fulfill({ json: { ok: true, threadId: "thread-model" } });
            return;
        }
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-model" }, conversation, data: [] } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });

    await page.goto("/");
    await primeAgent(page);
    await page.getByRole("button", { name: "打开 Agent" }).click();

    const modelControl = page.getByRole("combobox", { name: "选择 Codex 模型，当前为 Terra" });
    await expect(modelControl).toBeVisible();
    await modelControl.click();
    await expect(page.getByRole("option", { name: "内部审查" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "不支持的模型" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Terra" })).toHaveCount(1);
    await page.getByRole("option", { name: "Mini" }).click();

    const effortControl = page.getByRole("combobox", { name: "选择思考程度，当前为 轻度" });
    await expect(effortControl).toBeVisible();
    await effortControl.click();
    await expect(page.getByRole("option", { name: "轻度" })).toBeVisible();
    await expect(page.getByRole("option", { name: "极高" })).toBeVisible();
    await expect(page.getByRole("option", { name: "中" })).toHaveCount(0);
    await page.getByRole("option", { name: "极高" }).click();
    await expect(page.getByRole("combobox", { name: "选择思考程度，当前为 极高" })).toBeVisible();

    await page.reload();
    await primeAgent(page);
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByRole("combobox", { name: "选择 Codex 模型，当前为 Mini" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "选择思考程度，当前为 极高" })).toBeVisible();

    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await expect(prompt).toBeVisible();
    await prompt.fill("验证模型请求参数");
    await page.getByRole("button", { name: "发送" }).click();
    await expect.poll(() => turnRequests.length).toBe(1);
    expect(turnRequests[0]).toMatchObject({ model: "gpt-5.4-mini", effort: "xhigh", prompt: "验证模型请求参数" });

    await page.getByRole("tab", { name: /日志/ }).click();
    await expect(page.getByText("Mini · 极高 · 验证模型请求参数", { exact: true }).first()).toBeVisible();
});
