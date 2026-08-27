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
