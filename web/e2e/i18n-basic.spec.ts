import { expect, test } from "@playwright/test";

test("顶部语言切换立即同步主要界面、版本弹层与渠道编辑器，并在刷新后保持", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "我的画布" })).toBeVisible();

    await page.getByTitle("查看版本更新").click();
    const versionDialog = page.getByRole("dialog");
    await expect(versionDialog.getByText("版本更新", { exact: true })).toBeVisible();
    await expect(versionDialog.getByText("当前版本", { exact: true })).toBeVisible();
    await expect(versionDialog.getByText("最新版本", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByLabel("切换到 English").click();
    await expect(page.getByRole("link", { name: "My Canvases" })).toBeVisible();
    await expect(page.getByLabel("Switch to 简体中文")).toBeVisible();

    await page.getByTitle("View release updates").click();
    await expect(versionDialog.getByText("Release updates", { exact: true })).toBeVisible();
    await expect(versionDialog.getByText("Current version", { exact: true })).toBeVisible();
    await expect(versionDialog.getByText("Latest version", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByLabel("Settings").click();
    const configDialog = page.getByRole("dialog");
    await expect(configDialog.getByText("Settings & Preferences", { exact: true })).toBeVisible();
    await expect(configDialog.getByRole("tab", { name: "Providers" })).toBeVisible();
    await expect(configDialog.getByRole("button", { name: "Add provider" })).toBeVisible();
    await configDialog.getByRole("button", { name: "Add provider" }).click();
    const channelDrawer = page.getByRole("dialog").filter({ hasText: "Edit provider" });
    await expect(channelDrawer.getByText("Provider name", { exact: true })).toBeVisible();
    await expect(channelDrawer.getByText("Provider models", { exact: true })).toBeVisible();
    await expect(channelDrawer.getByRole("button", { name: "Select models" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

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

test("移动端导航抽屉随语言切换同步", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByLabel("打开导航菜单").click();
    const navigationDrawer = page.getByRole("dialog");
    await expect(navigationDrawer.getByText("导航", { exact: true })).toBeVisible();
    await expect(navigationDrawer.getByRole("link", { name: "我的画布" })).toBeVisible();
    await expect(navigationDrawer.getByRole("link", { name: "生图工作台" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByLabel("切换到 English").click();
    await page.getByLabel("Open navigation menu").click();
    await expect(navigationDrawer.getByText("Navigation", { exact: true })).toBeVisible();
    await expect(navigationDrawer.getByRole("link", { name: "My Canvases" })).toBeVisible();
    await expect(navigationDrawer.getByRole("link", { name: "Image Studio" })).toBeVisible();
});
