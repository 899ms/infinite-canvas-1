import { expect, test } from "@playwright/test";

const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const prompt = "暖色陶瓷杯产品静物，柔和侧逆光，浅灰背景，商业摄影质感";
const retriedImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAIAAAAW4yFwAAAADElEQVR42mNk+M8AAAICAQB7CY+7AAAAAElFTkSuQmCC", "base64");

async function nodeLayout(locator: import("@playwright/test").Locator) {
    return locator.evaluate((element) => {
        const position = element.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        if (!position) throw new Error(`无法读取节点位置：${element.style.transform}`);
        return { x: Number(position[1]), y: Number(position[2]), width: Number.parseFloat(element.style.width), height: Number.parseFloat(element.style.height) };
    });
}

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

test("多图图片组折叠、展开、主图切换与空白画布收起", async ({ page }) => {
    await page.addInitScript(
        async ({ image, prompt }) => {
            const value = JSON.stringify({
                state: {
                    projects: [
                        {
                            id: "batch-interaction",
                            title: "多图图片组交互",
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
                                    title: "四张产品图",
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
                                            { id: "image-a", status: "success", content: image, storageKey: "", naturalWidth: 1600, naturalHeight: 900, bytes: 68, mimeType: "image/png" },
                                            { id: "image-b", status: "success", content: image, storageKey: "", naturalWidth: 900, naturalHeight: 1600, bytes: 68, mimeType: "image/png" },
                                            { id: "image-c", status: "loading" },
                                            { id: "image-d", status: "error", errorDetails: "第 4 张生成失败" },
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

    await page.goto("/canvas/batch-interaction");
    const root = page.locator('[data-node-id="batch-root"]');
    await root.click();
    const removeNode = page.getByRole("button", { name: "移除节点" }).first();
    await expect(removeNode).toBeVisible();
    await expect(root.locator("[data-batch-backboard]")).toHaveCount(3);
    await expect(root.getByRole("button", { name: "图片组已收起" })).toHaveText("4 张");

    await root.getByRole("button", { name: "图片组已收起" }).click();
    await expect(root.getByRole("button", { name: "图片组已展开" })).toBeVisible();
    await expect(removeNode).not.toBeVisible();
    await expect(root.locator('[data-batch-image-id="image-b"]')).toBeVisible();
    await expect(root.locator('[data-batch-image-id="image-c"]')).toContainText("生成中");
    await expect(root.locator('[data-batch-image-id="image-d"]')).toContainText("第 4 张生成失败");

    const beforePrimarySwitch = await nodeLayout(root);
    await root.locator('[data-batch-image-id="image-b"]').getByTitle("设为主图").click();
    await expect(root.locator("[data-batch-primary]")).toHaveAttribute("data-batch-image-id", "image-b");
    await expect(root.locator('[data-batch-image-id="image-a"]')).toBeVisible();
    const afterPrimarySwitch = await nodeLayout(root);
    expect(afterPrimarySwitch.width).toBeCloseTo(180, 1);
    expect(afterPrimarySwitch.height).toBeCloseTo(320, 1);
    expect(afterPrimarySwitch.x + afterPrimarySwitch.width / 2).toBeCloseTo(beforePrimarySwitch.x + beforePrimarySwitch.width / 2, 1);
    expect(afterPrimarySwitch.y + afterPrimarySwitch.height / 2).toBeCloseTo(beforePrimarySwitch.y + beforePrimarySwitch.height / 2, 1);

    const canvas = page.locator("section > div.relative.h-full.w-full.select-none.overflow-hidden");
    const backgroundPoint = await canvas.evaluate((container) => {
        const rect = container.getBoundingClientRect();
        for (const y of [0.7, 0.6, 0.5, 0.4, 0.3]) {
            for (const x of [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]) {
                const clientX = rect.left + rect.width * x;
                const clientY = rect.top + rect.height * y;
                const target = document.elementFromPoint(clientX, clientY);
                if (target && container.contains(target) && !target.closest("[data-node-id],[data-connection-id],[data-canvas-no-zoom]")) return { x: clientX, y: clientY };
            }
        }
        throw new Error("未找到可点击的画布空白区域");
    });
    await page.mouse.click(backgroundPoint.x, backgroundPoint.y);
    await expect(root.getByRole("button", { name: "图片组已收起" })).toBeVisible();

    await root.click();
    const beforeResize = await nodeLayout(root);
    const handle = root.locator('[data-node-resize-handle="bottom-right"]');
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error("图片组右下角缩放控制柄不可用");
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 36, handleBox.y + handleBox.height / 2 + 36);
    await expect.poll(() => nodeLayout(root)).not.toEqual(beforeResize);
    await page.mouse.up();
    const afterResize = await nodeLayout(root);
    expect(afterResize.width).toBeGreaterThan(beforeResize.width);
    expect(afterResize.height / afterResize.width).toBeCloseTo(1600 / 900, 2);
    await expect(root.getByRole("button", { name: "图片组已收起" })).toBeVisible();
});

test("失败图片槽位可独立重试与删除", async ({ page }) => {
    const imageRequests: Array<{ count?: number }> = [];
    await page.addInitScript(
        async ({ image, prompt }) => {
            const value = JSON.stringify({
                state: {
                    projects: [
                        {
                            id: "batch-failure-slots",
                            title: "失败槽位回归",
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
                                    title: "失败槽位",
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
                                        generationType: "generation",
                                        model: "gpt-image-1",
                                        size: "1:1",
                                        count: 3,
                                        primaryImageId: "image-a",
                                        images: [
                                            { id: "image-a", status: "success", content: image, storageKey: "", naturalWidth: 1, naturalHeight: 1, bytes: 68, mimeType: "image/png" },
                                            { id: "image-b", status: "error", errorDetails: "第二张失败" },
                                            { id: "image-c", status: "error", errorDetails: "第三张失败" },
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
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/canvas-images") {
            imageRequests.push(route.request().postDataJSON() as { count?: number });
            await route.fulfill({ json: { ok: true, data: { images: ["retried-slot.png"] } } });
            return;
        }
        if (path === "/agent/local-image") {
            await route.fulfill({ contentType: "image/png", body: retriedImage });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });

    await page.goto("/canvas/batch-failure-slots");
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({ url: "http://127.0.0.1:4173", token: "batch-failure-slots-token", connected: true, enabled: false });
    });
    const root = page.locator('[data-node-id="batch-root"]');
    await root.getByRole("button", { name: "图片组已收起" }).click();
    const retriedSlot = root.locator('[data-batch-image-id="image-b"]');
    const untouchedFailure = root.locator('[data-batch-image-id="image-c"]');
    await retriedSlot.getByRole("button", { name: "重试" }).click();
    await expect.poll(() => imageRequests).toEqual([expect.objectContaining({ count: 1 })]);
    await expect(retriedSlot.getByTitle("设为主图")).toBeVisible();
    await expect(untouchedFailure).toContainText("第三张失败");

    await untouchedFailure.getByRole("button", { name: "删除" }).click();
    await expect(untouchedFailure).toHaveCount(0);
    await expect(root.getByRole("button", { name: "图片组已展开" })).toHaveText("2 张");
});
