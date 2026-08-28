import { expect, test } from "@playwright/test";

const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const prompt = "暖色陶瓷杯产品静物，柔和侧逆光，浅灰背景，商业摄影质感";

test("批量图片切换主图后仍回显生成提示词", async ({ page }) => {
    await page.addInitScript(
        async ({ image, prompt }) => {
            const value = JSON.stringify({
                state: {
                    projects: [
                        {
                            id: "batch-prompt",
                            title: "批量提示词回显",
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
                                    id: "batch-root",
                                    type: "image",
                                    title: "陶瓷杯批量结果",
                                    position: { x: 120, y: 80 },
                                    width: 320,
                                    height: 240,
                                    metadata: {
                                        prompt,
                                        status: "success",
                                        content: image,
                                        storageKey: "",
                                        naturalWidth: 1,
                                        naturalHeight: 1,
                                        bytes: 68,
                                        mimeType: "image/png",
                                        primaryImageId: "image-a",
                                        images: [
                                            { id: "image-a", status: "success", content: image, storageKey: "", naturalWidth: 1, naturalHeight: 1, bytes: 68, mimeType: "image/png" },
                                            { id: "image-b", status: "success", content: image, storageKey: "", naturalWidth: 1, naturalHeight: 1, bytes: 68, mimeType: "image/png" },
                                        ],
                                    },
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
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = () => reject(transaction.error);
                };
            });
        },
        { image, prompt },
    );

    await page.goto("/canvas/batch-prompt");
    const root = page.locator('[data-node-id="batch-root"]');
    await root.click();
    const editor = root.locator("[contenteditable='true']");
    await expect(editor).toHaveText(prompt);

    await root.getByRole("button", { name: "图片组已收起" }).click();
    await root.getByTitle("设为主图").click();
    await expect(editor).toHaveText(prompt);

    await page.locator('[data-node-id="batch-root"]').click();
    await expect(editor).toHaveText(prompt);
});
