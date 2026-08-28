import { expect, test } from "@playwright/test";

const routes = ["/", "/image", "/video", "/interior", "/frameflow", "/assets", "/prompts", "/canvas", "/config"];

for (const route of routes) {
    test(`${route} 可完成首屏渲染`, async ({ page }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));

        await page.goto(route);
        await expect(page.locator("main").first()).toBeVisible();
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
        expect(pageErrors).toEqual([]);
    });
}

test("图像与视频设置的无文本控件有可读名称", async ({ page }) => {
    await page.goto("/image");
    await expect(page.getByRole("switch", { name: "16 倍数对齐" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "透明背景" })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "生成张数" })).toBeVisible();

    await page.goto("/video");
    await expect(page.getByRole("spinbutton", { name: "清晰度" })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "秒数" })).toBeVisible();
});

test("懒路由首访先显示加载骨架，再显示目标页面", async ({ page }) => {
    let releaseModuleResponse: () => void;
    const moduleRequestStarted = new Promise<void>((resolve) => {
        releaseModuleResponse = resolve;
    });
    let markModuleRequested: () => void;
    const moduleRequested = new Promise<void>((resolve) => {
        markModuleRequested = resolve;
    });
    await page.route("**/src/pages/not-found/index.tsx**", async (route) => {
        markModuleRequested();
        await moduleRequestStarted;
        const response = await route.fetch();
        await route.fulfill({ response });
    });

    const navigation = page.goto("/isolated-lazy-route");
    await moduleRequested;
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    releaseModuleResponse();
    await navigation;
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page.getByText("404", { exact: true })).toBeVisible();
});

test("首页与工作台标题使用设计系统 Token 并在主题切换后保持粗细", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("infinite-canvas:theme_store", JSON.stringify({ state: { theme: "dark" }, version: 0 }));
    });
    await page.goto("/");
    const homeTitle = page.locator("h1.page-display");
    await expect(homeTitle).toHaveCSS("font-size", "52px");
    await expect(homeTitle).toHaveCSS("font-weight", "700");
    await expect(page.locator("html")).toHaveClass(/dark/);

    for (const route of ["/config", "/prompts", "/assets", "/canvas", "/image", "/video", "/interior", "/frameflow"]) {
        await page.goto(route);
        const title = page.locator("h1.page-title");
        await expect(title).toBeVisible();
        await expect(title).toHaveCSS("font-size", "32px");
        await expect(title).toHaveCSS("font-weight", "700");
    }

    await page.getByRole("button", { name: "切换到浅色主题" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.locator("h1.page-title")).toHaveCSS("font-weight", "700");
});

test("资产空态区分新增资产与清除筛选", async ({ page }) => {
    await page.goto("/assets");
    await expect(page.getByRole("button", { name: "新增资产" })).toBeVisible();

    await page.waitForFunction(async () => (await import("/src/stores/use-asset-store.ts")).useAssetStore.getState().hydrated);
    await page.evaluate(async () => {
        const { useAssetStore } = await import("/src/stores/use-asset-store.ts");
        useAssetStore.setState({
            assets: [
                {
                    id: "asset-token-regression",
                    kind: "text",
                    title: "标题 Token 隔离资产",
                    coverUrl: "",
                    tags: ["隔离"],
                    createdAt: "2026-08-28T00:00:00.000Z",
                    updatedAt: "2026-08-28T00:00:00.000Z",
                    data: { content: "仅用于筛选空态回归" },
                },
            ],
            hydrated: true,
        });
    });
    await expect(page.getByText("标题 Token 隔离资产", { exact: true })).toBeVisible();
    await page.getByPlaceholder("搜索风格、主题、标题、标签或来源").fill("不存在的隔离资产");
    await expect(page.getByText("没有匹配条件的资产", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "清除筛选" })).toBeVisible();
});

test("顶部 Agent 打开后保留连接、对话、历史与日志", async ({ page }) => {
    const conversation = {
        revision: 1,
        conversationId: "conversation-preserved",
        threadId: "thread-preserved",
        status: "ready" as const,
        mcpStatuses: {},
    };
    const thread = {
        id: "thread-preserved",
        name: "保留的历史会话",
        preview: "保留的对话内容",
        status: "idle",
        createdAt: 1_788_000_000,
        updatedAt: 1_788_000_001,
    };
    const chatMessage = {
        id: "message-preserved",
        itemId: "message-preserved",
        threadId: "thread-preserved",
        turnId: "turn-preserved",
        role: "assistant" as const,
        title: "Codex",
        text: "保留的对话内容",
    };

    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const body =
            path === "/agent/codex/threads"
                ? { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: thread.id }, conversation, data: [thread] }
                : path === `/agent/codex/threads/${thread.id}`
                  ? { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: thread.id }, conversation, thread, messages: [chatMessage], settledTurnIds: ["turn-preserved"], historyReady: true }
                  : { ok: true, data: [], errors: [] };
        await route.fulfill({ json: body });
    });
    await page.goto("/");
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            url: "http://127.0.0.1:4173",
            token: "agent-state-token",
            connected: true,
            enabled: false,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "chat",
            conversation: { revision: 1, conversationId: "conversation-preserved", threadId: "thread-preserved", status: "ready", mcpStatuses: {} },
            messages: [{ id: "message-preserved", itemId: "message-preserved", threadId: "thread-preserved", turnId: "turn-preserved", role: "assistant", title: "Codex", text: "保留的对话内容" }],
            threads: [{ id: "thread-preserved", name: "保留的历史会话", preview: "保留的对话内容", status: "idle", createdAt: 1_788_000_000, updatedAt: 1_788_000_001 }],
            activeThreadId: "thread-preserved",
            workspacePath: "F:/isolated/workspace",
            eventLogs: [{ id: "log-preserved", time: "2026-08-28T00:00:00.000Z", title: "保留日志", text: "日志内容" }],
        });
    });

    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByText("保留的对话内容", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "连接设置，当前已连接" })).toBeVisible();
    await page.getByRole("button", { name: "收起 Agent", exact: true }).click();
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByText("保留的对话内容", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "历史 1" }).click();
    await expect(page.getByText("保留的历史会话", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "日志 1" }).click();
    await expect(page.getByText("保留日志", { exact: true })).toBeVisible();
    await expect(page.getByText("日志内容", { exact: true }).first()).toBeVisible();
});
