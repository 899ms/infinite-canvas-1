import { expect, test, type Locator } from "@playwright/test";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function dispatchFiles(dropZone: Locator, type: "dragenter" | "drop", files: Array<{ name: string; type: string; content: string }>) {
    await dropZone.evaluate(
        (element, payload) => {
            const transfer = new DataTransfer();
            for (const file of payload.files) {
                const content = file.type.startsWith("image/") ? Uint8Array.from(atob(file.content), (character) => character.charCodeAt(0)) : file.content;
                transfer.items.add(new File([content], file.name, { type: file.type }));
            }
            element.dispatchEvent(new DragEvent(payload.type, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        },
        { type, files },
    );
}

test("生图工作台拖放参考图只上传图片并显示高亮", async ({ page }) => {
    await page.goto("/image");
    await expect(page.getByText("暂无参考图，可将图片拖到这里")).toBeVisible();
    const dropZone = page.locator("div.hover-scrollbar.border-dashed");

    await dispatchFiles(dropZone, "dragenter", [{ name: "高亮.png", type: "image/png", content: png }]);
    await expect(dropZone).toHaveClass(/border-stone-900/);
    await expect(page.getByText("松开即可添加参考图")).toBeVisible();

    await dispatchFiles(dropZone, "drop", [
        { name: "参考一.png", type: "image/png", content: png },
        { name: "参考二.png", type: "image/png", content: png },
        { name: "忽略.txt", type: "text/plain", content: "plain text" },
    ]);

    await expect(page.getByAltText("参考一.png")).toBeVisible();
    await expect(page.getByAltText("参考二.png")).toBeVisible();
    await expect(page.getByAltText("忽略.txt")).toHaveCount(0);
    await expect(dropZone).not.toHaveClass(/border-stone-900/);
});
