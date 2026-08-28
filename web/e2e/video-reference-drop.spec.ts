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

test("视频创作台按类型投放参考资产并保留限制", async ({ page }) => {
    await page.goto("/video");
    const dropZones = page.locator("div.hover-scrollbar.border-dashed");
    const imageZone = dropZones.nth(0);
    const videoZone = dropZones.nth(1);
    const audioZone = dropZones.nth(2);

    await dispatchFiles(videoZone, "dragenter", [{ name: "高亮.mp4", type: "video/mp4", content: "video" }]);
    await expect(videoZone).toHaveClass(/border-stone-900/);
    await expect(page.getByText("松开即可上传参考资产")).toBeVisible();

    await dispatchFiles(videoZone, "drop", [
        { name: "参考图.png", type: "image/png", content: png },
        { name: "参考视频-1.mp4", type: "video/mp4", content: "video-1" },
        { name: "参考视频-2.mov", type: "video/quicktime", content: "video-2" },
        { name: "参考视频-3.mp4", type: "video/mp4", content: "video-3" },
        { name: "超出上限.mp4", type: "video/mp4", content: "video-4" },
        { name: "参考音频.wav", type: "audio/wav", content: "audio" },
        { name: "忽略.txt", type: "text/plain", content: "plain text" },
    ]);

    await expect(imageZone.getByAltText("参考图.png")).toBeVisible();
    await expect(videoZone.locator("video")).toHaveCount(3);
    await expect(audioZone.getByText("参考音频.wav")).toBeVisible();
    await expect(page.getByText("忽略.txt")).toHaveCount(0);
    await expect(videoZone).not.toHaveClass(/border-stone-900/);
});
