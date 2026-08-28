import { expect, test } from "@playwright/test";

const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("画布左侧元素可定位选中，图片预览不触发定位", async ({ page }) => {
    await page.addInitScript(
        async (image) => {
            const value = JSON.stringify({
                state: {
                    projects: [
                        {
                            id: "side-panel-focus",
                            title: "元素列表定位",
                            createdAt: "2026-08-28T00:00:00.000Z",
                            updatedAt: "2026-08-28T00:00:00.000Z",
                            connections: [],
                            chatSessions: [],
                            activeChatId: null,
                            backgroundMode: "lines",
                            showImageInfo: false,
                            viewport: { x: 0, y: 0, k: 1 },
                            nodes: [
                                {
                                    id: "distant-image",
                                    type: "image",
                                    title: "远处预览图",
                                    position: { x: 2400, y: 1800 },
                                    width: 320,
                                    height: 240,
                                    metadata: {
                                        status: "success",
                                        content: image,
                                        storageKey: "",
                                        naturalWidth: 1,
                                        naturalHeight: 1,
                                        bytes: 68,
                                        mimeType: "image/png",
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
        image,
    );

    await page.goto("/canvas/side-panel-focus");
    const node = page.locator('[data-node-id="distant-image"]');
    const focus = page.getByTitle("定位到节点").filter({ hasText: "远处预览图" });

    await expect(node).toHaveCount(0);
    await page.getByRole("button", { name: "放大预览" }).click();
    await expect(page.getByRole("dialog")).toContainText("图片详情");
    await expect(page.getByRole("dialog").locator("img")).toHaveAttribute("alt", "远处预览图");
    await expect(page.getByRole("dialog").locator("img")).toHaveAttribute("src", /^blob:/);
    await expect(node).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await focus.click();
    await expect(node).toHaveClass(/z-50/);
    await expect(node).toBeInViewport();
});
