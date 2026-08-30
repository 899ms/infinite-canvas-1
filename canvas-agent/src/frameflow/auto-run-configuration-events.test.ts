import assert from "node:assert/strict";
import test from "node:test";

import { AutoRunConfigurationError, autoRunConfigurationEvents } from "./auto-run-configuration-events.js";
import type { AutoRun } from "./types.js";

const autoRun = (overrides: Partial<AutoRun> = {}): AutoRun => ({ id: "auto-run-1", name: "探索", briefId: "brief-1", count: 2, maxIterations: 3, state: "paused", iteration: 1, createdAt: "2026-08-29T00:00:00.000Z", updatedAt: "2026-08-29T00:00:00.000Z", ...overrides });

test("创建与更新 Auto Run 生成稳定的暂停或更新事件", () => {
    const created = autoRunConfigurationEvents({ command: { type: "auto_run.create", input: { name: "新探索", briefId: "brief-1", count: 3, maxIterations: 4 }, idempotencyKey: "create" }, eventId: "event-create", occurredAt: "2026-08-29T01:00:00.000Z", createId: () => "auto-run-new" });
    const updated = autoRunConfigurationEvents({ command: { type: "auto_run.update", autoRunId: "auto-run-1", input: { name: "改名", maxIterations: 5 }, idempotencyKey: "update" }, autoRun: autoRun(), eventId: "event-update", occurredAt: "2026-08-29T01:00:00.000Z", createId: () => "unused" });

    assert.deepEqual(created, [{ type: "auto_run.created", eventId: "event-create", autoRun: { id: "auto-run-new", name: "新探索", briefId: "brief-1", count: 3, maxIterations: 4, state: "paused", iteration: 0, createdAt: "2026-08-29T01:00:00.000Z", updatedAt: "2026-08-29T01:00:00.000Z" } }]);
    assert.deepEqual(updated, [{ type: "auto_run.updated", eventId: "event-update", autoRun: { ...autoRun(), name: "改名", maxIterations: 5, updatedAt: "2026-08-29T01:00:00.000Z" } }]);
});

test("生成或机器审图期间拒绝更新 Auto Run 配置", () => {
    assert.throws(() => autoRunConfigurationEvents({ command: { type: "auto_run.update", autoRunId: "auto-run-1", input: { count: 4 }, idempotencyKey: "update" }, autoRun: autoRun({ state: "generating" }), eventId: "event", occurredAt: "2026-08-29T01:00:00.000Z", createId: () => "unused" }), (error: unknown) => error instanceof AutoRunConfigurationError && error.message === "请先停止自动跑，再修改名称、每轮数量或最大轮数");
});
