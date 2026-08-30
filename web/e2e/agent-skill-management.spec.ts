import { expect, test, type Page } from "@playwright/test";

type Skill = {
    name: string;
    description: string;
    shortDescription?: string;
    scope: "repo" | "user" | "system" | "admin";
    path: string;
    enabled: boolean;
    managed: boolean;
    interface?: { displayName?: string; shortDescription?: string; defaultPrompt?: string };
};

const revision = "a".repeat(64);

test("本地 Skill 管理支持搜索、来源筛选、加载错误、启停和托管创建", async ({ page }) => {
    const skills: Skill[] = [
        {
            name: "product-grid",
            description: "生成商品九宫格",
            scope: "repo",
            path: "F:\\site\\.agents\\skills\\product-grid\\SKILL.md",
            enabled: true,
            managed: true,
            interface: { displayName: "产品九宫格", shortDescription: "根据商品资料与参考图自动规划产品图片九宫格" },
        },
        { name: "personal-copy", description: "个人文案流程", scope: "user", path: "C:\\Users\\tester\\.codex\\skills\\personal-copy\\SKILL.md", enabled: true, managed: false, interface: { displayName: "个人文案" } },
        { name: "system-review", description: "系统审查流程", scope: "system", path: "C:\\ProgramData\\codex\\system-review\\SKILL.md", enabled: false, managed: false },
        { name: "admin-publish", description: "管理员发布流程", scope: "admin", path: "C:\\Admin\\skills\\admin-publish\\SKILL.md", enabled: true, managed: false },
    ];

    await installAgentHarness(page, skills);
    await openSkills(page);

    await expect(page.getByText("产品九宫格", { exact: true })).toBeVisible();
    await expect(page.getByText("个人文案", { exact: true })).toBeVisible();
    await expect(page.getByText("系统审查流程", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "1 个 Skill 未能加载" })).toBeVisible();

    await page.getByRole("button", { name: "1 个 Skill 未能加载" }).click();
    const errorsDialog = page.getByRole("dialog");
    await expect(errorsDialog.getByText("C:\\broken\\SKILL.md：frontmatter 无效", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("textbox", { name: "搜索 Skill" }).fill("个人");
    await expect(page.getByText("个人文案", { exact: true })).toBeVisible();
    await expect(page.getByText("产品九宫格", { exact: true })).toHaveCount(0);
    await page.getByRole("textbox", { name: "搜索 Skill" }).fill("");

    await page.getByRole("combobox", { name: "按来源筛选 Skill" }).click();
    await page.locator(".ant-select-dropdown:visible").getByText("个人", { exact: true }).click();
    await expect(page.getByText("个人文案", { exact: true })).toBeVisible();
    await expect(page.getByText("产品九宫格", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("编辑 个人文案")).toHaveCount(0);
    await page.getByRole("combobox", { name: "按来源筛选 Skill" }).click();
    await page.locator(".ant-select-dropdown:visible").getByText("全部来源", { exact: true }).click();
    await expect(page.getByLabel("产品九宫格 · 已启用")).toBeVisible();

    await page.getByLabel("产品九宫格 · 已启用").click();
    await expect(page.getByLabel("产品九宫格 · 已停用")).toBeVisible();

    await page.getByRole("button", { name: "创建 Skill" }).click();
    await page.getByText("空白创建", { exact: true }).click();
    const editor = page.getByRole("dialog");
    await editor.getByLabel("Skill 标识").fill("studio-brief");
    await editor.getByLabel("何时使用").fill("根据已确认的创意简报整理可复用的生成流程。");
    await editor.getByLabel("执行说明").fill("先核对创意简报，再输出结构化的执行步骤。");
    await editor.getByRole("button", { name: "创建 Skill" }).click();
    await expect(page.getByText("studio-brief", { exact: true })).toBeVisible();
    await expect(page.getByLabel("编辑 studio-brief")).toBeVisible();

    await page.getByLabel("编辑 studio-brief").click();
    await editor.getByLabel("显示名称").fill("工作室简报");
    await editor.getByRole("button", { name: "保存更改" }).click();
    await expect(page.getByText("工作室简报", { exact: true })).toBeVisible();

    await page.getByLabel("删除 工作室简报").click();
    const deleteDialog = page.locator(".ant-modal-confirm:visible");
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: /删\s*除/ }).click();
    await expect(page.getByText("工作室简报", { exact: true })).toHaveCount(0);
});

