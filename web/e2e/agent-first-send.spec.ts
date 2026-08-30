import { expect, test } from "@playwright/test";

const productGridSkill = {
    name: "product-grid",
    description: "将产品信息整理为九宫格内容。",
    shortDescription: "根据产品信息生成九宫格内容",
    interface: { displayName: "产品九宫格", shortDescription: "根据产品信息生成九宫格内容" },
    path: "F:/isolated/workspace/.agents/skills/product-grid/SKILL.md",
    scope: "repo" as const,
    enabled: true,
    managed: true,
};

async function openReadyAgent(page: import("@playwright/test").Page, turn: (route: import("@playwright/test").Route) => Promise<void>, skills = [] as (typeof productGridSkill)[]) {
    const conversation = { revision: 1, conversationId: "conversation-send", threadId: "thread-send", status: "ready" as const, mcpStatuses: {} };
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/turn") return await turn(route);
        if (path === "/agent/codex/threads/reset") return await route.fulfill({ json: { ok: true, conversation: { ...conversation, threadId: "" } } });
        if (path === "/agent/codex/threads") return await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-send" }, conversation, data: [] } });
        if (path === "/agent/codex/skills") return await route.fulfill({ json: { ok: true, data: skills, errors: [] } });
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            url: "http://127.0.0.1:4173",
            token: "agent-first-send-token",
            connected: true,
            enabled: false,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "chat",
            activeThreadId: "thread-send",
            conversation: { revision: 1, conversationId: "conversation-send", threadId: "thread-send", status: "ready", mcpStatuses: {} },
            messages: [],
            threads: [],
            loadingThreads: false,
            sending: false,
            waiting: false,
        });
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
    const turnAllowed = new Promise<void>((resolve) => {
        allowTurn = resolve;
    });
    let turnStarted: () => void;
    const turnRequested = new Promise<void>((resolve) => {
        turnStarted = resolve;
    });
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

test("通过 / 选择 Skill 以正文 token 发送，失败保留且成功后清除选择", async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];
    let failTurn = true;
    await openReadyAgent(
        page,
        async (route) => {
            requests.push(route.request().postDataJSON() as Record<string, unknown>);
            if (failTurn) return await route.fulfill({ status: 500, json: { ok: false, error: "Skill 发送失败" } });
            await route.fulfill({ json: { ok: true, threadId: "thread-send" } });
        },
        [productGridSkill],
    );
    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await prompt.fill("请整理产品信息 /");
    await expect(page.getByRole("button", { name: /产品九宫格/ })).toBeVisible();
    await prompt.press("Enter");
    const skillToken = prompt.locator("[data-agent-token-kind='skill'][data-skill-name='product-grid']");
    await expect(skillToken).toBeVisible();
    await expect(prompt).toHaveText("请整理产品信息 /产品九宫格");

    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByText("Skill 发送失败", { exact: true })).toBeVisible();
    await expect(skillToken).toBeVisible();
    await expect.poll(async () => page.evaluate(async () => (await import("/src/stores/use-agent-skill-store.ts")).useAgentSkillStore.getState().selectedSkill?.name)).toBe("product-grid");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ prompt: "请整理产品信息 $product-grid", skill: { name: "product-grid", path: productGridSkill.path } });

    failTurn = false;
    await page.getByRole("button", { name: "发送" }).click();
    await expect.poll(() => requests.length).toBe(2);
    await expect.poll(async () => page.evaluate(async () => (await import("/src/stores/use-agent-skill-store.ts")).useAgentSkillStore.getState().selectedSkill)).toBeNull();
    await expect(prompt).toHaveText("");
    expect(requests[1]).toMatchObject({ prompt: "请整理产品信息 $product-grid", skill: { name: "product-grid", path: productGridSkill.path } });
});

test("新对话和重新读取后的停用 Skill 都会撤销正文 token 与结构化选择", async ({ page }) => {
    const skills = [{ ...productGridSkill }];
    await openReadyAgent(
        page,
        async (route) => {
            await route.fulfill({ json: { ok: true, threadId: "thread-send" } });
        },
        skills,
    );
    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await prompt.fill("请执行 /");
    await page.getByRole("button", { name: /产品九宫格/ }).click();
    const skillToken = prompt.locator("[data-agent-token-kind='skill'][data-skill-name='product-grid']");
    await expect(skillToken).toBeVisible();

    skills[0] = { ...skills[0], enabled: false };
    await page.evaluate(async () => {
        const [{ useAgentSkillStore }, { useAgentStore }] = await Promise.all([import("/src/stores/use-agent-skill-store.ts"), import("/src/stores/use-agent-store.ts")]);
        const agent = useAgentStore.getState();
        await useAgentSkillStore.getState().loadSkills(agent.url, agent.token, true);
    });
    await expect.poll(async () => page.evaluate(async () => (await import("/src/stores/use-agent-skill-store.ts")).useAgentSkillStore.getState().selectedSkill)).toBeNull();
    await expect(skillToken).toHaveCount(0);
    await expect(prompt.evaluate((element) => element.textContent?.trim())).resolves.toBe("请执行");

    skills[0] = { ...skills[0], enabled: true };
    await page.evaluate(async () => {
        const [{ useAgentSkillStore }, { useAgentStore }] = await Promise.all([import("/src/stores/use-agent-skill-store.ts"), import("/src/stores/use-agent-store.ts")]);
        const agent = useAgentStore.getState();
        await useAgentSkillStore.getState().loadSkills(agent.url, agent.token, true);
    });
    await prompt.fill("新对话 /");
    await page.getByRole("button", { name: /产品九宫格/ }).click();
    await expect(skillToken).toBeVisible();
    await page.getByRole("button", { name: "新对话", exact: true }).click();
    await expect.poll(async () => page.evaluate(async () => (await import("/src/stores/use-agent-skill-store.ts")).useAgentSkillStore.getState().selectedSkill)).toBeNull();
    await expect(skillToken).toHaveCount(0);
});

