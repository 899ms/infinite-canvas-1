import { expect, test, type Page } from "@playwright/test";

const defaultSources = [
    { id: "banana-prompt-quicker", name: "Banana Prompt Quicker" },
    { id: "davidwu-gpt-image2-prompts", name: "DavidWu GPT Image 2" },
    { id: "awesome-gpt-image", name: "Awesome GPT Image" },
    { id: "awesome-gpt4o-image-prompts", name: "Awesome GPT-4o" },
    { id: "youmind-gpt-image-2", name: "YouMind GPT Image 2" },
    { id: "youmind-nano-banana-pro", name: "YouMind Nano Banana Pro" },
];

test("默认来源可独立启用，并支持来源和标签筛选", async ({ page }) => {
    await page.route("**/yukkcat/image-prompts/main/dist/sources/*.json", async (route) => {
        const id = new URL(route.request().url()).pathname.split("/").pop()?.replace(".json", "") || "";
        const source = defaultSources.find((item) => item.id === id);
        if (!source) return route.fulfill({ status: 404 });
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify([
                {
                    id: source.id,
                    title: `${source.name} 提示词`,
                    prompt: `来自 ${source.name} 的隔离提示词。`,
                    description: "",
                    coverUrl: "",
                    referenceImageUrls: [],
                    tags: source.id === "banana-prompt-quicker" ? ["香蕉标签"] : [source.id],
                    preview: "",
                    createdAt: "2026-08-28T00:00:00.000Z",
                    updatedAt: "2026-08-28T00:00:00.000Z",
                },
            ]),
        });
    });

    await page.goto("/prompts");
    await expect(page.getByText("当前共 6 条提示词", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "香蕉标签", exact: true }).click();
    await expect(page.getByText("当前共 1 条提示词", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "all", exact: true }).last().click();
    await page.getByRole("button", { name: "Banana Prompt Quicker", exact: true }).click();
    await expect(page.getByText("当前共 1 条提示词", { exact: true })).toBeVisible();

    await page.goto("/config");
    await page.getByRole("tab", { name: "提示词来源" }).click();
    await page.getByRole("switch", { name: "Banana Prompt Quicker · 启用来源" }).click();
    await page.reload();
    await page.goto("/prompts");
    await expect(page.getByText("当前共 5 条提示词", { exact: true })).toBeVisible();
});

test("迁移后的 Freestylefly 来源仍可拉取并按来源筛选", async ({ page }) => {
    const legacyUrl = "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/freestylefly-gpt-image-2.json";
    let requested = false;
    await page.addInitScript(
        ({ legacyUrl, defaults }) => {
            localStorage.setItem(
                "infinite-canvas:prompt_source_store_v2",
                JSON.stringify({
                    state: {
                        sources: [
                            ...defaults.map((source: { id: string; name: string }) => ({ ...source, url: `https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/${source.id}.json`, homepage: "", enabled: false, builtIn: true })),
                            { id: "freestylefly-gpt-image-2", name: "Freestylefly GPT Image 2", url: legacyUrl, homepage: "https://github.com/freestylefly/awesome-gpt-image-2", enabled: true, builtIn: true },
                        ],
                        schedule: { intervalMinutes: 0, lastFetchedAt: "" },
                    },
                    version: 0,
                }),
            );
        },
        { legacyUrl, defaults: defaultSources },
    );
    await page.route(legacyUrl, async (route) => {
        requested = true;
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify([sourcePrompt("Freestylefly 隔离提示词")]),
        });
    });

    await page.goto("/prompts");
    await expect(page.getByText("当前共 1 条提示词", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Freestylefly GPT Image 2", exact: true }).click();
    await expect(page.getByText("Freestylefly 隔离提示词", { exact: true })).toBeVisible();
    expect(requested).toBe(true);

    await page.goto("/config");
    await page.getByRole("tab", { name: "提示词来源" }).click();
    await expect(page.getByRole("switch", { name: "Freestylefly GPT Image 2 · 启用来源" })).toBeChecked();
});

