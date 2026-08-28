import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const promptSourceStoreKey = "infinite-canvas:prompt_source_store_v2";
const builtInSourceIds = ["banana-prompt-quicker", "davidwu-gpt-image2-prompts", "awesome-gpt-image", "awesome-gpt4o-image-prompts", "youmind-gpt-image-2", "youmind-nano-banana-pro"];
const fixtureUrl = "http://127.0.0.1:4173/canvas-prompt-library-fixture.json";
const fixture = readFileSync(new URL("../qa-fixtures/prompt-migration.json", import.meta.url), "utf8");
const publicPrompt = {
    id: "canvas-library-public-prompt",
    title: "无需展开来源的画布搜索命中",
    prompt: "公开来源提示词可直接按关键字搜索。",
    description: "隔离浏览器夹具",
    coverUrl: "",
    referenceImageUrls: [],
    tags: ["画布搜索"],
    preview: "",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
};

test("画布提示词库直接搜索公开来源，并以提示词标题插入文本节点", async ({ page }) => {
    await mountPromptSource(page);
    await page.route("**/canvas-prompt-library-fixture.json", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify([publicPrompt]) });
    });

    await page.goto("/prompts");
    await expect(page.getByRole("tab", { name: "我的提示词", exact: true })).toHaveCount(0);
    const search = page.getByPlaceholder("搜索标题、内容或标签");
    await search.fill("无需展开来源");
    await expect(page.getByText(publicPrompt.title, { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "我的仪表盘" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "prompt-migration.json", mimeType: "application/json", buffer: Buffer.from(fixture) });
    await expect(page.getByText("迁移完成：新增 5，合并 0，跳过 0，冲突 0")).toBeVisible();
    await page.getByRole("tab", { name: /运行时词库/ }).click();
    const runtimeLibrary = page.getByRole("tabpanel", { name: /运行时词库/ });
    await expect(runtimeLibrary.getByText("QA 雨夜肖像", { exact: true })).toBeVisible();
    await runtimeLibrary.getByRole("button", { name: "插入画布" }).last().click();
    await page.waitForURL(/\/canvas\/[^/?]+/);

    await expect
        .poll(async () =>
            page.evaluate(async () => {
                const { useCanvasStore } = await import("/src/stores/canvas/use-canvas-store.ts");
                const project = useCanvasStore.getState().projects[0];
                return project?.nodes.find((node) => node.title === "QA 雨夜肖像");
            }),
        )
        .toMatchObject({
            type: "text",
            title: "QA 雨夜肖像",
            metadata: { content: "cinematic street portrait in neon rain, natural pose", prompt: "cinematic street portrait in neon rain, natural pose", status: "success" },
        });
});

async function mountPromptSource(page: Page) {
    await page.addInitScript(
        ({ key, sourceIds, url }) => {
            const builtInSources = sourceIds.map((id: string) => ({ id, name: id, url: "", homepage: "", enabled: false, builtIn: true }));
            const source = { id: "canvas-prompt-library-fixture", name: "画布搜索来源", url, homepage: "", enabled: true, builtIn: false };
            localStorage.setItem(key, JSON.stringify({ state: { sources: [...builtInSources, source], schedule: { intervalMinutes: 0, lastFetchedAt: "" } }, version: 0 }));
        },
        { key: promptSourceStoreKey, sourceIds: builtInSourceIds, url: fixtureUrl },
    );
}
