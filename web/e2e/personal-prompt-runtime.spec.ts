import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const fixture = readFileSync(new URL("../qa-fixtures/prompt-migration.json", import.meta.url), "utf8");

async function seedPersonalRuntime(page: Page) {
    await page.goto("/prompts");
    await page.getByRole("tab", { name: "我的仪表盘" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "prompt-migration.json", mimeType: "application/json", buffer: Buffer.from(fixture) });
    await expect(page.getByText("迁移完成：新增 5，合并 0，跳过 0，冲突 0")).toBeVisible();
    const unresolved = JSON.stringify({ captures: [], terms: [{ id: "unresolved-term", label: "不应进入个人库", category: "光线", sourceCaptureIds: ["missing-capture"] }], recipes: [], prompts: [] });
    await page.locator('input[type="file"]').setInputFiles({ name: "unresolved.json", mimeType: "application/json", buffer: Buffer.from(unresolved) });
    await expect(page.getByText("迁移完成：新增 0，合并 0，跳过 0，冲突 1")).toBeVisible();
}

async function expectPersonalPromptLibrary(page: Page, route: "/image" | "/video") {
    await page.goto(route);
    await page.getByRole("button", { name: "查看提示词库" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("公开提示词库", { exact: true })).toBeVisible();
    await dialog.locator(".ant-segmented-item").filter({ hasText: "我的可用库" }).click();
    await expect(dialog.locator(".ant-segmented-item").filter({ hasText: "我的可用库 (4)" })).toBeVisible();
    await expect(dialog.getByText("QA 雨夜肖像", { exact: true })).toBeVisible();
    await expect(dialog.getByText("雨夜街头肖像", { exact: true })).toBeVisible();
    await expect(dialog.getByText("不应进入个人库", { exact: true })).toHaveCount(0);
}

test("生图和视频工作台共享已审核的个人提示词运行时", async ({ page }) => {
    await seedPersonalRuntime(page);
    await expectPersonalPromptLibrary(page, "/image");
    await expectPersonalPromptLibrary(page, "/video");
});