test("自定义 JSON 来源的非数组或不可访问刷新会显示失败并保留旧缓存", async ({ page }) => {
    let failureMode: "invalid" | "offline" | null = null;
    await mountCustomSources(page);
    await page.route("**/prompt-source-valid.json", async (route) => {
        if (failureMode === "invalid") return route.fulfill({ contentType: "application/json", body: JSON.stringify({ unexpected: true }) });
        await route.fulfill({ contentType: "application/json", body: JSON.stringify([sourcePrompt("非数组来源缓存")]) });
    });
    await page.route("**/prompt-source-offline.json", async (route) => {
        if (failureMode === "offline") return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "offline" }) });
        await route.fulfill({ contentType: "application/json", body: JSON.stringify([sourcePrompt("不可访问来源缓存")]) });
    });

    await page.goto("/config");
    await page.getByRole("tab", { name: "提示词来源" }).click();
    for (const source of ["标准 JSON 来源", "不可访问来源"]) {
        const row = sourceRow(page, source);
        await row.getByRole("button", { name: "查看内容" }).click();
        await expect(page.getByRole("dialog", { name: `${source} · 提示词内容` })).toContainText("来源缓存");
        await page
            .getByRole("dialog", { name: `${source} · 提示词内容` })
            .getByRole("button", { name: "关闭" })
            .click();
    }

    failureMode = "invalid";
    await sourceRow(page, "标准 JSON 来源").getByRole("button", { name: "立即拉取" }).click();
    await expect(sourceRow(page, "标准 JSON 来源").getByText("失败", { exact: true })).toBeVisible();
    failureMode = "offline";
    await sourceRow(page, "不可访问来源").getByRole("button", { name: "立即拉取" }).click();
    await expect(sourceRow(page, "不可访问来源").getByText("失败", { exact: true })).toBeVisible();

    for (const source of ["标准 JSON 来源", "不可访问来源"]) {
        const row = sourceRow(page, source);
        await row.getByRole("button", { name: "查看内容" }).click();
        await expect(page.getByRole("dialog", { name: `${source} · 提示词内容` })).toContainText("来源缓存");
        await page
            .getByRole("dialog", { name: `${source} · 提示词内容` })
            .getByRole("button", { name: "关闭" })
            .click();
    }
});

test("提示词来源界面以卡片展示状态和带文字操作，定时拉取区保持独立", async ({ page }) => {
    await mountCustomSources(page);
    await page.route("**/prompt-source-valid.json", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify([sourcePrompt("来源界面缓存")]) });
    });
    await page.route("**/prompt-source-offline.json", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify([sourcePrompt("第二来源缓存")]) });
    });

    await page.goto("/config");
    await page.getByRole("tab", { name: "提示词来源" }).click();
    const row = sourceRow(page, "标准 JSON 来源");
    const enabled = row.getByRole("switch", { name: "标准 JSON 来源 · 启用来源" });
    await expect(enabled).toBeVisible();
    await expect(row.getByText("0 条", { exact: true })).toBeVisible();
    await expect(row.getByText("尚未拉取", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "查看内容" })).toBeVisible();
    await expect(row.getByRole("button", { name: "立即拉取" })).toBeVisible();
    await expect(row.getByRole("button", { name: "编辑来源" })).toBeVisible();
    await expect(row.getByRole("button", { name: "删除" })).toBeVisible();
    const [switchBox, titleBox] = await Promise.all([enabled.boundingBox(), page.getByText("标准 JSON 来源", { exact: true }).boundingBox()]);
    expect(switchBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(switchBox!.x).toBeLessThan(titleBox!.x);

    const schedule = page.getByText("定时拉取", { exact: true }).locator("..");
    expect(await schedule.evaluate((element) => getComputedStyle(element).borderTopWidth)).not.toBe("0px");
    await row.getByRole("button", { name: "立即拉取" }).click();
    await expect(row.getByText("1 条", { exact: true })).toBeVisible();
    await expect(row.getByText("正常", { exact: true })).toBeVisible();
    await expect(row.getByText(/上次成功/)).toBeVisible();
});

function sourceRow(page: Page, name: string) {
    return page.getByText(name, { exact: true }).locator("xpath=../../..");
}

function sourcePrompt(title: string) {
    return {
        id: title,
        title,
        prompt: "失败后仍可查看的旧缓存。",
        description: "",
        coverUrl: "",
        referenceImageUrls: [],
        tags: ["缓存"],
        preview: "",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
    };
}

async function mountCustomSources(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem(
            "infinite-canvas:prompt_source_store_v2",
            JSON.stringify({
                state: {
                    sources: [
                        { id: "valid-json", name: "标准 JSON 来源", url: "http://127.0.0.1:4173/prompt-source-valid.json", homepage: "", enabled: true, builtIn: false },
                        { id: "offline-json", name: "不可访问来源", url: "http://127.0.0.1:4173/prompt-source-offline.json", homepage: "", enabled: true, builtIn: false },
                    ],
                    schedule: { intervalMinutes: 0, lastFetchedAt: "" },
                },
                version: 0,
            }),
        );
    });
}
