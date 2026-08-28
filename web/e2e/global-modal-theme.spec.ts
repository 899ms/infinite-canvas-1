import { expect, test, type Page } from "@playwright/test";

type ModalColors = {
    background: string;
    border: string;
    text: string;
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
    return dialog.locator(".ant-modal-content");
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
    const darkModal = page.getByRole("dialog").locator(".ant-modal-content");
    await expect(darkModal).toBeVisible();
    const darkColors = await readModalColors(darkModal);
    expect(darkColors.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkColors.text).not.toBe("rgba(0, 0, 0, 0)");
    expect(darkColors).not.toEqual(lightColors);
});
