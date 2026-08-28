import { expect, test, type Page } from "@playwright/test";

const promptSourceStoreKey = "infinite-canvas:prompt_source_store_v2";
const builtInSourceIds = ["banana-prompt-quicker", "davidwu-gpt-image2-prompts", "awesome-gpt-image", "awesome-gpt4o-image-prompts", "youmind-gpt-image-2", "youmind-nano-banana-pro"];
const fixtureUrl = "http://127.0.0.1:4173/prompt-detail-fixture.json";
const promptTitle = "详情弹窗长内容提示词";
const dataImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlA30cAAAAASUVORK5CYII=";
const longContent = Array.from({ length: 120 }, (_, index) => `第 ${index + 1} 段详情内容用于验证中间滚动区。`).join("\n");
const prompt = {
    id: "prompt-detail-dialog",
    title: promptTitle,
    prompt: longContent,
    description: "隔离浏览器详情弹窗夹具",
    coverUrl: dataImage,
    referenceImageUrls: [dataImage, `${dataImage}#reference-a`, `${dataImage}#reference-b`],
    tags: ["长内容", "固定操作", "隔离验证"],
    preview: "预览文本保持在中间滚动区。",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
};

test("提示词详情弹窗固定媒体和操作栏，只滚动中间内容且不超出视口", async ({ page }) => {
    await mountPromptDetailFixture(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/prompts");
    await page.getByText(promptTitle, { exact: true }).click();

    const dialog = page.getByRole("dialog");
    const cover = dialog.getByAltText(promptTitle);
    const scrollArea = dialog.locator("div.overflow-y-auto");
    const copy = dialog.getByRole("button", { name: "复制提示词" });
    const save = dialog.getByRole("button", { name: "加入我的资产" });

    await expect(cover).toBeVisible();
    await expect(copy).toBeVisible();
    await expect(save).toBeVisible();
    await expect.poll(() => cover.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.waitForTimeout(300);
    const scrollMetrics = await scrollArea.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
    expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);

    const coverBefore = await cover.boundingBox();
    const copyBefore = await copy.boundingBox();
    await scrollArea.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    expect(await scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await cover.boundingBox()).toEqual(coverBefore);
    expect(await copy.boundingBox()).toEqual(copyBefore);

    for (const viewport of [
        { width: 1280, height: 900 },
        { width: 390, height: 520 },
    ]) {
        await page.setViewportSize(viewport);
        await expect(dialog).toBeVisible();
        const box = await dialog.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
        await expect(copy).toBeVisible();
    }
});

async function mountPromptDetailFixture(page: Page) {
    await page.addInitScript(
        ({ key, sourceIds, url }) => {
            const builtInSources = sourceIds.map((id: string) => ({ id, name: id, url: "", homepage: "", enabled: false, builtIn: true }));
            const source = { id: "prompt-detail-fixture", name: "详情测试来源", url, homepage: "", enabled: true, builtIn: false };
            localStorage.setItem(key, JSON.stringify({ state: { sources: [...builtInSources, source], schedule: { intervalMinutes: 0, lastFetchedAt: "" } }, version: 0 }));
        },
        { key: promptSourceStoreKey, sourceIds: builtInSourceIds, url: fixtureUrl },
    );
    await page.route("**/prompt-detail-fixture.json", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify([prompt]) });
    });
}
