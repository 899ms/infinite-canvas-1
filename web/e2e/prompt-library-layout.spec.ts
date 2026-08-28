import { expect, test, type Page } from "@playwright/test";

const promptSourceStoreKey = "infinite-canvas:prompt_source_store_v2";
const builtInSourceIds = ["banana-prompt-quicker", "davidwu-gpt-image2-prompts", "awesome-gpt-image", "awesome-gpt4o-image-prompts", "youmind-gpt-image-2", "youmind-nano-banana-pro"];
const fixtureUrl = "http://127.0.0.1:4173/prompt-layout-fixture.json";
const tags = Array.from({ length: 48 }, (_, index) => `布局验收标签-${String(index + 1).padStart(2, "0")}-不可压缩`);
const prompts = [
    {
        id: "layout-match",
        title: "布局搜索命中提示词",
        prompt: "用于验证提示词中心的搜索和布局。",
        description: "隔离浏览器夹具",
        coverUrl: "",
        referenceImageUrls: [],
        tags,
        preview: "",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
    },
    {
        id: "layout-second",
        title: "布局搜索保留提示词",
        prompt: "用于证明防抖窗口内不会立即重新查询。",
        description: "隔离浏览器夹具",
        coverUrl: "",
        referenceImageUrls: [],
        tags: ["另一个标签"],
        preview: "",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
    },
];

test("提示词中心在搜索防抖、桌面独立滚动和窄屏布局下保持可用", async ({ page }) => {
    await mountPromptLibraryFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/prompts");

    await expect(page.getByRole("heading", { name: "提示词中心" })).toBeVisible();
    await expect(page.getByText("当前共 2 条提示词", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "我的提示词", exact: true })).toHaveCount(0);
    await expect(page.getByText("布局搜索命中提示词", { exact: true })).toBeVisible();

    const search = page.getByPlaceholder("搜索标题、内容或标签");
    await search.fill("不会命中的防抖查询");
    await page.waitForTimeout(220);
    await expect(page.getByText("布局搜索命中提示词", { exact: true })).toBeVisible();
    await expect(page.getByText("没有找到匹配的提示词", { exact: true })).toBeVisible();

    await search.fill("");
    await expect(page.getByText("布局搜索命中提示词", { exact: true })).toBeVisible();

    const sidebar = page.locator("main aside");
    const grid = sidebar.locator("..");
    const main = page.locator("main");
    await expect(sidebar).toBeVisible();
    expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)).toBe(2);
    const sidebarMetrics = await sidebar.evaluate((element) => ({ overflowY: getComputedStyle(element).overflowY, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
    expect(sidebarMetrics.overflowY).toBe("auto");
    expect(sidebarMetrics.scrollHeight).toBeGreaterThan(sidebarMetrics.clientHeight);
    await sidebar.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
    });
    expect(await sidebar.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await main.evaluate((element) => element.scrollTop)).toBe(0);

    const searchBox = await search.boundingBox();
    const firstCardBox = await page
        .locator(".ant-card")
        .filter({ has: page.getByText("布局搜索命中提示词", { exact: true }) })
        .first()
        .boundingBox();
    expect(searchBox).not.toBeNull();
    expect(firstCardBox).not.toBeNull();
    expect(firstCardBox!.y).toBeGreaterThan(searchBox!.y + searchBox!.height);
    expect(firstCardBox!.y).toBeLessThan(searchBox!.y + searchBox!.height + 40);

    await page.getByRole("button", { name: "加入资产" }).first().click();
    await expect
        .poll(async () =>
            page.evaluate(async () => {
                const { useAssetStore } = await import("/src/stores/use-asset-store.ts");
                return useAssetStore.getState().assets.some((asset) => asset.title === "布局搜索命中提示词");
            }),
        )
        .toBe(true);

    await page.setViewportSize({ width: 390, height: 900 });
    expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)).toBe(1);
    const sidebarBox = await sidebar.boundingBox();
    const sectionBox = await page.locator("main section").boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(sectionBox).not.toBeNull();
    expect(sectionBox!.y).toBeGreaterThan(sidebarBox!.y + sidebarBox!.height);
    expect(await page.locator("html").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

async function mountPromptLibraryFixture(page: Page) {
    await page.addInitScript(
        ({ key, sourceIds, url }) => {
            const builtInSources = sourceIds.map((id: string) => ({ id, name: id, url: "", homepage: "", enabled: false, builtIn: true }));
            const source = { id: "prompt-layout-fixture", name: "布局测试来源", url, homepage: "", enabled: true, builtIn: false };
            localStorage.setItem(key, JSON.stringify({ state: { sources: [...builtInSources, source], schedule: { intervalMinutes: 0, lastFetchedAt: "" } }, version: 0 }));
        },
        { key: promptSourceStoreKey, sourceIds: builtInSourceIds, url: fixtureUrl },
    );
    await page.route("**/prompt-layout-fixture.json", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(prompts) });
    });
}
