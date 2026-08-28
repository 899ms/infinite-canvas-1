import { expect, test, type Page } from "@playwright/test";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type TestImageAsset = {
    id: string;
    kind: "image";
    title: string;
    coverUrl: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    data: { dataUrl: string; width: number; height: number; bytes: number; mimeType: "image/png" };
};

test("FrameFlow 参考图选择支持搜索、取消和四张上限", async ({ page }) => {
    const assets = [
        imageAsset("reference-1", "柔光台灯", ["家居"]),
        imageAsset("reference-2", "藤编座椅", ["家居"]),
        imageAsset("reference-3", "晨雾花瓶", ["静物"]),
        imageAsset("reference-4", "亚麻窗帘", ["空间"]),
        imageAsset("reference-5", "建筑光影", ["建筑"]),
    ];
    await seedAssetStore(page, assets);

    await page.getByRole("button", { name: "选择", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "选择 FrameFlow 参考图" });
    await expect(dialog.getByText("最多选择 4 张 · 0/4")).toBeVisible();
    await dialog.getByPlaceholder("搜索图片名称或标签").fill("建筑");
    await expect(dialog.getByAltText("建筑光影")).toBeVisible();
    await expect(dialog.getByAltText("柔光台灯")).toHaveCount(0);
    await dialog.getByPlaceholder("搜索图片名称或标签").fill("");

    for (const asset of assets.slice(0, 4)) await dialog.getByRole("button", { name: asset.title }).click();
    await expect(dialog.getByText("最多选择 4 张 · 4/4")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "建筑光影" })).toBeDisabled();
    await dialog.getByRole("button", { name: "亚麻窗帘" }).click();
    await expect(dialog.getByText("最多选择 4 张 · 3/4")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "建筑光影" })).toBeEnabled();
    await dialog.getByRole("button", { name: /取\s*消/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("未选择参考图，可直接使用文字 Brief")).toBeVisible();

    await page.getByRole("button", { name: "选择", exact: true }).click();
    await expect(dialog.getByText("最多选择 4 张 · 0/4")).toBeVisible();
});

test("FrameFlow 参考图选择为空资产时提供明确引导", async ({ page }) => {
    await seedAssetStore(page, []);

    await page.getByRole("button", { name: "选择", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "选择 FrameFlow 参考图" });
    await expect(dialog.getByText("我的资产里还没有图片，请先到“我的资产”导入")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "使用 0 张参考图" })).toBeDisabled();
});

test("FrameFlow 拒绝超过 20MB 的参考图且不创建 Brief", async ({ page }) => {
    const oversized = {
        ...imageAsset("oversized-reference", "超大隔离参考图", ["隔离测试"]),
        data: { dataUrl: "/frameflow-reference-oversized.png", width: 1, height: 1, bytes: 20 * 1024 * 1024 + 1, mimeType: "image/png" as const },
    };
    const agentRequests: string[] = [];
    await page.route("**/frameflow-reference-oversized.png", async (route) => {
        await route.fulfill({ contentType: "image/png", body: Buffer.alloc(20 * 1024 * 1024 + 1) });
    });
    await page.route("**/agent/frameflow/**", async (route) => {
        agentRequests.push(route.request().url());
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "测试不应调用 Agent" }) });
    });
    await seedAssetStore(page, [oversized]);

    await page.getByRole("button", { name: "选择", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "选择 FrameFlow 参考图" });
    await dialog.getByRole("button", { name: "超大隔离参考图" }).click();
    await dialog.getByRole("button", { name: "使用 1 张参考图" }).click();
    await page.getByLabel("主体").fill("不应创建的超大参考图需求");
    await page.getByRole("button", { name: "让 Codex 生成 Prompt" }).click();

    await expect(page.getByText("参考图“超大隔离参考图”转换后超过 20MB")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prompt Version 1" })).toHaveCount(0);
    expect(agentRequests).toEqual([]);
});

function imageAsset(id: string, title: string, tags: string[]): TestImageAsset {
    return {
        id,
        kind: "image",
        title,
        coverUrl: png,
        tags,
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
        data: { dataUrl: png, width: 1, height: 1, bytes: 68, mimeType: "image/png" },
    };
}

async function seedAssetStore(page: Page, assets: TestImageAsset[]) {
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-reference-picker-limits-token");
    });
    await page.goto("/frameflow?view=create");
    await page.waitForFunction(async () => (await import("/src/stores/use-asset-store.ts")).useAssetStore.getState().hydrated);
    await page.evaluate(async (assets) => {
        const { useAssetStore } = await import("/src/stores/use-asset-store.ts");
        useAssetStore.setState({ assets, hydrated: true });
    }, assets);
}
