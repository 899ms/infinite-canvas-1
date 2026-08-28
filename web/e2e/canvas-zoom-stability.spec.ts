import { expect, test } from "@playwright/test";

test("画布重复缩放保持受控比例且不触发 React 循环错误", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/canvas");
    await page.getByRole("button", { name: "新建画布" }).first().click();
    await expect(page).toHaveURL(/\/canvas\/[^/]+$/);

    const zoom = page.getByRole("slider", { name: "放大/缩小画布" });
    await expect(zoom).toBeVisible();
    for (const value of [65, 140, 35, 275, 5, 500, 100, 175, 45, 100]) {
        await zoom.fill(String(value));
        await expect(zoom).toHaveValue(String(value));
    }

    await page.getByRole("button", { name: "重置视图" }).click();
    await expect(zoom).toHaveValue("100");
    expect(pageErrors.filter((message) => /maximum update depth|too many re-renders|rendered more hooks/i.test(message))).toEqual([]);
});
