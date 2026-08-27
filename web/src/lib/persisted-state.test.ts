import { describe, expect, it, vi } from "vitest";

import { persistBeforeCommit } from "./persisted-state";

describe("浏览器业务状态持久化", () => {
    it("只有持久化成功后才更新页面内存状态", async () => {
        const commit = vi.fn();

        await expect(persistBeforeCommit("next", async () => { throw new Error("IndexedDB unavailable"); }, commit)).rejects.toThrow("IndexedDB unavailable");
        expect(commit).not.toHaveBeenCalled();

        await persistBeforeCommit("next", async () => undefined, commit);
        expect(commit).toHaveBeenCalledOnce();
        expect(commit).toHaveBeenCalledWith("next");
    });
});
