import { expect, test } from "@playwright/test";

test("画布工具栏切换选择和移动，空格只临时反转当前工具", async ({ page }) => {
    await page.goto("/canvas");
    await page.getByRole("button", { name: "新建画布" }).first().click();
    await expect(page).toHaveURL(/\/canvas\/[^/]+$/);

    const selectTool = page.getByLabel("选择", { exact: true });
    await expect(selectTool).toBeVisible();
    const canvas = page.locator("div.relative.h-full.w-full.select-none.overflow-hidden");
    await selectTool.click();
    await expect(canvas).toHaveCSS("cursor", "grab");
    await page.keyboard.down("Space");
    await expect(canvas).toHaveCSS("cursor", "auto");
    await page.keyboard.up("Space");
    await expect(canvas).toHaveCSS("cursor", "grab");
    await expect(canvas).toBeVisible();
});
