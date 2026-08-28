import { describe, expect, it } from "vitest";

import { shouldAllowNativeCopy } from "./canvas-copy-shortcut";

describe("画布复制快捷键", () => {
    it("有文本选区时保留浏览器原生复制，无选区时交给节点复制", () => {
        expect(shouldAllowNativeCopy(true)).toBe(true);
        expect(shouldAllowNativeCopy(false)).toBe(false);
    });
});
