import { expect, test } from "@playwright/test";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("FrameFlow 创建页导入隔离参考图、刷新恢复并重新填写新工作流", async ({ page }) => {
    const commands: Array<{ type?: string; input?: { referenceImageIds?: string[] }; idempotencyKey?: string }> = [];
    const asset = {
        id: "reference-asset",
        kind: "image",
        title: "隔离参考图",
        coverUrl: png,
        tags: ["FrameFlow"],
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
        data: { dataUrl: png, width: 1, height: 1, bytes: 68, mimeType: "image/png" },
    };
    await page.addInitScript(
        ({ asset }) => {
            localStorage.setItem("canvas-agent-url", "http://127.0.0.1:4173");
            localStorage.setItem("canvas-agent-token", "frameflow-reference-picker-token");
        },
        { asset },
    );
    await page.route("**/agent/frameflow/references/import?**", async (route) => {
        expect(route.request().headers()["content-type"]).toContain("image/png");
        expect(route.request().postDataBuffer()?.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
                ok: true,
                data: {
                    reference: {
                        id: "controlled-reference",
                        source: { type: "browser_asset", id: asset.id, name: "隔离参考图.png" },
                        file: { relativePath: "references/controlled.png", sha256: "a".repeat(64), bytes: 68, mimeType: "image/png" },
                        width: 1,
                        height: 1,
                        createdAt: asset.createdAt,
                    },
                },
            }),
        });
    });
    await page.route("**/agent/frameflow/commands**", async (route) => {
        const command = route.request().postDataJSON() as { type?: string; input?: { referenceImageIds?: string[] } };
        commands.push(command);
        const resource = command.type === "brief.create" ? { type: "brief", id: "brief-reference" } : { type: "prompt_version", id: "prompt-reference" };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: { resource } }) });
    });
    await page.route("**/agent/frameflow/query**", async (route) => {
        const query = route.request().postDataJSON() as { type?: string };
        const brief = {
            id: "brief-reference",
            profileId: "default",
            subject: "隔离参考商品",
            purpose: "审美训练与灵感采集",
            aspectRatio: "4:5",
            constraints: { keep: [], avoid: [] },
            referenceImageIds: ["controlled-reference"],
            strategy: "balanced",
            createdAt: asset.createdAt,
        };
        const prompt = {
            id: "prompt-reference",
            briefId: brief.id,
            revision: 1,
            status: "draft",
            fields: { subject: ["reference product"], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [] },
            compiledPrompt: "reference product",
            reason: "隔离参考图规划。",
            diff: { keep: [], add: [], change: [], remove: [], avoid: [] },
            referenceImageIds: ["controlled-reference"],
            createdAt: asset.createdAt,
        };
        const data = query.type === "brief.detail" ? { type: "brief.detail", brief } : { type: "prompt.lineage", promptVersionId: prompt.id, versions: [prompt], decisions: [] };
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data }) });
    });
    await page.goto("/frameflow?view=create");
    await page.waitForFunction(async () => (await import("/src/stores/use-asset-store.ts")).useAssetStore.getState().hydrated);
    await page.evaluate(async (asset) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        context?.fillRect(0, 0, 1, 1);
        const storedAsset = { ...asset, data: { ...asset.data, dataUrl: canvas.toDataURL("image/webp"), mimeType: "image/webp" } };
        const { useAssetStore } = await import("/src/stores/use-asset-store.ts");
        useAssetStore.setState({ assets: [storedAsset], hydrated: true });
    }, asset);
    await page.getByRole("button", { name: "选择", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "选择 FrameFlow 参考图" }).getByAltText("隔离参考图")).toBeVisible();
    await page.getByRole("button", { name: "隔离参考图" }).click();
    await page.getByRole("button", { name: "使用 1 张参考图" }).click();
    await expect(page.getByAltText("隔离参考图").first()).toBeVisible();

    await page.getByLabel("主体").fill("隔离参考商品");
    await page.getByRole("button", { name: "让 Codex 生成 Prompt" }).click();
    await expect(page.getByRole("heading", { name: "Prompt Version 1" })).toBeVisible();
    await expect(page.getByText("已绑定 1 张受控参考图")).toBeVisible();
    expect(commands.map((command) => command.type)).toEqual(["brief.create", "round.plan"]);
    expect(commands[0]?.input?.referenceImageIds).toEqual(["controlled-reference"]);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Prompt Version 1" })).toBeVisible();
    await expect(page.getByText("已恢复 1 张受控参考图")).toBeVisible();
    await expect(page.getByText("已绑定 1 张受控参考图")).toBeVisible();

    await page.getByRole("button", { name: "重新填写" }).click();
    await expect(page.getByRole("heading", { name: "Prompt Version 1" })).toHaveCount(0);
    await expect(page.getByLabel("主体")).toHaveValue("");
    await expect(page.getByText("未选择参考图，可直接使用文字 Brief")).toBeVisible();
    await page.getByLabel("主体").fill("重新填写的隔离商品");
    await page.getByRole("button", { name: "让 Codex 生成 Prompt" }).click();
    await expect.poll(() => commands.map((command) => command.type)).toEqual(["brief.create", "round.plan", "brief.create", "round.plan"]);
    expect(commands[0]?.idempotencyKey).not.toEqual(commands[2]?.idempotencyKey);
});
