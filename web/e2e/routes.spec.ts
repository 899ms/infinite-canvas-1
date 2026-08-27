import { expect, test } from "@playwright/test";

const routes = ["/", "/image", "/video", "/interior", "/frameflow", "/assets", "/prompts", "/canvas", "/config"];

for (const route of routes) {
    test(`${route} 可完成首屏渲染`, async ({ page }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));

        await page.goto(route);
        await expect(page.locator("main").first()).toBeVisible();
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
        expect(pageErrors).toEqual([]);
    });
}

test("图像与视频设置的无文本控件有可读名称", async ({ page }) => {
    await page.goto("/image");
    await expect(page.getByRole("switch", { name: "16 倍数对齐" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "透明背景" })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "生成张数" })).toBeVisible();

    await page.goto("/video");
    await expect(page.getByRole("spinbutton", { name: "清晰度" })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "秒数" })).toBeVisible();
});
