import { expect, test } from "@playwright/test";

const now = "2026-08-28T00:00:00.000Z";
const fields = { subject: ["ceramic vase"], composition: [], color: [], lighting: ["soft light"], material: [], layout: [], mood: [], rendering: [], technical: ["4:5"], negative: [] };
const diff = { keep: [], add: [], change: [{ field: "lighting", before: ["hard light"], after: ["soft light"], evidenceImageIds: ["image-current"] }], remove: [], avoid: [] };

test("FrameFlow 运行与血缘按任务隔离失败重试，并保留决策与隔离记录", async ({ page }) => {
    let retried = false;
    const commands: Array<{ type?: string; runId?: string; failedSlotIds?: string[] }> = [];
    const currentAutoRun = autoRun("auto-run-current", "当前任务", "brief-current", "run-current");
    const currentRun = run("run-current", "brief-current", "prompt-current", retried ? "succeeded" : "partially_succeeded", ["image-current", ...(retried ? ["image-retried"] : [])], 2);
    const manualRun = run("run-manual", "brief-manual", "prompt-manual", "succeeded", ["image-manual"], 1);
    const archivedRun = { ...run("run-archived", "brief-archived", "prompt-archived", "succeeded", ["image-archived"], 1), requirementArchived: true };
    const prompt = promptVersion(currentRun);
    const decision = {
        id: "decision-current",
        promptVersionId: prompt.id,
        summary: "采用柔和光线，并规避硬边阴影。",
        evidence: [
            { imageId: "image-current", sourceEventIds: ["feedback-current"], weight: 3, rating: 5, comment: "保留柔和光线", sourcePromptVersionId: "prompt-source", disposition: "adopted", affectedFields: ["lighting"], reason: "五星反馈支持柔和光线。" },
        ],
        createdAt: now,
    };

    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-lineage-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string; runId?: string; autoRunId?: string; promptVersionId?: string };
        const latestCurrentRun = { ...currentRun, status: retried ? "succeeded" : "partially_succeeded", imageIds: ["image-current", ...(retried ? ["image-retried"] : [])] };
        const data =
            query.type === "run.list"
                ? { type: "run.list", runs: [latestCurrentRun, manualRun, archivedRun] }
                : query.type === "auto_run.list"
                  ? { type: "auto_run.list", autoRuns: [currentAutoRun] }
                  : query.type === "auto_run.trajectory"
                    ? trajectory(currentAutoRun, latestCurrentRun, promptVersion(latestCurrentRun))
                    : query.type === "run.detail"
                      ? query.runId === latestCurrentRun.id
                          ? {
                                type: "run.detail",
                                run: latestCurrentRun,
                                slots: [succeededSlot("slot-current", latestCurrentRun.id, 0, "image-current"), retried ? succeededSlot("slot-retry", latestCurrentRun.id, 1, "image-retried", 2) : failedSlot("slot-retry", latestCurrentRun.id, 1)],
                            }
                          : { type: "run.detail", run: manualRun, slots: [succeededSlot("slot-manual", manualRun.id, 0, "image-manual")] }
                      : query.type === "prompt.lineage"
                        ? {
                              type: "prompt.lineage",
                              promptVersionId: query.promptVersionId,
                              versions: [promptVersion(query.promptVersionId === "prompt-manual" ? manualRun : latestCurrentRun)],
                              decisions: query.promptVersionId === "prompt-current" ? [decision] : [],
                          }
                        : query.type === "quarantine.list"
                          ? { type: "quarantine.list", items: [{ id: "quarantine-current", reason: "generation_cancelled", runId: "run-old", sourceName: "late.png", relativePath: "quarantine/late.png", sha256: "a".repeat(64), bytes: 1, createdAt: now }] }
                          : { type: "workspace.summary", sequence: 0 };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        const command = route.request().postDataJSON() as { type?: string; runId?: string; failedSlotIds?: string[] };
        commands.push(command);
        if (command.type === "run.retry") retried = true;
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource: { type: "run", id: command.runId } } }) });
    });
    await page.route("**/agent/frameflow/assets/**", async (route) => {
        await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    });

    await page.goto("/frameflow?view=lineage&autoRunId=auto-run-current&runId=run-current");
    await expect(page.getByLabel("运行概览").getByText("当前任务运行", { exact: true }).locator("..").getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /批次 run-curr/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /批次 run-manu/ })).toHaveCount(0);
    await expect(page.getByText("隔离区保留 1 个未登记文件", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "重试 1 个失败项" })).toBeVisible();
    await expect(page.getByText("生成失败", { exact: true })).toBeVisible();

    await page.getByText("查看生成依据与 Prompt 变更", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "Agent Decision" })).toBeVisible();
    await expect(page.getByText("采用柔和光线，并规避硬边阴影。", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prompt Diff" })).toBeVisible();

    await page.getByRole("button", { name: "重试 1 个失败项" }).click();
    await expect.poll(() => commands.map(({ type, runId, failedSlotIds }) => ({ type, runId, failedSlotIds }))).toEqual([{ type: "run.retry", runId: "run-current", failedSlotIds: ["slot-retry"] }]);
    await expect(page.getByText("2/2 张已生成", { exact: true })).toBeVisible();
    await expect(page.getByText("尝试 2 次", { exact: true })).toBeVisible();
    await expect(page.getByAltText("生成结果 1")).toHaveAttribute("src", /image-current/);
    await expect(page.getByAltText("生成结果 2")).toHaveAttribute("src", /image-retried/);

    await page.goto("/frameflow?view=lineage&autoRunId=all");
    await expect(page).toHaveURL(/autoRunId=all/);
    await expect(page.getByText("全部运行与手动生成", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /批次 run-manu/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /批次 run-arch/ })).toBeVisible();
});

