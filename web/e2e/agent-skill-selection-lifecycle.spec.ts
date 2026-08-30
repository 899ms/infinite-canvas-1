import { expect, test, type Page } from "@playwright/test";

const skill = {
    name: "product-grid",
    description: "将产品信息整理为九宫格内容。",
    path: "F:/isolated/workspace/.agents/skills/product-grid/SKILL.md",
    scope: "repo" as const,
    enabled: true,
    managed: true,
    interface: { displayName: "产品九宫格", shortDescription: "根据产品信息生成九宫格内容" },
};
const revision = "a".repeat(64);

test("删除已选托管 Skill 会清除正文 token 与结构化选择", async ({ page }) => {
    const skills = [{ ...skill }];
    await openSkillManager(page, skills);
    await page.getByRole("button", { name: "使用", exact: true }).click();

    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    const token = prompt.locator("[data-agent-token-kind='skill'][data-skill-name='product-grid']");
    await expect(token).toBeVisible();
    await expect.poll(() => selectedSkillName(page)).toBe("product-grid");

    await page.getByRole("tab", { name: /技能/ }).click();
    await page.getByLabel("删除 产品九宫格").click();
    await page
        .locator(".ant-modal-confirm:visible")
        .getByRole("button", { name: /删\s*除/ })
        .click();
    await expect(page.getByText("产品九宫格", { exact: true })).toHaveCount(0);
    await expect.poll(() => selectedSkillName(page)).toBeNull();

    await page.getByRole("tab", { name: "对话" }).click();
    await expect(token).toHaveCount(0);
});

test("断开连接会清除已选 Skill 的正文 token 与结构化选择", async ({ page }) => {
    await openSkillManager(page, [{ ...skill }], true);
    await page.getByRole("button", { name: "使用", exact: true }).click();

    const prompt = page.getByRole("textbox", { name: "询问 Codex，输入 / 使用技能，@ 引用画布素材" });
    const token = prompt.locator("[data-agent-token-kind='skill'][data-skill-name='product-grid']");
    await expect(token).toBeVisible();
    await expect.poll(() => selectedSkillName(page)).toBe("product-grid");

    await page.getByRole("button", { name: /连接设置/ }).click();
    await page.getByRole("button", { name: "断开", exact: true }).click();
    await expect.poll(() => selectedSkillName(page)).toBeNull();
    await page.getByRole("tab", { name: "对话" }).click();
    await expect(token).toHaveCount(0);
});

async function openSkillManager(page: Page, skills: (typeof skill)[], enabled = false) {
    await page.addInitScript(() => {
        class MockEventSource extends EventTarget {
            close() {}
        }
        Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
    });
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === "/agent/codex/skills" && route.request().method() === "GET") {
            await route.fulfill({ json: { ok: true, data: skills, errors: [] } });
            return;
        }
        const detailMatch = pathname.match(/^\/agent\/codex\/skills\/([^/]+)$/);
        if (detailMatch && route.request().method() === "GET") {
            const current = skills.find((item) => item.name === decodeURIComponent(detailMatch[1]));
            await route.fulfill(current ? { json: { ok: true, data: { ...current, instructions: "先核对输入，再输出九宫格。", revision } } } : { status: 404, json: { ok: false, error: "找不到指定 Skill" } });
            return;
        }
        const deleteMatch = pathname.match(/^\/agent\/codex\/skills\/([^/]+)\/delete$/);
        if (deleteMatch) {
            const index = skills.findIndex((item) => item.name === decodeURIComponent(deleteMatch[1]));
            if (index >= 0) skills.splice(index, 1);
            await route.fulfill({ json: { ok: true } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [] } });
    });
    await page.goto("/");
    await page.evaluate(
        async ({ enabled }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-skill-selection-token",
                connected: true,
                enabled,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "skills",
                activeThreadId: "",
                conversation: { revision: 1, conversationId: "skill-selection", threadId: "", status: "ready", mcpStatuses: {} },
                prompt: "",
                messages: [],
                eventLogs: [],
                threads: [],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { enabled },
    );
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(page.getByText("产品九宫格", { exact: true })).toBeVisible();
}

async function selectedSkillName(page: Page) {
    return await page.evaluate(async () => (await import("/src/stores/use-agent-skill-store.ts")).useAgentSkillStore.getState().selectedSkill?.name || null);
}
