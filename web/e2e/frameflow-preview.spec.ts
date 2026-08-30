import { expect, test } from "@playwright/test";

const now = "2026-08-26T00:00:00.000Z";
const autoRun = {
    id: "auto-run-preview",
    name: "预览分组回归",
    briefId: "brief-preview",
    count: 2,
    maxIterations: 1,
    canContinueExploration: false,
    state: "completed",
    iteration: 1,
    lastRunId: "run-preview",
    requirementArchived: false,
    briefSuperseded: false,
    createdAt: now,
    updatedAt: now,
};

const emptyFields = {
    subject: ["静物摄影"],
    composition: [],
    color: [],
    lighting: [],
    material: [],
    layout: [],
    mood: [],
    rendering: [],
    technical: [],
    negative: [],
};

const emptyDiff = { keep: [], add: [], change: [], remove: [], avoid: [] };

const trajectory = {
    type: "auto_run.trajectory",
    autoRun,
    brief: {
        id: "brief-preview",
        profileId: "profile-preview",
        subject: "验证同一轮图片连续预览",
        purpose: "回归测试",
        platform: "",
        style: "极简",
        scene: "影棚",
        aspectRatio: "1:1",
        constraints: { keep: [], avoid: [] },
        referenceImageIds: [],
        strategy: "balanced",
        createdAt: now,
    },
    rounds: [
        {
            iteration: 1,
            run: {
                id: "run-preview",
                briefId: "brief-preview",
                promptVersionId: "prompt-preview",
                status: "succeeded",
                requestedCount: 2,
                slotIds: ["slot-a", "slot-b"],
                imageIds: ["image-a", "image-b"],
                createdAt: now,
                completedAt: now,
            },
            prompt: {
                id: "prompt-preview",
                briefId: "brief-preview",
                revision: 1,
                status: "used",
                fields: emptyFields,
                compiledPrompt: "minimal still life",
                reason: "建立首轮基线",
                diff: emptyDiff,
                referenceImageIds: [],
                createdAt: now,
            },
            images: ["image-a", "image-b"].map((id) => ({
                image: {
                    id,
                    runId: "run-preview",
                    promptVersionId: "prompt-preview",
                    referenceImageIds: [],
                    width: 1024,
                    height: 1024,
                    status: "pending_review",
                    createdAt: now,
                },
            })),
        },
    ],
};

