import { expect, test } from "@playwright/test";

const now = "2026-08-28T00:00:00.000Z";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("FrameFlow Preference DNA 只呈现已审核证据并保留硬约束边界", async ({ page }) => {
    const brief = {
        id: "brief-preference-dna",
        profileId: "profile-preference-dna",
        subject: "陶瓷花瓶",
        purpose: "电商主图",
        platform: "小红书",
        style: "极简",
        scene: "影棚",
        aspectRatio: "4:5",
        constraints: { keep: ["哑光陶瓷"], avoid: ["文字"] },
        referenceImageIds: [],
        strategy: "balanced",
        createdAt: now,
    };
    const reviewItems = [
        {
            briefId: brief.id,
            requirementArchived: false,
            briefSuperseded: false,
            image: { id: "image-boost", runId: "run-preference", promptVersionId: "prompt-boost", referenceImageIds: [], width: 800, height: 1000, status: "reviewed" as const, createdAt: now },
            feedback: { rating: 5 as const, comment: "保留柔和光线和留白" },
        },
        {
            briefId: brief.id,
            requirementArchived: false,
            briefSuperseded: false,
            image: { id: "image-avoid", runId: "run-preference", promptVersionId: "prompt-avoid", referenceImageIds: [], width: 800, height: 1000, status: "reviewed" as const, createdAt: now },
            feedback: { rating: 1 as const, comment: "避免居中构图" },
        },
        {
            briefId: brief.id,
            requirementArchived: false,
            briefSuperseded: false,
            image: { id: "image-unreviewed", runId: "run-preference", promptVersionId: "prompt-unreviewed", referenceImageIds: [], width: 800, height: 1000, status: "pending_review" as const, createdAt: now },
            feedback: {},
        },
    ];
    const dna = {
        type: "preference.dna",
        briefId: brief.id,
        totalWeight: 1,
        sampleSize: 2,
        boost: [{ imageId: "image-boost", weight: 3, sourceEventIds: ["feedback-rating-boost", "feedback-comment-boost"] }],
        avoid: [{ imageId: "image-avoid", weight: -2, sourceEventIds: ["feedback-rating-avoid", "feedback-comment-avoid", "feedback-hidden-avoid"] }],
        qualityRejections: 1,
    };

    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "frameflow-preference-dna-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const data =
            query.type === "brief.list"
                ? { type: "brief.list", briefs: [brief] }
                : query.type === "brief.detail"
                  ? { type: "brief.detail", brief }
                  : query.type === "auto_run.list"
                    ? { type: "auto_run.list", autoRuns: [] }
                    : query.type === "review.queue"
                      ? { type: "review.queue", items: reviewItems }
                      : query.type === "run.list"
                        ? { type: "run.list", runs: [] }
                        : query.type === "preference.dna"
                          ? dna
                          : { type: "quarantine.list", items: [] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/assets/**", async (route) => {
        await route.fulfill({ contentType: "image/png", body: png });
    });

    await page.goto(`/frameflow?view=preference&briefId=${brief.id}`);

    const metrics = page.getByLabel("当前需求偏好概览");
    await expect(metrics.getByText("净偏好权重", { exact: true }).locator("..").getByText("+1", { exact: true })).toBeVisible();
    await expect(metrics.getByText("有效样本", { exact: true }).locator("..").getByText("2", { exact: true })).toBeVisible();
    await expect(metrics.getByText("强化证据", { exact: true }).locator("..").getByText("1", { exact: true })).toBeVisible();
    await expect(metrics.getByText("规避证据", { exact: true }).locator("..").getByText("1", { exact: true })).toBeVisible();
    await expect(metrics.getByText("质量拒绝", { exact: true }).locator("..").getByText("1", { exact: true })).toBeVisible();

    const boost = page.getByRole("article").filter({ has: page.getByAltText("强化方向图片 image-bo") });
    await expect(boost.getByText("+3", { exact: true })).toBeVisible();
    await expect(boost.getByText("5 星", { exact: true })).toBeVisible();
    await expect(boost.getByText("2 条事实事件", { exact: true })).toBeVisible();
    await expect(boost.getByText("保留柔和光线和留白", { exact: true })).toBeVisible();

    const avoid = page.getByRole("article").filter({ has: page.getByAltText("规避方向图片 image-av") });
    await expect(avoid.getByText("-2", { exact: true })).toBeVisible();
    await expect(avoid.getByText("1 星", { exact: true })).toBeVisible();
    await expect(avoid.getByText("3 条事实事件", { exact: true })).toBeVisible();
    await expect(avoid.getByText("避免居中构图", { exact: true })).toBeVisible();
    await expect(page.getByText("图片 image-un", { exact: true })).toHaveCount(0);

    await expect(page.getByText("严格按需求隔离", { exact: true })).toBeVisible();
    await expect(page.getByText("这些证据可进入同一需求的新修订，但不能覆盖主体、用途、画幅等硬约束，也不会被其他需求使用。", { exact: true })).toBeVisible();
});
