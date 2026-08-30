import { expect, test } from "@playwright/test";

const projectId = "canvas-tool-interactions";
const seedMarker = "canvas-tool-interactions-seeded";

test("画布选择和移动工具保持快捷键、框选、节点拖动与中键平移语义", async ({ page }) => {
    await page.addInitScript(
        async ({ projectId, seedMarker }) => {
            if (window.name === seedMarker) return;
            const value = JSON.stringify({
                state: {
                    projects: [
                        {
                            id: projectId,
                            title: "画布工具交互回归",
                            createdAt: "2026-08-28T00:00:00.000Z",
                            updatedAt: "2026-08-28T00:00:00.000Z",
                            connections: [],
                            chatSessions: [],
                            activeChatId: null,
                            backgroundMode: "lines",
                            showImageInfo: false,
                            viewport: { x: 420, y: 280, k: 1 },
                            nodes: [
                                { id: "tool-node-a", type: "text", title: "节点 A", position: { x: 100, y: 100 }, width: 220, height: 140, metadata: { content: "节点 A 内容", status: "success" } },
                                { id: "tool-node-b", type: "text", title: "节点 B", position: { x: 380, y: 100 }, width: 220, height: 140, metadata: { content: "节点 B 内容", status: "success" } },
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

    const canvas = page.locator("div.relative.h-full.w-full.select-none.overflow-hidden");
    const world = canvas.locator(":scope > div.absolute.origin-top-left");
    const nodeA = page.locator('[data-node-id="tool-node-a"]');
    const nodeB = page.locator('[data-node-id="tool-node-b"]');
    const selectTool = page.getByLabel("选择", { exact: true });
    await expect(nodeA).toBeVisible();
    await expect(nodeB).toBeVisible();
    await expect(selectTool).toBeVisible();

    const startNodeAStyle = await nodeA.getAttribute("style");
    const nodeABox = await nodeA.boundingBox();
    const nodeBBox = await nodeB.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!nodeABox || !nodeBBox || !canvasBox) throw new Error("画布节点未取得可用边界");

    await nodeA.dragTo(nodeA, { sourcePosition: { x: 24, y: 24 }, targetPosition: { x: 100, y: 72 } });
    await expect.poll(() => nodeA.getAttribute("style")).not.toBe(startNodeAStyle);

    await nodeA.click();
    await nodeB.click({ modifiers: ["Shift"] });
    await expect(nodeA).toHaveClass(/z-50/);
    await expect(nodeB).toHaveClass(/z-50/);

    const selectionStart = { x: Math.min(nodeABox.x, nodeBBox.x) - 24, y: Math.min(nodeABox.y, nodeBBox.y) - 24 };
    const selectionEnd = { x: Math.max(nodeABox.x + nodeABox.width, nodeBBox.x + nodeBBox.width) + 24, y: Math.max(nodeABox.y + nodeABox.height, nodeBBox.y + nodeBBox.height) + 24 };
    await page.mouse.move(selectionStart.x, selectionStart.y);
    await page.mouse.down();
    await page.mouse.move(selectionEnd.x, selectionEnd.y);
    const selection = page.locator("svg.pointer-events-none rect");
    await expect(selection).toBeVisible();
    await expect(selection).toHaveAttribute("stroke-dasharray", "6 4");
    await expect(selection).toHaveAttribute("stroke-width", "1");
    await page.mouse.up();

    const zoom = page.getByRole("slider", { name: "放大/缩小画布" });
    await zoom.fill("175");
    await page.mouse.move(selectionStart.x, selectionStart.y);
    await page.mouse.down();
    await page.mouse.move(selectionEnd.x, selectionEnd.y);
    await expect(selection).toBeVisible();
    const scaledStroke = await selection.evaluate((element) => ({ dash: element.getAttribute("stroke-dasharray"), width: element.getAttribute("stroke-width") }));
    expect(scaledStroke.dash).toBe(`${6 / 1.75} ${4 / 1.75}`);
    expect(scaledStroke.width).toBe(String(1 / 1.75));
    await page.mouse.up();

    await selectTool.click();
    await expect(canvas).toHaveCSS("cursor", "grab");
    const beforePan = await world.getAttribute("style");
    const blankStart = { x: canvasBox.x + canvasBox.width - 80, y: canvasBox.y + 80 };
    const blankEnd = { x: blankStart.x - 80, y: blankStart.y + 60 };
    await page.mouse.move(blankStart.x, blankStart.y);
    await page.mouse.down();
    await page.mouse.move(blankEnd.x, blankEnd.y);
    await page.mouse.up();
    await expect.poll(() => world.getAttribute("style")).not.toBe(beforePan);

    const beforeNodePan = await world.getAttribute("style");
    const nodeStyleBeforePan = await nodeA.getAttribute("style");
    const nodeBoxForPan = await nodeA.boundingBox();
    if (!nodeBoxForPan) throw new Error("节点 A 未取得可用边界");
    await page.mouse.move(nodeBoxForPan.x + 90, nodeBoxForPan.y + 70);
    await page.mouse.down();
    await page.mouse.move(nodeBoxForPan.x + 150, nodeBoxForPan.y + 112);
    await page.mouse.up();
    await expect.poll(() => world.getAttribute("style")).not.toBe(beforeNodePan);
    await expect(nodeA).toHaveAttribute("style", nodeStyleBeforePan || "");

    await page.keyboard.down("Control");
    await expect(canvas).toHaveCSS("cursor", "auto");
    await page.mouse.move(blankStart.x, blankStart.y);
    await page.mouse.down();
    await page.mouse.move(blankEnd.x, blankEnd.y);
    await expect(selection).toBeVisible();
    await page.mouse.up();
    await page.keyboard.up("Control");
    await expect(canvas).toHaveCSS("cursor", "grab");

    const beforeMiddlePan = await world.getAttribute("style");
    await page.mouse.move(blankStart.x, blankStart.y);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(blankEnd.x, blankEnd.y);
    await page.mouse.up({ button: "middle" });
    await expect.poll(() => world.getAttribute("style")).not.toBe(beforeMiddlePan);

    const addText = page.getByRole("button", { name: "文本", exact: true });
    const nodesBeforeSpace = await page.locator("[data-node-id]").count();
    await addText.focus();
    await page.keyboard.down("Space");
    await expect(canvas).toHaveCSS("cursor", "auto");
    await page.keyboard.up("Space");
    await expect(canvas).toHaveCSS("cursor", "grab");
    await expect(page.locator("[data-node-id]")).toHaveCount(nodesBeforeSpace);

    await page.getByLabel("移动", { exact: true }).click();
    await nodeA.click();
    const editText = page.getByRole("button", { name: "编辑文本", exact: true });
    await expect(editText).toBeVisible();
    await editText.click();
    const editor = nodeA.locator("textarea");
    await expect(editor).toBeVisible();
    const textBeforeSpace = await editor.inputValue();
    await editor.press("End");
    await editor.press("Space");
    await expect(editor).toHaveValue(`${textBeforeSpace} `);

    await zoom.focus();
    const zoomBeforeSpace = await zoom.inputValue();
    await page.keyboard.down("Space");
    await expect(canvas).toHaveCSS("cursor", "auto");
    await page.keyboard.up("Space");
    await expect(canvas).toHaveCSS("cursor", "auto");
    await expect(zoom).toHaveValue(zoomBeforeSpace);

    await page.locator('button[aria-label="生成配置"]').click();
    const textMode = page.getByRole("radio", { name: "文本", exact: true });
    await textMode.focus();
    await page.keyboard.press("Space");
    await expect(textMode).toBeChecked();
    await expect(canvas).toHaveCSS("cursor", "auto");

    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({
            url: "http://127.0.0.1:4173",
            token: "canvas-tool-tabs",
            connected: true,
            enabled: false,
            panelOpen: false,
            panelMounted: false,
            panelClosing: false,
            activeTab: "chat",
            messages: [],
            threads: [],
            loadingThreads: false,
            sending: false,
            waiting: false,
        });
    });
    await page.getByRole("button", { name: "Agent", exact: true }).click();
    const logTab = page.getByRole("tab", { name: "日志", exact: true });
    await expect(logTab).toBeVisible();
    await logTab.focus();
    await page.keyboard.press("Space");
    await expect(logTab).toHaveAttribute("aria-selected", "true");
    await expect(canvas).toHaveCSS("cursor", "auto");
});