test("Skill 变更事件会让两个已连接页面同步重新读取列表", async ({ page }) => {
    const skills: Skill[] = [{ name: "product-grid", description: "生成商品九宫格", scope: "repo", path: "F:\\site\\.agents\\skills\\product-grid\\SKILL.md", enabled: true, managed: true }];
    await installAgentHarness(page, skills);
    const secondPage = await page.context().newPage();
    await openSkills(page);
    await openSkills(secondPage);
    await expect(page.getByText("product-grid", { exact: true })).toBeVisible();
    await expect(secondPage.getByText("product-grid", { exact: true })).toBeVisible();

    skills.push({ name: "shared-skill", description: "双标签同步的 Skill", scope: "repo", path: "F:\\site\\.agents\\skills\\shared-skill\\SKILL.md", enabled: true, managed: true });
    await Promise.all(
        [page, secondPage].map((target) =>
            target.evaluate(() => {
                const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
                source.emit("skills_changed", { forceReload: true });
            }),
        ),
    );
    await expect(page.getByText("shared-skill", { exact: true })).toBeVisible();
    await expect(secondPage.getByText("shared-skill", { exact: true })).toBeVisible();
});

test("创建 Skill 的 Dropdown/Menu 随浅深主题切换交互颜色", async ({ page }) => {
    const skills: Skill[] = [{ name: "product-grid", description: "生成商品九宫格", scope: "repo", path: "F:\\site\\.agents\\skills\\product-grid\\SKILL.md", enabled: true, managed: true }];
    await page.addInitScript(() => {
        localStorage.setItem("infinite-canvas:theme_store", JSON.stringify({ state: { theme: "light" }, version: 0 }));
    });
    await installAgentHarness(page, skills);
    await openSkills(page);

    const lightMenu = await openCreateSkillMenu(page);
    const lightColors = await readMenuColors(lightMenu.menu, lightMenu.activeItem);
    expect(lightColors.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(lightColors.activeBackground).not.toBe("rgba(0, 0, 0, 0)");

    await page.keyboard.press("Escape");
    await expect(page.locator(".ant-dropdown:visible")).toHaveCount(0);
    await page.getByRole("button", { name: "切换到深色主题" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    const darkMenu = await openCreateSkillMenu(page);
    const darkColors = await readMenuColors(darkMenu.menu, darkMenu.activeItem);
    expect(darkColors.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkColors.activeBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkColors).not.toEqual(lightColors);
});

test("断连后迟到的 Skill 列表和详情请求不会回写界面", async ({ page }) => {
    const skills: Skill[] = [{ name: "product-grid", description: "生成商品九宫格", scope: "repo", path: "F:\\site\\.agents\\skills\\product-grid\\SKILL.md", enabled: true, managed: true }];
    let delayList = false;
    let releaseList: (() => void) | undefined;
    let signalList: (() => void) | undefined;
    const listRequested = new Promise<void>((resolve) => {
        signalList = resolve;
    });
    let delayDetail = false;
    let releaseDetail: (() => void) | undefined;
    let signalDetail: (() => void) | undefined;
    const detailRequested = new Promise<void>((resolve) => {
        signalDetail = resolve;
    });
    await installAgentHarness(page, skills, {
        waitForList: async () => {
            if (!delayList) return;
            signalList?.();
            await new Promise<void>((resolve) => {
                releaseList = resolve;
            });
        },
        waitForDetail: async () => {
            if (!delayDetail) return;
            signalDetail?.();
            await new Promise<void>((resolve) => {
                releaseDetail = resolve;
            });
        },
    });
    await openSkills(page);

    delayList = true;
    await page.getByRole("button", { name: "重新读取 Skill" }).click();
    await listRequested;
    await disconnectSkills(page);
    delayList = false;
    releaseList?.();
    await expect(page.getByText("product-grid", { exact: true })).toHaveCount(0);

    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({ connected: true });
    });
    await expect(page.getByText("product-grid", { exact: true })).toBeVisible();
    delayDetail = true;
    await page.getByLabel("编辑 product-grid").click();
    await detailRequested;
    await disconnectSkills(page);
    releaseDetail?.();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("product-grid", { exact: true })).toHaveCount(0);
});

