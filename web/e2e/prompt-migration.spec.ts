import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const fixture = readFileSync(new URL("../qa-fixtures/prompt-migration.json", import.meta.url), "utf8");

test("提示词迁移在页面中保留审核血缘与待修复项", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/prompts");
    await page.getByRole("tab", { name: "我的仪表盘" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "prompt-migration.json", mimeType: "application/json", buffer: Buffer.from(fixture) });
    await expect(page.getByText("迁移完成：新增 5，合并 0，跳过 0，冲突 0")).toBeVisible();
    await expect(page.getByText("QA 迁移：雨夜街道中的电影感人物肖像")).toBeVisible();
    await expect(page.getByText("雨夜霓虹")).toBeVisible();
    await expect(page.getByText("街头人物")).toBeVisible();

    await page.getByRole("tab", { name: /配方与完整提示词/ }).click();
    await expect(page.getByText("雨夜街头肖像")).toBeVisible();
    await expect(page.getByText("QA 雨夜肖像")).toBeVisible();
    await page.getByRole("tab", { name: /运行时词库/ }).click();
    await expect(page.getByText("完整提示词 1")).toBeVisible();
    await expect(page.locator('[role="tabpanel"]:visible').getByText("QA 雨夜肖像")).toBeVisible();
    await page.getByRole("tab", { name: "PromptFill 自定义提示词" }).click();
    await expect(page.getByText("QA 可变肖像")).toBeVisible();

    const missingReference = JSON.stringify({ captures: [], terms: [{ id: "broken-term", label: "需修复词条", category: "光线", sourceCaptureIds: ["missing-capture"] }], recipes: [], prompts: [] });
    await page.locator('input[type="file"]').setInputFiles({ name: "missing-reference.json", mimeType: "application/json", buffer: Buffer.from(missingReference) });
    await expect(page.getByText("迁移完成：新增 0，合并 0，跳过 0，冲突 1")).toBeVisible();
    await page.getByRole("tab", { name: "采集与审核" }).click();
    await expect(page.getByText("需修复词条")).toBeVisible();
    await expect(page.getByText("引用待修复")).toBeVisible();
    expect(pageErrors).toEqual([]);
});
