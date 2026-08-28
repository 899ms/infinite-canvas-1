import { expect, test } from "@playwright/test";

test("画布组装提示词长文本在正文内滚动", async ({ page }) => {
    await page.goto("/canvas");
    await page.getByRole("button", { name: "新建画布" }).first().click();
    await expect(page).toHaveURL(/\/canvas\/.+$/);

    await page.locator('button[aria-label="生成配置"]').click();
    const compose = page.getByRole("button", { name: "组装提示词" });
    await compose.click();
    await compose.click();

    const composer = page.getByRole("textbox", { name: "组装提示词" });
    const close = page.getByRole("button", { name: "关闭" });
    await expect(composer).toBeVisible();
    const longPrompt = Array.from({ length: 120 }, (_, index) => `第 ${index + 1} 段超长提示词，用于验证组装器内容只能在正文区域内滚动。`).join("\n");
    await composer.fill(longPrompt);

    const before = await Promise.all([
        composer.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, top: element.getBoundingClientRect().top })),
        close.evaluate((element) => element.getBoundingClientRect().top),
    ]);
    expect(before[0].scrollHeight).toBeGreaterThan(before[0].clientHeight);

    await composer.hover();
    await page.mouse.wheel(0, 960);
    await expect.poll(() => composer.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const after = await Promise.all([composer.evaluate((element) => element.getBoundingClientRect().top), close.evaluate((element) => element.getBoundingClientRect().top)]);
    expect(after[0]).toBe(before[0].top);
    expect(after[1]).toBe(before[1]);
});