test("Skill 草稿入口校验来源且取消草稿不写入 Skill", async ({ page }) => {
    const skills: Skill[] = [];
    const draftRequests: Array<{ source: string; threadId: string; clientId: string }> = [];
    await installAgentHarness(page, skills, { onDraft: (input) => draftRequests.push(input) });
    await openSkills(page);

    await page.getByRole("button", { name: "创建 Skill" }).click();
    await expect(page.getByRole("menuitem", { name: /从当前对话生成草稿/ })).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("menuitem", { name: /从当前画布生成草稿/ })).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Escape");

    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({ activeThreadId: "thread-draft", messages: [{ id: "turn-draft", role: "user", content: "已完成对话", threadId: "thread-draft", turnId: "turn-draft" }], canvasContext: { snapshot: { hasCanvas: true } } });
    });
    await page.getByRole("button", { name: "创建 Skill" }).click();
    await page.getByRole("menuitem", { name: /从当前对话生成草稿/ }).click();
    const editor = page.getByRole("dialog");
    await expect(editor.getByLabel("Skill 标识")).toHaveValue("draft-flow");
    await editor.getByRole("button", { name: /取\s*消/ }).click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByText("draft-flow", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "创建 Skill" }).click();
    await expect(page.getByRole("menuitem", { name: /从当前画布生成草稿/ })).not.toHaveAttribute("aria-disabled", "true");
    await page.getByRole("menuitem", { name: /从当前画布生成草稿/ }).click();
    await expect(editor.getByLabel("Skill 标识")).toHaveValue("draft-flow");
    await editor.getByRole("button", { name: /取\s*消/ }).click();
    await expect(editor).toHaveCount(0);
    expect(draftRequests.map((request) => request.source)).toEqual(["conversation", "canvas"]);
    expect(draftRequests[0]).toMatchObject({ threadId: "thread-draft" });
    expect(draftRequests.every((request) => request.clientId.length > 0)).toBe(true);
    expect(skills).toEqual([]);
});

