import { expect, test } from "@playwright/test";

const now = "2026-08-28T00:00:00.000Z";
const fields = { subject: ["night shop"], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: ["4:5"], negative: [] };
const emptyDiff = { keep: [], add: [], change: [], remove: [], avoid: [] };
const autoRun = {
    id: "auto-run-trajectory",
    name: "三轮霓虹演化",
    briefId: "brief-trajectory",
    count: 1,
    maxIterations: 3,
    canContinueExploration: false,
    state: "completed",
    iteration: 3,
    lastRunId: "run-traj-3",
    requirementArchived: false,
    briefSuperseded: false,
    createdAt: now,
    updatedAt: now,
};
const brief = { id: autoRun.briefId, profileId: "default", subject: "雨夜街角便利店的克制电影感", purpose: "隔离浏览器验收", aspectRatio: "4:5", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", createdAt: now };
const rounds = [1, 2, 3].map((iteration) => {
    const id = `run-traj-${iteration}`;
    const changed =
        iteration === 1
            ? emptyDiff
            : {
                  ...emptyDiff,
                  change: [
                      {
                          field: "composition",
                          before: ["centered"],
                          after: [iteration === 2 ? "off-center" : "lower angle"],
                          reason: `第 ${iteration} 轮依据机器审图调整构图`,
                          evidenceEventIds: [`event-${iteration}`],
                          evidenceImageIds: [`image-${iteration}`],
                      },
                  ],
              };
    return {
        iteration,
        run: { id, briefId: brief.id, promptVersionId: `prompt-traj-${iteration}`, status: "succeeded", requestedCount: 1, slotIds: [`slot-${iteration}`], imageIds: [`image-${iteration}`], createdAt: now, completedAt: now },
        prompt: {
            id: `prompt-traj-${iteration}`,
            briefId: brief.id,
            revision: iteration,
            status: "used",
            fields,
            compiledPrompt: `neon corner store iteration ${iteration}`,
            reason: iteration === 1 ? "建立首轮基线" : `第 ${iteration} 轮依据机器审图调整构图`,
            diff: changed,
            referenceImageIds: [],
            createdAt: now,
        },
        images: [
            {
                image: { id: `image-${iteration}`, runId: id, promptVersionId: `prompt-traj-${iteration}`, referenceImageIds: [], width: 800, height: 1000, status: "reviewed", createdAt: now },
                machineReview: {
                    imageId: `image-${iteration}`,
                    autoRunId: autoRun.id,
                    runId: id,
                    iteration,
                    rating: iteration === 3 ? 5 : 4,
                    comment: `第 ${iteration} 轮机器审图`,
                    decision: iteration === 2 ? "vary" : "keep",
                    strengths: ["主体明确"],
                    issues: iteration === 2 ? ["构图仍可调整"] : [],
                    createdAt: now,
                },
            },
        ],
    };
});
const trajectory = { type: "auto_run.trajectory", autoRun, brief, rounds };

test("FrameFlow 演化轨迹按轮次比较、窄屏保留下一轮提示并可打开完整血缘", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-trajectory-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string; runId?: string; promptVersionId?: string };
        const round = rounds.find((item) => item.run.id === query.runId || item.prompt.id === query.promptVersionId) ?? rounds[0];
        const data =
            query.type === "auto_run.list"
                ? { type: "auto_run.list", autoRuns: [autoRun] }
                : query.type === "auto_run.trajectory"
                  ? trajectory
                  : query.type === "run.list"
                    ? { type: "run.list", runs: rounds.map((item) => item.run) }
                    : query.type === "run.detail"
                      ? { type: "run.detail", run: round.run, slots: [{ id: `slot-${round.iteration}`, runId: round.run.id, index: 0, status: "succeeded", attempts: 1, imageId: `image-${round.iteration}` }] }
                      : query.type === "prompt.lineage"
                        ? { type: "prompt.lineage", promptVersionId: round.prompt.id, versions: [round.prompt], decisions: [] }
                        : { type: "quarantine.list", items: [] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/assets/**", async (route) => {
        await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/frameflow?view=trajectory&autoRunId=${autoRun.id}`);
    const track = page.getByRole("list", { name: `${autoRun.name} 的轮次轨迹` });
    await expect(track).toBeVisible();
    await expect(page.getByRole("heading", { name: "第 1 轮" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "第 3 轮" })).toBeVisible();
    await expect(page.getByText("Prompt r2", { exact: true })).toBeVisible();
    await expect(page.getByText("Codex 4/5 · 继续变体", { exact: true })).toBeVisible();
    expect(await track.evaluate((element) => new Set([...element.children].map((child) => Math.round(child.getBoundingClientRect().top))).size)).toBe(1);

    await page.getByText("查看 Prompt Diff 与规划依据", { exact: true }).nth(1).click();
    await expect(page.getByText("第 2 轮依据机器审图调整构图", { exact: true })).toBeVisible();
    await expect(page.getByText("本轮：off-center", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 900 });
    expect(await track.locator("xpath=..").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    const secondLeft = await track
        .locator(":scope > li")
        .nth(1)
        .evaluate((element) => element.getBoundingClientRect().left);
    expect(secondLeft).toBeGreaterThan(0);
    expect(secondLeft).toBeLessThan(390);

    await page.getByRole("button", { name: "打开本轮完整血缘", exact: true }).nth(1).click();
    await expect(page).toHaveURL(/view=lineage.*autoRunId=auto-run-trajectory.*runId=run-traj-2/);
});
