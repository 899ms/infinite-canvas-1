import { expect, test } from "@playwright/test";

test("顶部语言切换立即同步主要界面并在刷新后保持", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "我的画布" })).toBeVisible();

    await page.getByLabel("切换到 English").click();
    await expect(page.getByRole("link", { name: "My Canvases" })).toBeVisible();
    await expect(page.getByLabel("Switch to 简体中文")).toBeVisible();

    await page.getByLabel("Settings").click();
    const configDialog = page.getByRole("dialog");
    await expect(configDialog.getByText("Settings & Preferences", { exact: true })).toBeVisible();
    await expect(configDialog.getByRole("tab", { name: "Providers" })).toBeVisible();
    await expect(configDialog.getByRole("button", { name: "Add provider" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/image");
    await expect(page.getByRole("combobox", { name: "Model" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("link", { name: "My Canvases" })).toBeVisible();
    await expect(page.getByLabel("Switch to 简体中文")).toBeVisible();

    await page.getByLabel("Switch to 简体中文").click();
    await expect(page.getByRole("link", { name: "我的画布" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("切换到 English")).toBeVisible();
});
