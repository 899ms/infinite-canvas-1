import { expect, test } from "@playwright/test";

test("本地存储设置显示仓库统计且刷新不阻塞设置弹层", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "配置" }).click();
    const dialog = page.getByRole("dialog", { name: "配置与用户偏好" });
    await dialog.getByRole("tab", { name: "本地存储" }).click();

    await expect(dialog.getByText("IndexedDB 存储使用情况", { exact: true })).toBeVisible();
    const refresh = dialog.getByRole("button", { name: "刷新统计" });
    await expect(refresh).toBeVisible();
    await expect(dialog.getByText("Infinite Canvas 主数据", { exact: true })).toBeVisible();
    await expect(dialog.getByText("应用状态", { exact: true })).toBeVisible();

    await refresh.click();
    await dialog.getByRole("tab", { name: "偏好设置" }).click();
    await expect(dialog.getByText("生成偏好", { exact: true })).toBeVisible();
    await dialog.getByRole("tab", { name: "本地存储" }).click();
    await expect(dialog.getByText("Infinite Canvas 主数据", { exact: true })).toBeVisible();
    await expect(refresh).toBeEnabled();
});
