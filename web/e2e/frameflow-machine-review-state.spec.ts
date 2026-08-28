import { expect, test } from "@playwright/test";

const now = "2026-08-28T00:00:00.000Z";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("FrameFlow 机器审图中的状态只显示在当前自动跑批次", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-machine-review-state-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string; runId?: string };
        const currentRun = { id: "run-current", briefId: "brief-current", promptVersionId: "prompt-current", status: "succeeded", requestedCount: 2, slotIds: [], imageIds: ["image-current", "image-reviewed"], createdAt: now };
        const current = item("image-current", "run-current");
        const reviewed = {
            ...item("image-reviewed", "run-current"),
            machineReview: { imageId: "image-reviewed", autoRunId: "auto-current", runId: "run-current", iteration: 1, rating: 4, comment: "已审。", decision: "vary", strengths: [], issues: [], createdAt: now },
        };
        const historical = item("image-history", "run-history");
        const data =
            query.type === "auto_run.list"
                ? {
                      type: "auto_run.list",
                      autoRuns: [
                          {
                              id: "auto-current",
                              name: "当前审图",
                              briefId: "brief-current",
                              count: 2,
                              maxIterations: 2,
                              canContinueExploration: false,
                              state: "reviewing",
                              iteration: 1,
                              currentRunId: "run-current",
                              requirementArchived: false,
                              briefSuperseded: false,
                              createdAt: now,
                              updatedAt: now,
                          },
                      ],
                  }
                : query.type === "run.detail"
                  ? { type: "run.detail", run: currentRun, slots: [] }
                  : { type: "review.queue", items: [current, reviewed, historical] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/assets/**", (route) => route.fulfill({ contentType: "image/png", body: png }));
    await page.goto("/frameflow?view=review&autoRunId=all");
    const inspector = page.getByRole("complementary", { name: "图片审核检查器" });
    await expect(inspector.getByText("Codex 审图中", { exact: true })).toBeVisible();
    await expect(page.getByText("机器审图 1/2 张")).toBeVisible();
    await page.getByAltText("待审图片 image-hi").locator("..").click();
    await expect(inspector.getByText("Codex 审图中", { exact: true })).toHaveCount(0);
    await expect(inspector.getByText("无机器审图记录", { exact: true })).toBeVisible();
});

function item(id: string, runId: string) {
    return { briefId: "brief-current", requirementArchived: false, briefSuperseded: false, image: { id, runId, promptVersionId: "prompt-current", referenceImageIds: [], width: 800, height: 1000, status: "pending_review", createdAt: now }, feedback: {} };
}
