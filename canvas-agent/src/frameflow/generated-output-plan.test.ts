import assert from "node:assert/strict";
import test from "node:test";

import { generatedOutputPlan } from "./generated-output-plan.js";

test("已取消的生成把所有迟到文件隔离，且不再交给资产导入", () => {
    const plan = generatedOutputPlan({ generatedFiles: ["one.png", "two.png"], slotCount: 1, cancelled: true });

    assert.deepEqual(plan, {
        importFiles: [],
        quarantinedFiles: ["one.png", "two.png"],
        quarantineReason: "generation_cancelled",
    });
});

test("未取消的生成只导入固定槽位数量，并隔离超量结果", () => {
    const plan = generatedOutputPlan({ generatedFiles: ["one.png", "two.png", "extra.png"], slotCount: 2, cancelled: false });

    assert.deepEqual(plan, {
        importFiles: ["one.png", "two.png"],
        quarantinedFiles: ["extra.png"],
        quarantineReason: "orphan_recovery",
    });
});

test("刚好命中槽位数量时不产生隔离文件", () => {
    const plan = generatedOutputPlan({ generatedFiles: ["one.png"], slotCount: 1, cancelled: false });

    assert.deepEqual(plan, {
        importFiles: ["one.png"],
        quarantinedFiles: [],
    });
});