test("Skill 草稿生成期间双页面统一阻断操作，完成后恢复", async ({ page }) => {
    const skills: Skill[] = [{ name: "product-grid", description: "生成商品九宫格", scope: "repo", path: "F:\\site\\.agents\\skills\\product-grid\\SKILL.md", enabled: true, managed: true }];
    const draftRequests: Array<{ source: string; threadId: string; clientId: string }> = [];
    let releaseDraft: (() => void) | undefined;
    let signalDraftStarted: (() => void) | undefined;
    const draftStarted = new Promise<void>((resolve) => {
        signalDraftStarted = resolve;
    });
    await installAgentHarness(page, skills, {
        onDraft: (input) => draftRequests.push(input),
        waitForDraft: async () => {
            signalDraftStarted?.();
            await new Promise<void>((resolve) => {
                releaseDraft = resolve;
            });
        },
    });
    const secondPage = await page.context().newPage();
    await openSkills(page);
    await openSkills(secondPage);
    await Promise.all(
        [page, secondPage].map((target) =>
            target.evaluate(async () => {
                const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
                useAgentStore.setState({
                    activeThreadId: "thread-draft-running",
                    messages: [{ id: "turn-draft-running", role: "user", content: "已完成对话", threadId: "thread-draft-running", turnId: "turn-draft-running" }],
                    canvasContext: { snapshot: { hasCanvas: true } },
                });
            }),
        ),
    );

    await page.getByRole("button", { name: "创建 Skill" }).click();
    await page.getByRole("menuitem", { name: /从当前对话生成草稿/ }).click();
    await draftStarted;
    await expect(page.getByRole("button", { name: "创建 Skill" })).toBeDisabled();
    await expect(page.getByLabel("编辑 product-grid")).toBeDisabled();

    await secondPage.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("codex_state", { busy: true, threadId: "thread-draft-running" });
    });
    await expect(secondPage.getByRole("button", { name: "创建 Skill" })).toBeDisabled();
    await expect(secondPage.getByLabel("编辑 product-grid")).toBeDisabled();
    expect(draftRequests).toHaveLength(1);

    await secondPage.evaluate(() => {
        const source = (window as typeof window & { __agentEventSources: Array<{ emit: (type: string, payload: unknown) => void }> }).__agentEventSources.at(-1)!;
        source.emit("codex_state", { busy: false, threadId: "thread-draft-running" });
    });
    releaseDraft?.();
    await expect(page.getByRole("dialog").getByLabel("Skill 标识")).toHaveValue("draft-flow");
    await expect(secondPage.getByRole("button", { name: "创建 Skill" })).toBeEnabled();
    await expect(secondPage.getByLabel("编辑 product-grid")).toBeEnabled();
});

async function openCreateSkillMenu(page: Page) {
    await page.getByRole("button", { name: "创建 Skill" }).click();
    const dropdown = page.locator(".ant-dropdown:visible");
    const menu = dropdown.locator(".ant-dropdown-menu");
    const activeItem = menu.getByRole("menuitem", { name: /空白创建/ });
    await expect(menu).toBeVisible();
    await activeItem.hover();
    await expect(activeItem).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    return { menu, activeItem };
}

async function readMenuColors(menu: ReturnType<Page["locator"]>, activeItem: ReturnType<Page["locator"]>) {
    return menu
        .evaluate((element) => {
            const style = window.getComputedStyle(element);
            return { background: style.backgroundColor, border: style.borderTopColor, text: style.color };
        })
        .then(async (colors) => ({
            ...colors,
            activeBackground: await activeItem.evaluate((element) => window.getComputedStyle(element).backgroundColor),
        }));
}

async function disconnectSkills(page: Page) {
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        const { useAgentSkillStore } = await import("/src/stores/use-agent-skill-store.ts");
        useAgentStore.setState({ connected: false });
        useAgentSkillStore.getState().reset();
    });
}

