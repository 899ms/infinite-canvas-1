import { expect, test, type Page } from "@playwright/test";

const promptSourceStoreKey = "infinite-canvas:prompt_source_store_v2";
const sourceId = "prompt-thumbnail-fixture";
const sourceUrl = "http://127.0.0.1:4173/prompt-thumbnail-fixture.json";
const sourceName = "缩略图安全夹具";
const title = "已失效缩略图提示词";
const blockedCover = "https://linux.do/uploads/default/expired-thumbnail.jpeg";
const missingReference = "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/afadan_ref1.jpg";
const builtInSourceIds = ["banana-prompt-quicker", "davidwu-gpt-image2-prompts", "freestylefly-gpt-image-2", "awesome-gpt-image", "awesome-gpt4o-image-prompts", "youmind-gpt-image-2", "youmind-nano-banana-pro"];
const stalePrompt = {
    id: "stale-thumbnail",
    title,
    prompt: "旧缓存中的坏缩略图也必须在渲染前降级。",
    description: "隔离浏览器夹具",
    coverUrl: blockedCover,
    referenceImageUrls: [blockedCover, missingReference],
    tags: ["缩略图", "旧缓存"],
    preview: "",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
};

test("提示词坏缩略图和一小时前缓存会在卡片、来源表格与详情中安全降级", async ({ page }) => {
    const badImageRequests: string[] = [];
    page.on("request", (request) => {
        if ([blockedCover, missingReference].includes(request.url())) badImageRequests.push(request.url());
    });
    await mountStaleThumbnailFixture(page);

    await page.goto("/");
    await writeStalePromptCache(page);
    await page.goto("/prompts");
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.locator(`img[alt="${title}"]`)).toHaveCount(0);

    await page.getByText(title, { exact: true }).click();
    const detail = page.getByRole("dialog");
    await expect(detail.getByText(title, { exact: true })).toBeVisible();
    await expect(detail.locator("img")).toHaveCount(0);
    await detail.getByRole("button", { name: "关闭" }).click();

    await page.goto("/config");
    await page.getByRole("tab", { name: "提示词来源" }).click();
    const sourceRow = page.getByText(sourceName, { exact: true }).locator("xpath=../../..");
    await sourceRow.getByRole("button", { name: "查看内容" }).click();
    const sourceDialog = page.getByRole("dialog", { name: `${sourceName} · 提示词内容` });
    await expect(sourceDialog.getByText(title, { exact: true })).toBeVisible();
    await expect(sourceDialog.locator("img")).toHaveCount(0);
    await sourceDialog.getByRole("button", { name: "详情" }).click();
    const nestedDetail = page.getByRole("dialog", { name: title });
    await expect(nestedDetail.locator("img")).toHaveCount(0);

    expect(badImageRequests).toEqual([]);
});

async function mountStaleThumbnailFixture(page: Page) {
    await page.addInitScript(
        ({ key, sourceIds, url, fixtureSourceId, fixtureSourceName }) => {
            const builtInSources = sourceIds.map((id: string) => ({ id, name: id, url: "", homepage: "", enabled: false, builtIn: true }));
            const source = { id: fixtureSourceId, name: fixtureSourceName, url, homepage: "", enabled: true, builtIn: false };
            localStorage.setItem(key, JSON.stringify({ state: { sources: [...builtInSources, source], schedule: { intervalMinutes: 0, lastFetchedAt: "" } }, version: 0 }));
        },
        { key: promptSourceStoreKey, sourceIds: builtInSourceIds, url: sourceUrl, fixtureSourceId: sourceId, fixtureSourceName: sourceName },
    );
    await page.route("**/prompt-thumbnail-fixture.json", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify([stalePrompt]) });
    });
}

async function writeStalePromptCache(page: Page) {
    await page.evaluate(
        async ({ key, cache }) => {
            const openRequest = indexedDB.open("infinite-canvas");
            const database = await new Promise<IDBDatabase>((resolve, reject) => {
                openRequest.addEventListener("upgradeneeded", () => {
                    if (!openRequest.result.objectStoreNames.contains("prompt_cache")) openRequest.result.createObjectStore("prompt_cache");
                });
                openRequest.addEventListener("success", () => resolve(openRequest.result));
                openRequest.addEventListener("error", () => reject(openRequest.error));
            });
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction("prompt_cache", "readwrite");
                transaction.objectStore("prompt_cache").put(cache, key);
                transaction.addEventListener("complete", () => resolve());
                transaction.addEventListener("error", () => reject(transaction.error));
            });
            database.close();
        },
        {
            key: `prompt-source:${sourceId}`,
            cache: { sourceId, items: [stalePrompt], count: 1, fetchedAt: Date.now() - 60 * 60 * 1000, lastSuccessAt: "2026-08-28T00:00:00.000Z", lastError: "", signature: "one-hour-old" },
        },
    );
}