test("FrameFlow 运行与血缘取消后把迟到结果显示为隔离文件", async ({ page }) => {
    let cancelled = false;
    const commands: Array<{ type?: string; runId?: string }> = [];
    const auto = autoRun("auto-run-cancel", "取消隔离任务", "brief-cancel", "run-cancel");
    const activeRun = run("run-cancel", "brief-cancel", "prompt-cancel", cancelled ? "cancelled" : "running", [], 1);

    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-lineage-cancel-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const latestRun = { ...activeRun, status: cancelled ? "cancelled" : "running" };
        const data =
            query.type === "run.list"
                ? { type: "run.list", runs: [latestRun] }
                : query.type === "auto_run.list"
                  ? { type: "auto_run.list", autoRuns: [auto] }
                  : query.type === "auto_run.trajectory"
                    ? trajectory(auto, latestRun, promptVersion(latestRun))
                    : query.type === "run.detail"
                      ? { type: "run.detail", run: latestRun, slots: [{ id: "slot-cancel", runId: latestRun.id, index: 0, status: cancelled ? "cancelled" : "running", attempts: 1 }] }
                      : query.type === "prompt.lineage"
                        ? { type: "prompt.lineage", promptVersionId: latestRun.promptVersionId, versions: [promptVersion(latestRun)], decisions: [] }
                        : query.type === "quarantine.list"
                          ? {
                                type: "quarantine.list",
                                items: cancelled ? [{ id: "late-cancel", reason: "generation_cancelled", runId: latestRun.id, sourceName: "late.png", relativePath: "quarantine/late.png", sha256: "b".repeat(64), bytes: 1, createdAt: now }] : [],
                            }
                          : { type: "workspace.summary", sequence: 0 };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        const command = route.request().postDataJSON() as { type?: string; runId?: string };
        commands.push(command);
        if (command.type === "run.cancel") cancelled = true;
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource: { type: "run", id: command.runId } } }) });
    });

    await page.goto("/frameflow?view=lineage&autoRunId=auto-run-cancel&runId=run-cancel");
    await page.getByRole("button", { name: "取消生成" }).click();
    await page.locator(".ant-popconfirm-buttons").getByRole("button", { name: "确认取消", exact: true }).click();
    await expect.poll(() => commands.map(({ type, runId }) => ({ type, runId }))).toEqual([{ type: "run.cancel", runId: "run-cancel" }]);
    await expect(page.getByLabel("生成结果").getByText("已取消", { exact: true })).toBeVisible();
    await expect(page.getByText("该生成项已取消", { exact: true })).toBeVisible();
    await expect(page.getByText("隔离区保留 1 个未登记文件", { exact: true })).toBeVisible();
});

function autoRun(id: string, name: string, briefId: string, runId: string) {
    return { id, name, briefId, count: 2, maxIterations: 1, canContinueExploration: false, state: "completed", iteration: 1, currentRunId: runId, lastRunId: runId, requirementArchived: false, briefSuperseded: false, createdAt: now, updatedAt: now };
}

function run(id: string, briefId: string, promptVersionId: string, status: "running" | "succeeded" | "partially_succeeded" | "cancelled", imageIds: string[], requestedCount: number) {
    return {
        id,
        briefId,
        promptVersionId,
        status,
        requestedCount,
        slotIds: Array.from({ length: requestedCount }, (_, index) => `slot-${id}-${index}`),
        imageIds,
        createdAt: now,
        ...(status === "succeeded" || status === "partially_succeeded" || status === "cancelled" ? { completedAt: now } : {}),
    };
}

function promptVersion(source: ReturnType<typeof run>) {
    return {
        id: source.promptVersionId,
        briefId: source.briefId,
        revision: 1,
        status: "used",
        fields,
        compiledPrompt: "A ceramic vase with soft light.",
        reason: "FrameFlow 隔离浏览器回归。",
        diff,
        referenceImageIds: [],
        decisionId: source.promptVersionId === "prompt-current" ? "decision-current" : undefined,
        createdAt: now,
    };
}

function trajectory(auto: ReturnType<typeof autoRun>, source: ReturnType<typeof run>, prompt: ReturnType<typeof promptVersion>) {
    return {
        type: "auto_run.trajectory",
        autoRun: auto,
        brief: { id: source.briefId, profileId: "default", subject: auto.name, purpose: "隔离浏览器验收", aspectRatio: "4:5", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", createdAt: now },
        rounds: [{ iteration: 1, run: source, prompt, images: [] }],
    };
}

function succeededSlot(id: string, runId: string, index: number, imageId: string, attempts = 1) {
    return { id, runId, index, status: "succeeded" as const, attempts, imageId };
}

function failedSlot(id: string, runId: string, index: number) {
    return { id, runId, index, status: "failed" as const, attempts: 1, error: { code: "IMAGEGEN_FAILED" as const, message: "ImageGen 临时失败", retryable: true } };
}