async function installAgentHarness(
    page: Page,
    skills: Skill[],
    delays?: { waitForList?: () => Promise<void>; waitForDetail?: () => Promise<void>; waitForDraft?: () => Promise<void>; onDraft?: (input: { source: string; threadId: string; clientId: string }) => void },
) {
    await page.context().addInitScript(() => {
        class MockEventSource {
            static instances: MockEventSource[] = [];
            private listeners = new Map<string, Array<(event: MessageEvent) => void>>();
            constructor() {
                MockEventSource.instances.push(this);
            }
            addEventListener(type: string, listener: (event: MessageEvent) => void) {
                this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
            }
            close() {}
            emit(type: string, payload: unknown) {
                for (const listener of this.listeners.get(type) || []) listener({ data: JSON.stringify(payload) } as MessageEvent);
            }
        }
        Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
        Object.assign(window, { __agentEventSources: MockEventSource.instances });
    });
    await page.context().route("http://127.0.0.1:4173/canvas/state**", async (route) => {
        await route.fulfill({ json: { ok: true } });
    });
    await page.context().route("http://127.0.0.1:4173/agent/**", async (route) => {
        const url = new URL(route.request().url());
        const { pathname } = url;
        if (pathname === "/agent/codex/skills" && route.request().method() === "GET") {
            await delays?.waitForList?.();
            await route.fulfill({ json: { ok: true, data: skills, errors: ["C:\\broken\\SKILL.md：frontmatter 无效"] } });
            return;
        }
        if (pathname === "/agent/codex/skills" && route.request().method() === "POST") {
            const input = route.request().postDataJSON() as { name: string; description: string; interface?: Skill["interface"] };
            skills.push({ name: input.name, description: input.description, scope: "repo", path: `F:\\site\\.agents\\skills\\${input.name}\\SKILL.md`, enabled: true, managed: true, interface: input.interface });
            await route.fulfill({ status: 201, json: { ok: true, data: { ...skills.at(-1), instructions: "先核对创意简报，再输出结构化的执行步骤。", revision } } });
            return;
        }
        if (pathname === "/agent/codex/skills/draft" && route.request().method() === "POST") {
            const input = route.request().postDataJSON() as { source: string; threadId: string; clientId: string };
            delays?.onDraft?.(input);
            await delays?.waitForDraft?.();
            await route.fulfill({
                json: {
                    ok: true,
                    data: {
                        name: "draft-flow",
                        displayName: "草稿流程",
                        description: "根据已完成上下文整理可复用的流程。",
                        instructions: "先核对输入，再按步骤执行。",
                        shortDescription: "根据完成上下文整理可复用执行步骤的草稿",
                        defaultPrompt: "$draft-flow 根据当前上下文执行",
                    },
                },
            });
            return;
        }
        const detailMatch = pathname.match(/^\/agent\/codex\/skills\/([^/]+)$/);
        if (detailMatch) {
            const name = decodeURIComponent(detailMatch[1]);
            const skill = skills.find((item) => item.name === name);
            if (!skill) {
                await route.fulfill({ status: 404, json: { ok: false, error: "找不到指定 Skill" } });
                return;
            }
            if (route.request().method() === "GET") {
                await delays?.waitForDetail?.();
                await route.fulfill({ json: { ok: true, data: { ...skill, instructions: "先核对创意简报，再输出结构化的执行步骤。", revision } } });
                return;
            }
            const input = route.request().postDataJSON() as { description: string; interface?: Skill["interface"] };
            skill.description = input.description;
            skill.interface = input.interface;
            await route.fulfill({ json: { ok: true, data: { ...skill, instructions: "先核对创意简报，再输出结构化的执行步骤。", revision } } });
            return;
        }
        const enabledMatch = pathname.match(/^\/agent\/codex\/skills\/([^/]+)\/enabled$/);
        if (enabledMatch) {
            const input = route.request().postDataJSON() as { enabled: boolean };
            const skill = skills.find((item) => item.name === decodeURIComponent(enabledMatch[1]));
            if (skill) skill.enabled = input.enabled;
            await route.fulfill({ json: { ok: true } });
            return;
        }
        const deleteMatch = pathname.match(/^\/agent\/codex\/skills\/([^/]+)\/delete$/);
        if (deleteMatch) {
            const name = decodeURIComponent(deleteMatch[1]);
            const index = skills.findIndex((item) => item.name === name);
            if (index >= 0) skills.splice(index, 1);
            await route.fulfill({ json: { ok: true } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], workspace: { activeThreadId: "" }, conversation: { revision: 1, conversationId: "skills", threadId: "", status: "ready", mcpStatuses: {} } } });
    });
}

async function openSkills(page: Page) {
    await page.goto("/");
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            url: "http://127.0.0.1:4173",
            token: "agent-skill-management-token",
            connected: true,
            enabled: true,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "skills",
            activeThreadId: "",
            conversation: { revision: 1, conversationId: "skills", threadId: "", status: "ready", mcpStatuses: {} },
            prompt: "",
            messages: [],
            eventLogs: [],
            threads: [],
            loadingThreads: false,
            sending: false,
            waiting: false,
        });
    });
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByText("本地 Skill", { exact: true })).toBeVisible();
}
