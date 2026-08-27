import { expect, test, type Page } from "@playwright/test";

const now = "2026-08-28T00:00:00.000Z";
const fields = {
    subject: ["ceramic vase"],
    composition: ["centered product shot"],
    color: ["warm white"],
    lighting: ["softbox lighting"],
    material: ["matte ceramic"],
    layout: ["single object"],
    mood: ["calm"],
    rendering: ["photorealistic"],
    technical: ["1:1"],
    negative: ["text", "watermark"],
};
const translation = {
    fields: {
        subject: ["陶瓷花瓶"],
        composition: ["居中产品摄影"],
        color: ["暖白色"],
        lighting: ["柔光箱照明"],
        material: ["哑光陶瓷"],
        layout: ["单一物体"],
        mood: ["平静"],
        rendering: ["照片级真实"],
        technical: ["1:1"],
        negative: ["文字", "水印"],
    },
    compiledPrompt: "一个哑光陶瓷花瓶，居中产品摄影，柔光箱照明，暖白色背景。",
};
const brief = {
    id: "brief-prompt-language",
    profileId: "default",
    subject: "语言审核夹具",
    purpose: "隔离浏览器验收",
    aspectRatio: "1:1",
    constraints: { keep: [], avoid: [] },
    referenceImageIds: [],
    strategy: "balanced",
    createdAt: now,
};
const basePrompt = {
    id: "prompt-prompt-language",
    briefId: brief.id,
    revision: 1,
    fields,
    compiledPrompt: "A matte ceramic vase, centered product shot, softbox lighting, warm white background.",
    reason: "用固定英文执行 Prompt 验证审核语言。",
    diff: { keep: [], add: [], change: [], remove: [], avoid: [] },
    referenceImageIds: [],
    createdAt: now,
};

test("FrameFlow Prompt 默认中文审核并保持英文执行原文", async ({ page }) => {
    let approved = false;
    const commands: Array<{ type?: string; promptVersionId?: string }> = [];
    await mountPromptFixture(page, {
        translated: true,
        commands,
        onApprove: () => {
            approved = true;
        },
    });

    await createPrompt(page);
    await expect(page.getByText("陶瓷花瓶", { exact: true })).toBeVisible();
    await expect(page.getByText(basePrompt.compiledPrompt, { exact: true })).toHaveCount(0);

    const language = page.getByRole("radiogroup", { name: "Prompt 展示语言" });
    await language.getByText("English", { exact: true }).click();
    await expect(page.getByText(basePrompt.compiledPrompt, { exact: true })).toBeVisible();
    await language.getByText("中英对照", { exact: true }).click();
    await expect(page.getByText("陶瓷花瓶", { exact: true })).toBeVisible();
    await expect(page.getByText(basePrompt.compiledPrompt, { exact: true })).toBeVisible();
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

    await page.getByRole("button", { name: "批准 Prompt" }).click();
    await expect(page.getByRole("button", { name: "开始生成 4 张" })).toBeVisible();
    await page.getByRole("button", { name: "开始生成 4 张" }).click();
    await expect(page).toHaveURL(/view=lineage.*runId=run-prompt-language/);
    expect(approved).toBe(true);
    expect(commands.map((command) => command.type)).toEqual(["brief.create", "round.plan", "prompt.approve", "run.start"]);
    expect(commands.filter((command) => command.type === "prompt.approve" || command.type === "run.start").map((command) => command.promptVersionId)).toEqual([basePrompt.id, basePrompt.id]);
});

test("历史 Prompt 补译后保持中文展示且不会重复翻译", async ({ page }) => {
    let translated = false;
    const commands: Array<{ type?: string }> = [];
    await mountPromptFixture(page, {
        translated: false,
        commands,
        onTranslate: () => {
            translated = true;
        },
    });

    await createPrompt(page);
    await expect(page.getByText("旧版本尚无中文展示稿", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "生成中文版本" }).click();
    await expect(page.getByText(translation.compiledPrompt, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "生成中文版本" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(translation.compiledPrompt, { exact: true })).toBeVisible();
    expect(commands.map((command) => command.type)).toEqual(["brief.create", "round.plan", "prompt.translate"]);
});

async function createPrompt(page: Page) {
    await page.goto("/frameflow?view=create");
    await page.getByLabel("主体").fill(brief.subject);
    await page.getByRole("button", { name: "让 Codex 生成 Prompt" }).click();
    await expect(page.getByRole("heading", { name: "Prompt Version 1" })).toBeVisible();
}

async function mountPromptFixture(page: Page, options: { translated: boolean; commands: Array<{ type?: string; promptVersionId?: string }>; onApprove?: () => void; onTranslate?: () => void }) {
    let hasTranslation = options.translated;
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-prompt-language-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const prompt = { ...basePrompt, status: options.commands.some((command) => command.type === "prompt.approve") ? ("approved" as const) : ("draft" as const), ...(hasTranslation ? { translations: { "zh-CN": translation } } : {}) };
        const data =
            query.type === "brief.detail"
                ? { type: "brief.detail", brief }
                : query.type === "prompt.lineage"
                  ? { type: "prompt.lineage", promptVersionId: basePrompt.id, versions: [prompt], decisions: [] }
                  : query.type === "run.list"
                    ? { type: "run.list", runs: [] }
                    : query.type === "auto_run.list"
                      ? { type: "auto_run.list", autoRuns: [] }
                      : { type: "quarantine.list", items: [] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        const command = route.request().postDataJSON() as { type?: string; promptVersionId?: string };
        options.commands.push(command);
        if (command.type === "prompt.approve") options.onApprove?.();
        if (command.type === "prompt.translate") {
            hasTranslation = true;
            options.onTranslate?.();
        }
        const resource =
            command.type === "brief.create"
                ? { type: "brief", id: brief.id }
                : command.type === "round.plan" || command.type === "prompt.translate" || command.type === "prompt.approve"
                  ? { type: "prompt_version", id: basePrompt.id }
                  : { type: "run", id: "run-prompt-language" };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource } }) });
    });
}
