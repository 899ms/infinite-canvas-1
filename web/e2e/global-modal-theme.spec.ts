import { expect, test, type Page } from "@playwright/test";

type ModalColors = {
    background: string;
    border: string;
    text: string;
};

type OverlayColors = ModalColors & {
    activeBackground?: string;
};

async function openSettings(page: Page, theme: "light" | "dark") {
    await page.addInitScript((initialTheme) => {
        localStorage.setItem("infinite-canvas:theme_store", JSON.stringify({ state: { theme: initialTheme }, version: 0 }));
    }, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*\bdark\b)/);
    await page.getByRole("button", { name: "配置" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("配置与用户偏好", { exact: true })).toBeVisible();
    const content = dialog.locator(".ant-modal-container");
    await expect(content).toBeVisible();
    return content;
}

async function readModalColors(content: ReturnType<Page["locator"]>): Promise<ModalColors> {
    return content.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
            background: style.backgroundColor,
            border: style.borderTopColor,
            text: style.color,
        };
    });
}

async function readOverlayColors(content: ReturnType<Page["locator"]>, active?: ReturnType<Page["locator"]>): Promise<OverlayColors> {
    const colors = await readModalColors(content);
    return {
        ...colors,
        ...(active ? { activeBackground: await active.evaluate((element) => window.getComputedStyle(element).backgroundColor) } : {}),
    };
}

async function closeFloatingLayers(page: Page) {
    await page.keyboard.press("Escape");
    const drawer = page.getByRole("dialog", { name: "编辑渠道" });
    await drawer.getByRole("button", { name: "关闭" }).click();
    await expect(drawer).toHaveCount(0);
    const settings = page.getByRole("dialog", { name: /配置与用户偏好/ });
    await settings.getByRole("button", { name: "关闭" }).click();
    await expect(page.locator(".ant-modal-container:visible")).toHaveCount(0);
}

async function openChannelEditor(page: Page) {
    await page.getByRole("button", { name: "配置" }).click();
    const settings = page.getByRole("dialog").filter({ hasText: "配置与用户偏好" });
    await expect(settings).toBeVisible();
    await settings.getByRole("button", { name: "新增渠道" }).click();
    const drawer = page.getByRole("dialog", { name: "编辑渠道" });
    await expect(drawer).toBeVisible();
    const drawerContent = drawer;
    await expect(drawerContent).toBeVisible();
    await drawer.locator(".ant-select").first().click();
    const selectDropdown = page.locator(".ant-select-dropdown:visible");
    await expect(selectDropdown).toBeVisible();
    const activeOption = selectDropdown.locator(".ant-select-item-option").first();
    await activeOption.hover();
    return { drawerContent, selectDropdown, activeOption };
}

test("全局设置弹层随浅深主题切换容器、边框和正文颜色", async ({ page }) => {
    const lightModal = await openSettings(page, "light");
    const lightColors = await readModalColors(lightModal);
    expect(lightColors.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(lightColors.text).not.toBe("rgba(0, 0, 0, 0)");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "切换到深色主题" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: "配置" }).click();
    const darkModal = page.getByRole("dialog").locator(".ant-modal-container");
    await expect(darkModal).toBeVisible();
    const darkColors = await readModalColors(darkModal);
    expect(darkColors.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkColors.text).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkColors).not.toEqual(lightColors);
});

test("渠道抽屉和 Select 浮层在浅深主题下同步更新", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("infinite-canvas:theme_store", JSON.stringify({ state: { theme: "light" }, version: 0 }));
    });
    await page.goto("/");
    const light = await openChannelEditor(page);
    const lightDrawer = await readOverlayColors(light.drawerContent);
    const lightSelect = await readOverlayColors(light.selectDropdown, light.activeOption);
    expect(lightDrawer.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(lightSelect.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(lightSelect.activeBackground).not.toBe("rgba(0, 0, 0, 0)");

    await closeFloatingLayers(page);
    await page.getByRole("button", { name: "切换到深色主题" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const dark = await openChannelEditor(page);
    const darkDrawer = await readOverlayColors(dark.drawerContent);
    const darkSelect = await readOverlayColors(dark.selectDropdown, dark.activeOption);
    expect(darkDrawer.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkSelect.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkSelect.activeBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkDrawer).not.toEqual(lightDrawer);
    expect(darkSelect).not.toEqual(lightSelect);
});
