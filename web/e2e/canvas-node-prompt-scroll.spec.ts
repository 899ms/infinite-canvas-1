import { expect, test } from "@playwright/test";

test("画布节点长提示词在输入区滚动且不缩放画布", async ({ page }) => {
    await page.goto("/canvas");
    await page.getByRole("button", { name: "新建画布" }).first().click();
    await expect(page).toHaveURL(/\/canvas\/.+$/);

    await page.locator('button[aria-label="图片"]').click();
    const prompt = page.locator("[contenteditable='true']").first();
    await expect(prompt).toBeVisible();
    await prompt.fill(Array.from({ length: 120 }, (_, index) => `第 ${index + 1} 段节点提示词，用于验证画布中的输入区仅自身滚动。`).join("\n"));

    const canvas = page.locator(".absolute.origin-top-left");
    const beforeTransform = await canvas.evaluate((element) => element.getAttribute("style"));
    await expect.poll(() => prompt.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }))).toMatchObject({ clientHeight: expect.any(Number), scrollHeight: expect.any(Number) });
    const metrics = await prompt.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

    await prompt.hover();
    await page.mouse.wheel(0, 960);
    await expect.poll(() => prompt.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(canvas).toHaveAttribute("style", beforeTransform || "");
});