test("演化轨迹预览只在当前轮次图片间切换", async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "preview-test-token");
    });

    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const data = query.type === "auto_run.list" ? { type: "auto_run.list", autoRuns: [autoRun] } : trajectory;
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/assets/**", async (route) => {
        await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    });

    await page.goto("/frameflow?view=trajectory&autoRunId=auto-run-preview");
    await expect(page.getByRole("heading", { name: "预览分组回归" })).toBeVisible();

    await page.getByAltText("第 1 轮图片 1").click();
    const preview = page.getByRole("dialog");
    const nextImage = preview.getByRole("button", { name: "right", exact: true });
    await expect(nextImage).toBeVisible();
    await nextImage.click();
    await expect(preview).toContainText("2 / 2");
    await expect(preview.locator("img")).toHaveAttribute("src", /image-b/);
});

test("FrameFlow 各预览入口可操作且不改写审核反馈", async ({ page }) => {
    const commands: unknown[] = [];
    const brief = {
        id: "brief-preview",
        profileId: "profile-preview",
        subject: "验证图片预览不改写审核",
        purpose: "回归测试",
        platform: "",
        style: "极简",
        scene: "影棚",
        aspectRatio: "1:1",
        constraints: { keep: [], avoid: [] },
        referenceImageIds: [],
        strategy: "balanced",
        createdAt: now,
    };
    const reviewItems = ["image-a", "image-b"].map((id, index) => ({
        briefId: brief.id,
        requirementArchived: false,
        briefSuperseded: false,
        image: {
            id,
            runId: "run-preview",
            promptVersionId: "prompt-preview",
            referenceImageIds: [],
            width: 1024,
            height: 1024,
            status: "reviewed" as const,
            createdAt: now,
        },
        feedback: {
            rating: index === 0 ? (5 as const) : (1 as const),
            comment: index === 0 ? "保留这一版的光影层次" : "避免这一版的边缘噪点",
        },
    }));
    const preferenceDna = {
        type: "preference.dna",
        briefId: brief.id,
        totalWeight: 3,
        sampleSize: 2,
        boost: [{ imageId: "image-a", weight: 5, sourceEventIds: ["feedback-a"] }],
        avoid: [{ imageId: "image-b", weight: -2, sourceEventIds: ["feedback-b"] }],
        qualityRejections: 0,
    };

    await page.addInitScript(() => {
        localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
        localStorage.setItem("canvas-agent-token", "preview-test-token");
    });
    await page.route("**/agent/frameflow/query?**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string; autoRunId?: string };
        const data =
            query.type === "auto_run.list"
                ? { type: "auto_run.list", autoRuns: [autoRun] }
                : query.type === "auto_run.trajectory"
                  ? trajectory
                  : query.type === "review.queue"
                    ? { type: "review.queue", items: reviewItems }
                    : query.type === "brief.list"
                      ? { type: "brief.list", briefs: [brief] }
                      : query.type === "brief.detail"
                        ? { type: "brief.detail", brief }
                        : query.type === "run.list"
                          ? { type: "run.list", runs: [trajectory.rounds[0].run] }
                          : query.type === "run.detail"
                            ? {
                                  type: "run.detail",
                                  run: trajectory.rounds[0].run,
                                  slots: trajectory.rounds[0].run.imageIds.map((imageId, index) => ({
                                      id: `slot-preview-${index + 1}`,
                                      runId: "run-preview",
                                      index,
                                      status: "succeeded",
                                      attempts: 1,
                                      imageId,
                                  })),
                              }
                            : query.type === "prompt.lineage"
                              ? { type: "prompt.lineage", promptVersionId: "prompt-preview", versions: [trajectory.rounds[0].prompt], decisions: [] }
                              : query.type === "preference.dna"
                                ? preferenceDna
                                : { type: "quarantine.list", items: [] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        commands.push(route.request().postDataJSON());
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: {} }) });
    });
    await page.route("**/agent/frameflow/assets/**", async (route) => {
        await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    });

    await page.goto("/frameflow?view=trajectory&autoRunId=auto-run-preview");
    await page.getByAltText("第 1 轮图片 1").click();
    let preview = page.getByRole("dialog");
    await expect(preview).toContainText("1 / 2");
    await preview.getByRole("button", { name: "right", exact: true }).click();
    await expect(preview).toContainText("2 / 2");
    await expect(preview.locator("img")).toHaveAttribute("src", /image-b/);
    for (const action of ["zoomIn", "zoomOut", "rotateLeft", "rotateRight", "flipX", "flipY"]) {
        await preview.getByRole("button", { name: action, exact: true }).click();
        await expect(preview).toBeVisible();
    }
    await preview.getByRole("button", { name: "close", exact: true }).click();
    await expect(preview).toBeHidden();
    await expect(page.getByAltText("第 1 轮图片 1")).toBeVisible();

    await page.goto("/frameflow?view=lineage&runId=run-preview");
    await page.getByAltText("生成结果 1").click();
    preview = page.getByRole("dialog");
    await expect(preview).toContainText("1 / 2");
    await preview.getByRole("button", { name: "right", exact: true }).click();
    await expect(preview.locator("img")).toHaveAttribute("src", /image-b/);
    await preview.getByRole("button", { name: "close", exact: true }).click();
    await expect(preview).toBeHidden();
    await expect(page.getByAltText("生成结果 1")).toBeVisible();

    await page.goto("/frameflow?view=review&autoRunId=auto-run-preview");
    const inspector = page.getByRole("complementary", { name: "图片审核检查器" });
    await expect(inspector.getByText("5 星", { exact: true })).toBeVisible();
    await expect(inspector.getByText("保留这一版的光影层次", { exact: true })).toBeVisible();
    await inspector.getByAltText("当前审核图片").click();
    preview = page.getByRole("dialog");
    await expect(preview.locator("img")).toHaveAttribute("src", /image-a/);
    await preview.getByRole("button", { name: "close", exact: true }).click();
    await expect(preview).toBeHidden();
    await expect(inspector.getByText("5 星", { exact: true })).toBeVisible();
    await expect(inspector.getByText("保留这一版的光影层次", { exact: true })).toBeVisible();

    await page.goto("/frameflow?view=preference&briefId=brief-preview");
    await expect(page.getByRole("heading", { name: "强化方向" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "规避方向" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comment 证据" })).toBeVisible();
    await page.getByAltText("强化方向图片 image-a").click();
    preview = page.getByRole("dialog");
    await expect(preview).toContainText("1 / 4");
    await preview.getByRole("button", { name: "right", exact: true }).click();
    await expect(preview).toContainText("2 / 4");
    await expect(preview.locator("img")).toHaveAttribute("src", /image-b/);
    await preview.getByRole("button", { name: "close", exact: true }).click();
    await expect(preview).toBeHidden();
    await page.getByAltText("规避方向图片 image-b").click();
    preview = page.getByRole("dialog");
    await expect(preview.locator("img")).toHaveAttribute("src", /image-b/);
    await preview.getByRole("button", { name: "close", exact: true }).click();
    await expect(preview).toBeHidden();
    await page.getByAltText("Comment 证据 image-a").click();
    preview = page.getByRole("dialog");
    await expect(preview.locator("img")).toHaveAttribute("src", /image-a/);
    await preview.getByRole("button", { name: "close", exact: true }).click();
    await expect(preview).toBeHidden();
    await expect(page.getByText("保留这一版的光影层次", { exact: true })).toHaveCount(2);
    expect(commands).toEqual([]);
});
