import { describe, expect, it } from "vitest";

import { canWriteRequirement, createLatestRequestGate, mergeRequestedAutoRun, requirementHasActiveWork } from "./requirement-view-state";

describe("FrameFlow Requirement 视图状态", () => {
    it("只允许最新的刷新请求回写页面", () => {
        const gate = createLatestRequestGate();
        const first = gate.begin();
        const second = gate.begin();

        expect(gate.isLatest(first)).toBe(false);
        expect(gate.isLatest(second)).toBe(true);

        gate.invalidate();
        expect(gate.isLatest(second)).toBe(false);
    });

    it("归档范围直接关闭 Requirement 写入口", () => {
        expect(canWriteRequirement("active", false)).toBe(true);
        expect(canWriteRequirement("active", true)).toBe(false);
        expect(canWriteRequirement("archived", false)).toBe(false);
    });

    it("列表达到上限时仍保留 URL 指定的合法 Auto Run", () => {
        const requested = { id: "deep-link", name: "目标任务" };
        const listed = [{ id: "latest", name: "最新任务" }];

        expect(mergeRequestedAutoRun(listed, requested)).toEqual([requested, ...listed]);
        expect(mergeRequestedAutoRun([requested, ...listed], requested)).toEqual([requested, ...listed]);
    });

    it("修改与归档闸门覆盖同一 Requirement 的全部 Revision 和 Run", () => {
        const briefs = [
            { id: "brief-r1", requirementId: "requirement-1" },
            { id: "brief-r2", requirementId: "requirement-1" },
            { id: "other", requirementId: "requirement-2" },
        ];

        expect(requirementHasActiveWork("requirement-1", briefs, [{ briefId: "brief-r1", state: "reviewing" }], [])).toBe(true);
        expect(requirementHasActiveWork("requirement-1", briefs, [], [{ briefId: "brief-r1", status: "retrying" }])).toBe(true);
        expect(requirementHasActiveWork("requirement-1", briefs, [{ briefId: "other", state: "generating" }], [{ briefId: "other", status: "running" }])).toBe(false);
        expect(requirementHasActiveWork("requirement-1", briefs, [{ briefId: "brief-r2", state: "paused" }], [{ briefId: "brief-r1", status: "succeeded" }])).toBe(false);
    });
});
