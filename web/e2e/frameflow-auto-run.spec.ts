import { expect, test } from "@playwright/test";

const now = "2026-08-28T00:00:00.000Z";

test("FrameFlow 自动跑从自由方向立即进入可停止的首轮规划", async ({ page }) => {
    let state: "generating" | "paused" = "generating";
    const commands: Array<{ type?: string; input?: Record<string, unknown> }> = [];
    const brief = {
        id: "brief-auto-run",
        profileId: "default",
        subject: "雨夜便利店的电影感摄影",
        purpose: "审美训练与灵感采集",
        aspectRatio: "4:5",
        constraints: { keep: [], avoid: [] },
        referenceImageIds: [],
        strategy: "explore",
        createdAt: now,
    };
    const autoRun = {
        id: "auto-run-direction",
        name: "便利店霓虹探索",
        briefId: brief.id,
        count: 2,
        maxIterations: 3,
        canContinueExploration: false,
        state,
        iteration: 0,
        currentRunId: undefined,
        lastRunId: undefined,
        lastStartedAt: now,
        requirementArchived: false,
        briefSuperseded: false,
        createdAt: now,
        updatedAt: now,
    };

    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-auto-run-direction-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const data = query.type === "brief.list" ? { type: "brief.list", briefs: [brief] } : query.type === "brief.detail" ? { type: "brief.detail", brief } : { type: "auto_run.list", autoRuns: [{ ...autoRun, state }] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        const command = route.request().postDataJSON() as { type?: string; input?: Record<string, unknown> };
        commands.push(command);
        if (command.type === "auto_run.stop") state = "paused";
        const resource = command.type === "brief.create" ? { type: "brief", id: brief.id } : { type: "auto_run", id: autoRun.id };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource } }) });
    });
    await page.route("**/agent/frameflow/auto-runs/auto-run-direction/start", async (route) => {
        state = "generating";
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource: { type: "auto_run", id: autoRun.id } } }) });
    });

    await page.goto("/frameflow?view=auto-run");
    await page.getByLabel("探索方向").fill(brief.subject);
    await page.getByLabel("任务名称（选填）").fill(autoRun.name);
    await page.getByLabel("画幅").click();
    await page.locator(".ant-select-dropdown:visible .ant-select-item-option-content").filter({ hasText: /^4:5$/ }).click();
    await page.getByLabel("探索方式").click();
    await page
        .locator(".ant-select-dropdown:visible .ant-select-item-option-content")
        .filter({ hasText: /^大胆探索$/ })
        .click();
    await page.getByLabel("每轮数量").fill(String(autoRun.count));
    await page.getByLabel("最大轮数").fill(String(autoRun.maxIterations));
    await page.getByRole("button", { name: "启动自动跑", exact: true }).click();

    await expect(page.getByText("Codex 规划第 1 轮", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "停止自动跑", exact: true })).toBeVisible();
    await expect.poll(() => commands.map((command) => command.type)).toEqual(["brief.create", "auto_run.create"]);
    expect(commands[0]?.input).toMatchObject({
        subject: brief.subject,
        aspectRatio: "4:5",
        strategy: "explore",
        referenceImageIds: [],
    });
    expect(commands[1]?.input).toMatchObject({
        name: autoRun.name,
        briefId: brief.id,
        count: 2,
        maxIterations: 3,
    });

    await page.getByRole("button", { name: "停止自动跑", exact: true }).click();
    await expect(page.getByText("已停止", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "继续自动跑", exact: true })).toBeVisible();
    expect(commands.map((command) => command.type)).toEqual(["brief.create", "auto_run.create", "auto_run.stop"]);
});
