import { describe, expect, it } from "vitest";

import { generatedImageSources } from "./agent-generated-image-sources";

describe("Agent 生成图片来源", () => {
    it("提取嵌套 data URL 与 Windows/POSIX 绝对图片路径并保留首次顺序", () => {
        expect([...generatedImageSources({ output: ["data:image/png;base64,first", { paths: ["C:\\temp\\second.webp", "/tmp/third.jpg", "C:\\temp\\second.webp"] }] })]).toEqual(["data:image/png;base64,first", "C:\\temp\\second.webp", "/tmp/third.jpg"]);
    });

    it("拒绝多行、相对路径、非图片路径与非图片 data URL", () => {
        expect([...generatedImageSources(["relative.png", "C:\\temp\\note.txt", "C:\\temp\\broken.png\nextra", "data:text/plain;base64,dGV4dA=="])]).toEqual([]);
    });
});
