import { expect, test } from "@playwright/test";

const now = "2026-08-28T00:00:00.000Z";
const fields = { subject: ["editorial chair"], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: ["4:5"], negative: [] };
const diff = { keep: [], add: [], change: [], remove: [], avoid: [] };
const newerAutoRun = autoRun("auto-run-new", "最新探索", "brief-new", "run-new");
const olderAutoRun = autoRun("auto-run-old", "旧任务", "brief-old", "run-old");
const newerTrajectory = trajectory(newerAutoRun, "image-new");
const olderTrajectory = trajectory(olderAutoRun, "image-old");

test("FrameFlow 待审与运行血缘默认保持同一最新任务上下文", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-task-context-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string; autoRunId?: string; runId?: string; promptVersionId?: string };
        const data = query.type === "auto_run.list"
            ? { type: "auto_run.list", autoRuns: [newerAutoRun, olderAutoRun] }
            : query.type === "review.queue"
              ? { type: "review.queue", items: [reviewItem("image-new", newerAutoRun, "run-new"), reviewItem("image-old", olderAutoRun, "run-old")] }
              : query.type === "auto_run.trajectory"
                ? query.autoRunId === olderAutoRun.id ? olderTrajectory : newerTrajectory
                : query.type === "run.list"
                  ? { type: "run.list", runs: [newerTrajectory.rounds[0].run, olderTrajectory.rounds[0].run] }
                  : query.type === "run.detail"
                    ? runDetail(query.runId === "run-old" ? olderTrajectory : newerTrajectory)
                    : query.type === "prompt.lineage"
                      ? promptLineage(query.promptVersionId === "prompt-old" ? olderTrajectory : newerTrajectory)
                      : { type: "quarantine.list", items: [] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/assets/**", async (route) => {
        await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    });

    await page.goto("/frameflow?view=review");
    await expect(page).toHaveURL(/view=review.*autoRunId=auto-run-new/);
    await expect(page.getByAltText("待审图片 image-ne")).toBeVisible();
    await expect(page.getByAltText("待审图片 image-ol")).toHaveCount(0);

    await page.getByRole("tab", { name: "运行与血缘" }).click();
    await expect(page).toHaveURL(/view=lineage.*autoRunId=auto-run-new.*runId=run-new/);
    await expect(page.getByText("最新探索")).toBeVisible();
    await expect(page.getByText("旧任务", { exact: true })).toHaveCount(0);
});

test("FrameFlow 待审页把人工隐藏与恢复保持为独立反馈", async ({ page }) => {
    let imageStatus: "pending_review" | "hidden" | "restored" = "pending_review";
    const commands: Array<{ feedback?: { kind?: string } }> = [];
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-review-feedback-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const item = reviewItem("image-feedback", newerAutoRun, "run-new");
        item.image.status = imageStatus;
        item.feedback = imageStatus === "hidden" ? { hiddenReason: "aesthetic_dislike" } : {};
        const data = query.type === "auto_run.list"
            ? { type: "auto_run.list", autoRuns: [newerAutoRun] }
            : { type: "review.queue", items: [item] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        const command = route.request().postDataJSON() as { type?: string; feedback?: { kind?: string } };
        commands.push(command);
        imageStatus = command.feedback?.kind === "soft_delete" ? "hidden" : command.feedback?.kind === "restore" ? "restored" : imageStatus;
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource: { type: "run", id: "run-new" } } }) });
    });
    await page.route("**/agent/frameflow/assets/**", async (route) => {
        await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    });

    await page.goto("/frameflow?view=review");
    await page.getByRole("button", { name: "不喜欢并学习" }).click();
    await expect(page.getByText("确认标记为不喜欢？")).toBeVisible();
    await page.locator(".ant-popconfirm-buttons").getByRole("button", { name: "不喜欢并学习", exact: true }).click();
    const inspector = page.getByRole("complementary", { name: "图片审核检查器" });
    await expect(inspector.getByText("已隐藏", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "恢复图片" }).click();
    await expect(inspector.getByText("已恢复", { exact: true })).toBeVisible();
    expect(commands.map((command) => command.feedback?.kind)).toEqual(["soft_delete", "restore"]);
});

test("FrameFlow 自动跑失败后在原任务继续审图", async ({ page }) => {
    let resumed = false;
    const failedAutoRun = { ...autoRun("auto-run-recovery", "审图失败恢复", "brief-recovery", "run-recovery"), state: "failed", lastStartedAt: now, lastError: "审图 Provider 暂时不可用" };
    const recoveryBrief = { id: "brief-recovery", profileId: "default", subject: "恢复同一批机器审图", purpose: "隔离浏览器验收", aspectRatio: "4:5", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", createdAt: now };
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-auto-run-recovery-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const data = query.type === "brief.list"
            ? { type: "brief.list", briefs: [recoveryBrief] }
            : { type: "auto_run.list", autoRuns: [{ ...failedAutoRun, state: resumed ? "completed" : "failed", lastError: resumed ? undefined : failedAutoRun.lastError }] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/auto-runs/auto-run-recovery/start**", async (route) => {
        resumed = true;
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource: { type: "auto_run", id: failedAutoRun.id } } }) });
    });

    await page.goto("/frameflow?view=auto-run");
    await expect(page.getByText("审图 Provider 暂时不可用", { exact: true })).toBeVisible();
    await expect(page.getByText("当前批次：run-reco", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("审图 Provider 暂时不可用", { exact: true })).toBeVisible();
    await expect(page.getByText("当前批次：run-reco", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "继续自动跑" }).click();
    await expect(page.getByText("已完成 1/1 轮", { exact: true })).toBeVisible();
    expect(resumed).toBe(true);
});

test("FrameFlow 创建页先批准 Prompt，再提交独立生成批次", async ({ page }) => {
    let approved = false;
    const commands: Array<{ type?: string; input?: { subject?: string; purpose?: string } }> = [];
    const brief = { id: "brief-create", profileId: "default", subject: "窗边的编辑椅", purpose: "审美训练与灵感采集", aspectRatio: "4:5", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", createdAt: now };
    const prompt = { id: "prompt-create", briefId: brief.id, revision: 1, status: "draft", fields, compiledPrompt: "An editorial chair by a window.", reason: "隔离创建页验收。", diff, referenceImageIds: [], createdAt: now };
    const run = { id: "run-create", briefId: brief.id, promptVersionId: prompt.id, status: "running", requestedCount: 4, slotIds: ["slot-create"], imageIds: [], createdAt: now };
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-create-flow-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const approvedPrompt = { ...prompt, status: approved ? "approved" : "draft" };
        const data = query.type === "brief.detail"
            ? { type: "brief.detail", brief }
            : query.type === "prompt.lineage"
              ? { type: "prompt.lineage", promptVersionId: prompt.id, versions: [approvedPrompt], decisions: [] }
              : query.type === "run.list"
                ? { type: "run.list", runs: [run] }
                : query.type === "run.detail"
                  ? { type: "run.detail", run, slots: [{ id: "slot-create", runId: run.id, index: 0, status: "running", attempts: 1 }] }
                  : query.type === "auto_run.list"
                    ? { type: "auto_run.list", autoRuns: [] }
                    : { type: "quarantine.list", items: [] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        const command = route.request().postDataJSON() as { type?: string; input?: { subject?: string; purpose?: string } };
        commands.push(command);
        if (command.type === "prompt.approve") approved = true;
        const resource = command.type === "brief.create"
            ? { type: "brief", id: brief.id }
            : command.type === "round.plan"
              ? { type: "prompt_version", id: prompt.id }
              : command.type === "run.start"
                ? { type: "run", id: run.id }
                : { type: "prompt_version", id: prompt.id };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource } }) });
    });

    await page.goto("/frameflow?view=create");
    await page.getByLabel("主体").fill("窗边的编辑椅");
    await page.getByRole("button", { name: "让 Codex 生成 Prompt" }).click();
    await expect(page.getByRole("heading", { name: "Prompt Version 1" })).toBeVisible();
    expect(commands.map((command) => command.type)).toEqual(["brief.create", "round.plan"]);
    expect(commands[0]?.input).toMatchObject({ subject: "窗边的编辑椅" });
    expect(commands[0]?.input?.purpose).toBeUndefined();

    await page.getByRole("button", { name: "批准 Prompt" }).click();
    await expect(page.getByRole("button", { name: "开始生成 4 张" })).toBeVisible();
    expect(commands.map((command) => command.type)).toEqual(["brief.create", "round.plan", "prompt.approve"]);
    await page.getByRole("button", { name: "开始生成 4 张" }).click();
    await expect(page).toHaveURL(/view=lineage.*runId=run-create/);
    expect(commands.map((command) => command.type)).toEqual(["brief.create", "round.plan", "prompt.approve", "run.start"]);
});

function autoRun(id: string, name: string, briefId: string, runId: string) {
    return { id, name, briefId, count: 1, maxIterations: 1, canContinueExploration: false, state: "completed", iteration: 1, currentRunId: runId, lastRunId: runId, requirementArchived: false, briefSuperseded: false, createdAt: now, updatedAt: now };
}

function trajectory(item: ReturnType<typeof autoRun>, imageId: string) {
    const promptVersionId = item.id === "auto-run-old" ? "prompt-old" : "prompt-new";
    const run = { id: item.currentRunId!, briefId: item.briefId, promptVersionId, status: "succeeded", requestedCount: 1, slotIds: [`slot-${imageId}`], imageIds: [imageId], createdAt: now, completedAt: now };
    const prompt = { id: promptVersionId, briefId: item.briefId, revision: 1, status: "used", fields, compiledPrompt: "A quiet editorial chair photograph.", reason: "隔离任务上下文夹具。", diff, referenceImageIds: [], createdAt: now };
    const image = { id: imageId, runId: run.id, promptVersionId, referenceImageIds: [], width: 800, height: 1000, status: "pending_review", createdAt: now };
    return { type: "auto_run.trajectory", autoRun: item, brief: { id: item.briefId, profileId: "default", subject: item.name, purpose: "隔离浏览器验收", aspectRatio: "4:5", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", createdAt: now }, rounds: [{ iteration: 1, run, prompt, images: [{ image, machineReview: machineReview(imageId, item, run.id) }] }] };
}

function reviewItem(imageId: string, item: ReturnType<typeof autoRun>, runId: string) {
    const source = item.id === "auto-run-old" ? olderTrajectory : newerTrajectory;
    return { briefId: item.briefId, requirementArchived: false, briefSuperseded: false, image: { ...source.rounds[0].images[0].image, id: imageId, runId }, feedback: {}, machineReview: machineReview(imageId, item, runId) };
}

function machineReview(imageId: string, item: ReturnType<typeof autoRun>, runId: string) {
    return { imageId, autoRunId: item.id, runId, iteration: 1, rating: 4, comment: "同一任务的机器审图。", decision: "vary", strengths: ["主体明确"], issues: ["继续探索"], createdAt: now };
}

function runDetail(source: ReturnType<typeof trajectory>) {
    const { run } = source.rounds[0];
    return { type: "run.detail", run, slots: [{ id: run.slotIds[0], runId: run.id, index: 0, status: "succeeded", attempts: 1, imageId: run.imageIds[0] }] };
}

function promptLineage(source: ReturnType<typeof trajectory>) {
    return { type: "prompt.lineage", promptVersionId: source.rounds[0].prompt.id, versions: [source.rounds[0].prompt], decisions: [] };
}