test("通过 @ 选择画布素材作为正文 token，并以精确节点元数据发送", async ({ page }) => {
    const requests: Array<Record<string, unknown>> = [];
    await openReadyAgent(page, async (route) => {
        requests.push(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({ json: { ok: true, threadId: "thread-send" } });
    });
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        const snapshot = {
            projectId: "reference-project",
            title: "引用素材画布",
            nodes: [{ id: "reference-text", type: "text", title: "产品说明", position: { x: 0, y: 0 }, width: 240, height: 120, metadata: { content: "适合夏季通勤的轻量防晒衣" } }],
            connections: [],
            selectedNodeIds: ["reference-text"],
            viewport: { x: 0, y: 0, k: 1 },
        };
        useAgentStore.getState().setCanvasContext({ snapshot, applyOps: () => snapshot, undoOps: () => null, canUndo: false });
    });
    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    await prompt.fill("请改写 @");
    await expect(page.getByRole("button", { name: /产品说明/ })).toBeVisible();
    await prompt.press("Tab");
    const referenceToken = prompt.locator("[data-agent-token-kind='resource'][data-node-id='reference-text']");
    await expect(referenceToken).toBeVisible();
    await expect(prompt).toHaveText("请改写 @文本1");

    await page.getByRole("button", { name: "发送" }).click();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toMatchObject({
        messageText: "请改写 @文本1",
        messageMetadata: { canvasReferences: [{ nodeId: "reference-text", label: "文本1", title: "产品说明", kind: "text", text: "适合夏季通勤的轻量防晒衣" }] },
    });
    expect(String(requests[0].prompt)).toContain('mention="@文本1", nodeId="reference-text", title="产品说明", type=text');
    await expect(page.getByLabel(/产品说明/)).toBeVisible();
});

test("多媒体画布引用支持悬浮预览，并由 Backspace/Delete 原子移除", async ({ page }) => {
    await openReadyAgent(page, async (route) => {
        await route.fulfill({ json: { ok: true, threadId: "thread-send" } });
    });
    const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const video = "data:video/mp4;base64,AAAA";
    const audio = "data:audio/mpeg;base64,AAAA";
    await page.evaluate(
        async ({ image, video, audio }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            const snapshot = {
                projectId: "media-reference-project",
                title: "多媒体引用画布",
                nodes: [
                    { id: "reference-image", type: "image", title: "隔离图片", position: { x: 0, y: 0 }, width: 240, height: 120, metadata: { content: image } },
                    { id: "reference-video", type: "video", title: "隔离视频", position: { x: 260, y: 0 }, width: 240, height: 120, metadata: { content: video } },
                    { id: "reference-audio", type: "audio", title: "隔离音频", position: { x: 520, y: 0 }, width: 240, height: 120, metadata: { content: audio } },
                ],
                connections: [],
                selectedNodeIds: ["reference-image", "reference-video", "reference-audio"],
                viewport: { x: 0, y: 0, k: 1 },
            };
            useAgentStore.getState().setCanvasContext({ snapshot, applyOps: () => snapshot, undoOps: () => null, canUndo: false });
        },
        { image, video, audio },
    );
    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    for (const title of ["隔离图片", "隔离视频", "隔离音频"]) {
        await prompt.pressSequentially("@");
        await page.getByRole("button", { name: new RegExp(title) }).click();
    }

    const imageToken = prompt.locator("[data-agent-token-kind='resource'][data-node-id='reference-image']");
    const videoToken = prompt.locator("[data-agent-token-kind='resource'][data-node-id='reference-video']");
    const audioToken = prompt.locator("[data-agent-token-kind='resource'][data-node-id='reference-audio']");
    await expect(imageToken).toBeVisible();
    await expect(videoToken).toBeVisible();
    await expect(audioToken).toBeVisible();

    await imageToken.hover();
    await expect(page.getByRole("img", { name: "隔离图片" })).toBeVisible();
    await videoToken.hover();
    await expect(page.locator("video").filter({ has: page.locator("source") })).toHaveCount(0);
    await expect(page.locator("video")).toBeVisible();
    await audioToken.hover();
    await expect(page.locator("audio")).toBeVisible();

    await placeCaretAdjacentToToken(videoToken, "after");
    await prompt.press("Backspace");
    await expect(videoToken).toHaveCount(0);
    await expect.poll(async () => page.evaluate(async () => (await import("/src/stores/use-agent-store.ts")).useAgentStore.getState().canvasReferences.map((item) => item.nodeId))).toEqual(["reference-image", "reference-audio"]);

    await placeCaretAdjacentToToken(audioToken, "before");
    await prompt.press("Delete");
    await expect(audioToken).toHaveCount(0);
    await expect.poll(async () => page.evaluate(async () => (await import("/src/stores/use-agent-store.ts")).useAgentStore.getState().canvasReferences.map((item) => item.nodeId))).toEqual(["reference-image"]);
});

async function placeCaretAdjacentToToken(token: import("@playwright/test").Locator, side: "before" | "after") {
    await token.evaluate((element, side) => {
        const range = document.createRange();
        if (side === "before") range.setStartBefore(element);
        else range.setStartAfter(element);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        (element.parentElement as HTMLElement | null)?.focus();
    }, side);
}
