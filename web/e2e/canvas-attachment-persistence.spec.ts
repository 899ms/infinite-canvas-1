import { expect, test } from "@playwright/test";

const imageDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAIAAAAW4yFwAAAADElEQVR42mNk+M8AAAICAQB7CY+7AAAAAElFTkSuQmCC";

test("附件图片节点写入真实画布项目后，可通过图片存储键读取", async ({ page }) => {
    await page.goto("/");
    const expected = await page.evaluate(async (dataUrl) => {
        const [{ useCanvasStore }, { uploadImage }, { imageMetadata }] = await Promise.all([import("/src/stores/canvas/use-canvas-store.ts"), import("/src/services/image-storage.ts"), import("/src/lib/canvas/canvas-node-factory.ts")]);
        await new Promise<void>((resolve) => {
            if (useCanvasStore.getState().hydrated) return void resolve();
            const unsubscribe = useCanvasStore.subscribe((state) => {
                if (!state.hydrated) return;
                unsubscribe();
                resolve();
            });
        });
        const image = await uploadImage(await (await fetch(dataUrl)).blob());
        const projectId = useCanvasStore.getState().createProject("附件持久化回归");
        useCanvasStore.getState().updateProject(projectId, {
            nodes: [
                {
                    id: "attachment-persisted",
                    nodeType: "image",
                    title: "商品参考.png",
                    position: { x: 120, y: 80 },
                    width: image.width,
                    height: image.height,
                    metadata: imageMetadata(image),
                },
            ],
        });
        return { projectId, storageKey: image.storageKey, width: image.width, height: image.height };
    }, imageDataUrl);

    await page.waitForFunction(async ({ projectId, storageKey }) => {
        const { localForageStorage } = await import("/src/lib/localforage-storage.ts");
        const persisted = await localForageStorage.getItem("infinite-canvas:canvas_store");
        const node = persisted
            ? JSON.parse(persisted)
                  .state.projects.find((project: { id: string }) => project.id === projectId)
                  ?.nodes.find((item: { id: string }) => item.id === "attachment-persisted")
            : null;
        return node?.metadata?.storageKey === storageKey;
    }, expected);

    await expect
        .poll(() =>
            page.evaluate(async ({ projectId, storageKey }) => {
                const [{ useCanvasStore }, { imageToDataUrl }] = await Promise.all([import("/src/stores/canvas/use-canvas-store.ts"), import("/src/services/image-storage.ts")]);
                const node = useCanvasStore
                    .getState()
                    .projects.find((project) => project.id === projectId)
                    ?.nodes.find((item) => item.id === "attachment-persisted");
                if (!node?.metadata?.storageKey || node.metadata.storageKey !== storageKey) return null;
                const dataUrl = await imageToDataUrl({ id: node.id, dataUrl: node.metadata.content, storageKey: node.metadata.storageKey });
                return { title: node.title, storageKey: node.metadata.storageKey, width: node.width, height: node.height, dataUrl };
            }, expected),
        )
        .toEqual({ title: "商品参考.png", storageKey: expected.storageKey, width: expected.width, height: expected.height, dataUrl: imageDataUrl });
});
