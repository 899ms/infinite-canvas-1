import { expect, test } from "@playwright/test";

const imageDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAIAAAAW4yFwAAAADElEQVR42mNk+M8AAAICAQB7CY+7AAAAAElFTkSuQmCC";
const generatedPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAIAAAAW4yFwAAAADElEQVR42mNk+M8AAAICAQB7CY+7AAAAAElFTkSuQmCC", "base64");
const projectId = "attachment-reload-generation";
const storageKey = "image:agent-reference-after-reload";
const seedMarker = "attachment-reload-generation-seeded";

test("刷新后持久化的 Agent 参考图仍会作为 Codex ImageGen 附件参与生成", async ({ page }) => {
    const imageRequests: Array<{ prompt?: string; attachments?: Array<{ id: string; name: string; type: string; dataUrl: string }> }> = [];
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.addInitScript(
        async ({ projectId, storageKey, seedMarker }) => {
            if (window.name === seedMarker) return;
            const canvasState = JSON.stringify({
                state: {
                    projects: [
                        {
                            id: projectId,
                            title: "附件刷新生成回归",
                            createdAt: "2026-08-28T00:00:00.000Z",
                            updatedAt: "2026-08-28T00:00:00.000Z",
                            backgroundMode: "lines",
                            showImageInfo: false,
                            viewport: { x: 420, y: 280, k: 1 },
                            chatSessions: [],
                            activeChatId: null,
                            nodes: [
                                {
                                    id: "persisted-agent-image",
                                    type: "image",
                                    title: "商品参考.png",
                                    position: { x: 80, y: 80 },
                                    width: 1,
                                    height: 2,
                                    metadata: { content: "blob:stale-agent-reference", storageKey, status: "success", naturalWidth: 1, naturalHeight: 2, bytes: 69, mimeType: "image/png" },
                                },
                                {
                                    id: "attachment-analysis",
                                    type: "text",
                                    title: "商品分析",
                                    position: { x: 320, y: 80 },
                                    width: 280,
                                    height: 180,
                                    metadata: { content: "提取商品卖点，生成简洁的电商主图。", status: "success" },
                                },
                                {
                                    id: "attachment-config",
                                    type: "config",
                                    title: "商品主图生成",
                                    position: { x: 660, y: 80 },
                                    width: 360,
                                    height: 320,
                                    metadata: { generationMode: "image", composerContent: "@[node:attachment-analysis]\\n@[node:persisted-agent-image]", size: "1:1", count: 1, status: "idle" },
                                },
                            ],
                            connections: [
                                { id: "analysis-to-config", fromNodeId: "attachment-analysis", toNodeId: "attachment-config" },
                                { id: "image-to-config", fromNodeId: "persisted-agent-image", toNodeId: "attachment-config" },
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
                    transaction.objectStore("app_state").put(canvasState, "infinite-canvas:canvas_store");
                    transaction.oncomplete = () => {
                        window.name = seedMarker;
                        resolve();
                    };
                    transaction.onerror = () => reject(transaction.error);
                };
            });
        },
        { projectId, storageKey, seedMarker },
    );
    await page.goto("/");
    await page.waitForFunction((marker) => window.name === marker, seedMarker);
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/canvas-images") {
            imageRequests.push(route.request().postDataJSON() as (typeof imageRequests)[number]);
            await route.fulfill({ json: { ok: true, data: { images: ["generated-attachment.png"] } } });
            return;
        }
        if (path === "/agent/local-image") {
            await route.fulfill({ contentType: "image/png", body: generatedPng });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });

    await page.goto(`/canvas/${projectId}`);
    await expect.poll(() => pageErrors).toEqual([]);
    await expect(page.getByText("商品主图生成", { exact: true })).toBeVisible();
    await expect
        .poll(() =>
            page.evaluate(
                async ({ dataUrl, storageKey }) => {
                    const { getImageBlob, setImageBlob } = await import("/src/services/image-storage.ts");
                    await setImageBlob(storageKey, await (await fetch(dataUrl)).blob());
                    return Boolean(await getImageBlob(storageKey));
                },
                { dataUrl: imageDataUrl, storageKey },
            ),
        )
        .toBe(true);
    await page.reload();
    await expect(page.getByText("商品主图生成", { exact: true })).toBeVisible();
    await page.evaluate(async () => {
        const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
        useAgentStore.setState({ url: "http://127.0.0.1:4173", token: "attachment-reload-token", connected: true, enabled: true });
    });

    const generate = page.getByRole("button", { name: "开始生成", exact: true });
    await expect(generate).toBeEnabled();
    await generate.click();

    await expect
        .poll(() => imageRequests)
        .toEqual([
            expect.objectContaining({
                prompt: expect.stringContaining("提取商品卖点，生成简洁的电商主图。"),
                attachments: [expect.objectContaining({ id: "persisted-agent-image", name: "商品参考.png.png", type: "image/png", dataUrl: imageDataUrl })],
            }),
        ]);
    await expect
        .poll(() =>
            page.evaluate(
                async ({ projectId }) => {
                    const { useCanvasStore } = await import("/src/stores/canvas/use-canvas-store.ts");
                    return useCanvasStore
                        .getState()
                        .projects.find((project) => project.id === projectId)
                        ?.nodes.some((node) => node.type === "image" && node.id !== "persisted-agent-image" && node.metadata?.status === "success");
                },
                { projectId },
            ),
        )
        .toBe(true);
});
