import { expect, test } from "@playwright/test";

test("画布重复缩放保持受控比例且不触发 React 循环错误", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/canvas");
    await page.getByRole("button", { name: "新建画布" }).first().click();
    await expect(page).toHaveURL(/\/canvas\/[^/]+$/);

    const zoom = page.getByRole("slider", { name: "放大/缩小画布" });
    await expect(zoom).toBeVisible();
    for (const value of [65, 140, 35, 275, 5, 500, 100, 175, 45, 100]) {
        await zoom.fill(String(value));
        await expect(zoom).toHaveValue(String(value));
    }

    await page.getByRole("button", { name: "重置视图" }).click();
    await expect(zoom).toHaveValue("100");
    expect(pageErrors.filter((message) => /maximum update depth|too many re-renders|rendered more hooks/i.test(message))).toEqual([]);
});

test("节点四角反复缩放时隐藏工具条并在松开后恢复", async ({ page }) => {
    const projectId = "canvas-node-resize-stability";
    const seedMarker = "canvas-node-resize-stability-seeded";
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.addInitScript(
        async ({ projectId, seedMarker }) => {
            if (window.name === seedMarker) return;
            const value = JSON.stringify({
                state: {
                    projects: [
                        {
                            id: projectId,
                            title: "节点缩放稳定性回归",
                            createdAt: "2026-08-28T00:00:00.000Z",
                            updatedAt: "2026-08-28T00:00:00.000Z",
                            connections: [],
                            chatSessions: [],
                            activeChatId: null,
                            backgroundMode: "lines",
                            showImageInfo: false,
                            viewport: { x: 420, y: 260, k: 1 },
                            nodes: [{ id: "resize-node", type: "text", title: "缩放节点", position: { x: 140, y: 120 }, width: 260, height: 180, metadata: { content: "反复拖动四角缩放", status: "success" } }],
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

    const node = page.locator('[data-node-id="resize-node"]');
    const editText = page.getByRole("button", { name: "编辑文本", exact: true });
    await expect(node).toBeVisible();
    await node.click();
    await expect(editText).toBeVisible();

    const dragBy = {
        "top-left": { x: -24, y: -24 },
        "top-right": { x: 24, y: -24 },
        "bottom-left": { x: -24, y: 24 },
        "bottom-right": { x: 24, y: 24 },
    } as const;
    for (const [corner, offset] of Object.entries(dragBy)) {
        const handle = node.locator(`[data-node-resize-handle="${corner}"]`);
        const before = await node.getAttribute("style");
        const box = await handle.boundingBox();
        if (!box) throw new Error(`缩放控制柄 ${corner} 未取得可用边界`);

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + offset.x, box.y + box.height / 2 + offset.y);
        await expect(editText).toHaveCount(0);
        await expect.poll(() => node.getAttribute("style")).not.toBe(before);
        await page.mouse.up();
        await expect(editText).toBeVisible();
    }

    expect(pageErrors.filter((message) => /maximum update depth|too many re-renders|rendered more hooks/i.test(message))).toEqual([]);
});
