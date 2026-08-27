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
