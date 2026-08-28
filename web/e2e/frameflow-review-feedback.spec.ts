import { expect, test } from "@playwright/test";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const now = "2026-08-28T00:00:00.000Z";

test("FrameFlow 待审页分别记录评分、Comment、软删除和永久删除", async ({ page }) => {
    let status: "pending_review" | "hidden" = "pending_review";
    let rating: 1 | 2 | 3 | 4 | 5 | undefined;
    let comment: string | undefined;
    let deleted = false;
    const commands: Array<{ type?: string; imageId?: string; feedback?: { kind?: string; rating?: number; comment?: string } }> = [];
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-review-actions-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const item = {
            briefId: "brief-review-actions",
            requirementArchived: false,
            briefSuperseded: false,
            image: { id: "image-review-actions", runId: "run-review-actions", promptVersionId: "prompt-review-actions", referenceImageIds: [], width: 800, height: 1000, status, createdAt: now },
            feedback: { ...(rating ? { rating } : {}), ...(comment ? { comment } : {}), ...(status === "hidden" ? { hiddenReason: "aesthetic_dislike" } : {}) },
        };
        const data = query.type === "review.queue" ? { type: "review.queue", items: deleted ? [] : [item] } : { type: "auto_run.list", autoRuns: [] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        const command = route.request().postDataJSON() as { type?: string; imageId?: string; feedback?: { kind?: string; rating?: 1 | 2 | 3 | 4 | 5; comment?: string } };
        commands.push(command);
        if (command.feedback?.kind === "rating") rating = command.feedback.rating;
        if (command.feedback?.kind === "comment") comment = command.feedback.comment;
        if (command.feedback?.kind === "soft_delete") status = "hidden";
        if (command.type === "image.delete") deleted = true;
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource: { type: "run", id: "run-review-actions" } } }) });
    });
    await page.route("**/agent/frameflow/assets/**", async (route) => {
        await route.fulfill({ contentType: "image/png", body: png });
    });

    await page.goto("/frameflow?view=review");
    const inspector = page.getByRole("complementary", { name: "图片审核检查器" });
    await expect(inspector.getByAltText("当前审核图片")).toBeVisible();

    await inspector.getByRole("button", { name: "5 星：强化" }).click();
    await expect(inspector.getByText("5 星", { exact: true })).toBeVisible();
    await expect.poll(() => commands.map((command) => command.feedback?.kind)).toEqual(["rating"]);
    expect(commands[0]).toMatchObject({ type: "feedback.append", imageId: "image-review-actions", feedback: { kind: "rating", rating: 5 } });

    await inspector.getByLabel("Comment").fill("保留柔和光线和留白");
    await inspector.getByRole("button", { name: "保存 Comment" }).click();
    await expect(inspector.getByLabel("Comment")).toHaveValue("保留柔和光线和留白");
    await expect.poll(() => commands.map((command) => command.feedback?.kind)).toEqual(["rating", "comment"]);
    expect(commands[1]).toMatchObject({ type: "feedback.append", imageId: "image-review-actions", feedback: { kind: "comment", comment: "保留柔和光线和留白" } });

    await inspector.getByRole("button", { name: "不喜欢并学习" }).click();
    await page.locator(".ant-popconfirm-buttons").getByRole("button", { name: "不喜欢并学习", exact: true }).click();
    await expect(inspector.getByText("已隐藏", { exact: true })).toBeVisible();
    await expect(inspector.getByRole("button", { name: "恢复图片" })).toBeVisible();
    await expect.poll(() => commands.map((command) => command.feedback?.kind)).toEqual(["rating", "comment", "soft_delete"]);

    await inspector.getByRole("button", { name: "删除（不参与学习）" }).click();
    await page.locator(".ant-popconfirm-buttons").getByRole("button", { name: "确认删除", exact: true }).click();
    await expect(page.getByText("还没有可审核的 FrameFlow 图片")).toBeVisible();
    expect(commands.map((command) => command.type)).toEqual(["feedback.append", "feedback.append", "feedback.append", "image.delete"]);
    expect(commands[3]).toMatchObject({ type: "image.delete", imageId: "image-review-actions" });
});
