import { expect, test } from "@playwright/test";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("FrameFlow 创建页导入隔离参考图并在刷新后恢复受控绑定", async ({ page }) => {
    const commands: Array<{ type?: string; input?: { referenceImageIds?: string[] } }> = [];
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
            const request = indexedDB.open("infinite-canvas");
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains("app_state")) request.result.createObjectStore("app_state");
            };
            request.onsuccess = () => {
                const transaction = request.result.transaction("app_state", "readwrite");
                transaction.objectStore("app_state").put(JSON.stringify({ state: { assets: [asset] }, version: 0 }), "infinite-canvas:asset_store");
            };
        },
        { asset },
    );
    await page.route("**/agent/frameflow/references/import?**", async (route) => {
        expect(route.request().headers()["content-type"]).toContain("image/png");
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
    await page.waitForFunction(async () => {
        return await new Promise<boolean>((resolve, reject) => {
            const request = indexedDB.open("infinite-canvas");
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const transaction = request.result.transaction("app_state", "readonly");
                const read = transaction.objectStore("app_state").get("infinite-canvas:asset_store");
                read.onerror = () => reject(read.error);
                read.onsuccess = () => resolve(Boolean(read.result));
            };
        });
    });
    await page.reload();
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
});
