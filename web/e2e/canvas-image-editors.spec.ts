import { expect, test } from "@playwright/test";

const projectId = "canvas-image-editors";
const seedMarker = "canvas-image-editors-seeded";

test("图片遮罩、裁剪和切图编辑器在滚轮缩放时保持预览同步", async ({ page }) => {
    await page.addInitScript(
        async ({ projectId, seedMarker }) => {
            if (window.name === seedMarker) return;
            const bitmap = document.createElement("canvas");
            bitmap.width = 800;
            bitmap.height = 480;
            const context = bitmap.getContext("2d");
            context?.fillRect(0, 0, bitmap.width, bitmap.height);
            const image = bitmap.toDataURL("image/png");
            const value = JSON.stringify({
                state: {
                    projects: [
                        {
                            id: projectId,
                            title: "图片编辑器隔离回归",
                            createdAt: "2026-08-28T00:00:00.000Z",
                            updatedAt: "2026-08-28T00:00:00.000Z",
                            connections: [],
                            chatSessions: [],
                            activeChatId: null,
                            backgroundMode: "lines",
                            showImageInfo: false,
                            viewport: { x: 420, y: 280, k: 1 },
                            nodes: [
                                {
                                    id: "editable-image",
                                    type: "image",
                                    title: "隔离编辑图片",
                                    position: { x: 120, y: 80 },
                                    width: 400,
                                    height: 240,
                                    metadata: { content: image, status: "success", naturalWidth: 800, naturalHeight: 480, bytes: image.length, mimeType: "image/png" },
                                },
                            ],
                        },
                    ],
                },
                version: 0,
            });
            await new Promise<void>((resolve, reject) => {
                const request = indexedDB.open("infinite-canvas");
                request.onupgradeneeded = () => {
                    if (!request.result.objectStoreNames.contains("app_state")) request.result.createObjectStore("app_state");
                };
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const transaction = request.result.transaction("app_state", "readwrite");
                    transaction.objectStore("app_state").put(value, "infinite-canvas:canvas_store");
                    transaction.oncomplete = () => {
                        window.name = seedMarker;
                        resolve();
                    };
                    transaction.onerror = () => reject(transaction.error);
                };
            });
        },
        { projectId, seedMarker },
    );
    await page.goto("/");
    await page.waitForFunction((marker) => window.name === marker, seedMarker);
    await page.goto(`/canvas/${projectId}`);

    const imageNode = page.locator('[data-node-id="editable-image"]');
    await expect(imageNode).toBeVisible();
    await imageNode.click();
    await expect(page.getByRole("button", { name: "添加蒙版遮罩后局部修改", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "裁剪并生成新节点", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "按行列切分图片", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "添加蒙版遮罩后局部修改", exact: true }).click();
    const maskDialog = page.locator(".ant-modal").filter({ hasText: "局部遮罩编辑" });
    await expect(maskDialog).toBeVisible();
    await zoomByWheel(maskDialog, "局部遮罩编辑");
    await expect(maskDialog.locator("canvas:not(.hidden)")).toHaveCount(1);
    await expect(
        maskDialog.locator("canvas:not(.hidden)").evaluate((canvas) => {
            const image = canvas.parentElement?.querySelector("img");
            if (!image) return false;
            const canvasBox = canvas.getBoundingClientRect();
            const imageBox = image.getBoundingClientRect();
            return Math.abs(canvasBox.x - imageBox.x) < 1 && Math.abs(canvasBox.y - imageBox.y) < 1 && Math.abs(canvasBox.width - imageBox.width) < 1 && Math.abs(canvasBox.height - imageBox.height) < 1;
        }),
    ).resolves.toBe(true);
    const maskCanvas = maskDialog.locator("canvas:not(.hidden)");
    const maskBox = await maskCanvas.boundingBox();
    if (!maskBox) throw new Error("遮罩画布未取得可用边界");
    const brushOrigin = { x: maskBox.x + maskBox.width * 0.42, y: maskBox.y + maskBox.height * 0.58 };
    await page.mouse.move(brushOrigin.x, brushOrigin.y);
    const brushPreview = page.locator("div.fixed.z-\\[1100\\]");
    await expect(brushPreview).toBeVisible();
    const previewBefore = await brushPreview.boundingBox();
    if (!previewBefore) throw new Error("遮罩笔刷预览未取得可用边界");
    await page.keyboard.down("Alt");
    await page.mouse.down();
    await page.mouse.move(brushOrigin.x + 40, brushOrigin.y);
    await page.mouse.up();
    await page.keyboard.up("Alt");
    const previewAfter = await brushPreview.boundingBox();
    if (!previewAfter) throw new Error("调整后的遮罩笔刷预览未取得可用边界");
    expect(previewAfter.width).toBeGreaterThan(previewBefore.width);
    expect(Math.abs(previewAfter.x + previewAfter.width / 2 - (brushOrigin.x + 40))).toBeLessThan(1);
    expect(Math.abs(previewAfter.y + previewAfter.height / 2 - brushOrigin.y)).toBeLessThan(1);
    await maskDialog.getByRole("button", { name: "取消", exact: true }).click();

    await imageNode.click();
    await page.getByRole("button", { name: "裁剪并生成新节点", exact: true }).click();
    const cropDialog = page.getByRole("dialog", { name: "裁剪图片" });
    await expect(cropDialog).toBeVisible();
    await zoomByWheel(cropDialog, "裁剪图片");
    await expect(
        cropDialog.locator("div.absolute.cursor-move").evaluate((frame) => {
            const image = frame.parentElement?.querySelector("img");
            if (!image) return false;
            const frameBox = frame.getBoundingClientRect();
            const imageBox = image.getBoundingClientRect();
            return frameBox.left >= imageBox.left && frameBox.top >= imageBox.top && frameBox.right <= imageBox.right && frameBox.bottom <= imageBox.bottom;
        }),
    ).resolves.toBe(true);
    await cropDialog.getByRole("button", { name: "取消", exact: true }).click();

    await imageNode.click();
    await page.getByRole("button", { name: "按行列切分图片", exact: true }).click();
    const splitDialog = page.locator(".ant-modal").filter({ hasText: "切分图片" });
    await expect(splitDialog).toBeVisible();
    await zoomByWheel(splitDialog, "切分图片");
    await expect(
        splitDialog.locator("div.cursor-ew-resize").evaluate((line) => {
            const stage = line.parentElement?.parentElement;
            if (!stage) return false;
            const lineBox = line.getBoundingClientRect();
            const stageBox = stage.getBoundingClientRect();
            return Math.abs(lineBox.x + lineBox.width / 2 - (stageBox.x + stageBox.width / 2)) < 1 && lineBox.height >= stageBox.height * 0.98;
        }),
    ).resolves.toBe(true);
});

async function zoomByWheel(dialog: import("@playwright/test").Locator, label: string) {
    const preview = dialog.locator("img").first();
    await expect(preview).toBeVisible();
    const initialBox = await preview.boundingBox();
    if (!initialBox) throw new Error(`${label} 预览未取得可用边界`);
    const browserPage = preview.page();
    await browserPage.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
    await browserPage.mouse.wheel(0, -100);
    await expect(dialog.getByRole("button", { name: "120%", exact: true })).toBeVisible();
    await browserPage.mouse.wheel(0, -100);
    await expect(dialog.getByRole("button", { name: "144%", exact: true })).toBeVisible();
    await expect(preview.evaluate((element, width) => element.getBoundingClientRect().width > width, initialBox.width)).resolves.toBe(true);
}
