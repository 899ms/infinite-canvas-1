import { describe, expect, it } from "vitest";

import { formatAgentActivity, formatAgentEventLog } from "./agent-event-formatters";

describe("dynamic_tool_call 事件", () => {
    it("使用具体工具名称显示实时卡片、失败原因和日志", () => {
        const started = { type: "item.started", item: { id: "tool-1", type: "dynamic_tool_call", tool: "image_gen" } } as const;
        const failed = { type: "item.completed", item: { id: "tool-1", type: "dynamic_tool_call", tool: "image_gen", status: "failed", error: { message: "图片服务不可用" } } } as const;

        expect(formatAgentActivity(started)).toMatchObject({ title: "调用工具：image_gen", text: "执行调用工具：image_gen中…", detail: { kind: "tool", status: "inProgress" } });
        expect(formatAgentActivity(failed)).toMatchObject({ title: "调用工具：image_gen", text: "图片服务不可用", detail: { kind: "tool", status: "failed", output: "图片服务不可用" } });
        expect(formatAgentEventLog(started)).toEqual({ title: "调用工具", text: "调用工具：image_gen" });
        expect(formatAgentEventLog(failed)).toEqual({ title: "工具失败", text: "调用工具：image_gen · 图片服务不可用" });
    });

    it("日志只保留任务生命周期摘要，并在完成时合并本轮用量", () => {
        expect(formatAgentEventLog({ type: "thread.started", thread_id: "thread-should-not-appear" })).toBeNull();
        expect(formatAgentEventLog({ type: "turn.started", turn_id: "turn-should-not-appear" })).toEqual({ title: "开始处理", text: "" });
        expect(formatAgentEventLog({ type: "item.updated", item: { id: "message-1", type: "agent_message", delta: "流式增量" } })).toBeNull();
        expect(
            formatAgentEventLog({
                type: "turn.completed",
                duration_ms: 1250,
                usage: { input_tokens: 1200, cached_input_tokens: 300, output_tokens: 45 },
            }),
        ).toEqual({ title: "处理完成", text: "1.3 秒 · 输入 1,200 · 缓存 300 · 输出 45" });
    });
});
