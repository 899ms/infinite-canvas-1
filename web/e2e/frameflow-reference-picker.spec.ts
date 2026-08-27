import { expect, test } from "@playwright/test";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("FrameFlow 创建页可从隔离资产库选择参考图", async ({ page }) => {
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
    await page.goto("/frameflow?view=create");
    await page.getByRole("button", { name: "选择", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "选择 FrameFlow 参考图" }).getByAltText("隔离参考图")).toBeVisible();
    await page.getByRole("button", { name: "隔离参考图" }).click();
    await page.getByRole("button", { name: "使用 1 张参考图" }).click();
    await expect(page.getByAltText("隔离参考图").first()).toBeVisible();
});
