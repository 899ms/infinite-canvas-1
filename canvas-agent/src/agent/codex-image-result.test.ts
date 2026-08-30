import assert from "node:assert/strict";
import test from "node:test";

import { generatedImagePaths } from "./codex-image-result.js";

test("从嵌套 ImageGen 结果中提取并去重 Windows 与 POSIX 图片绝对路径", () => {
    assert.deepEqual(generatedImagePaths({ output: [" C:\\tmp\\first.png ", { files: ["/tmp/second.webp", "C:\\tmp\\first.png"] }] }), ["C:\\tmp\\first.png", "/tmp/second.webp"]);
});

test("忽略相对路径、非图片文件与普通文本", () => {
    assert.deepEqual(generatedImagePaths(["image.png", "C:\\tmp\\note.txt", "解释文本", { file: "relative/photo.jpg" }]), []);
});
