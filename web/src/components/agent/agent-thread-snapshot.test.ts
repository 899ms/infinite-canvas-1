import { describe, expect, it } from "vitest";

import { applyAgentThreadSnapshot } from "./agent-thread-snapshot";
import type { AgentChatItem } from "@/stores/use-agent-store";

const message = (id: string, turnId: string, text: string): AgentChatItem => ({ id, itemId: id, threadId: "thread", turnId, role: "assistant", text });

describe("applyAgentThreadSnapshot", () => {
    it("历史快照覆盖已结算 Turn，同时保留当前活跃 Turn 的实时消息", () => {
        const result = applyAgentThreadSnapshot({
            threadId: "thread",
            snapshot: { messages: [message("settled-message", "settled", "权威历史")], settledTurnIds: ["settled"], historyReady: true },
            currentMessages: [message("settled-message", "settled", "过期实时"), message("live-message", "active", "实时输出")],
            activeTurnId: "active",
            liveTurnKeys: new Set(["thread\0settled", "thread\0active"]),
        });

        expect(result.coveredTurnIds).toEqual(["settled"]);
        expect(result.liveTurnKeys).toEqual(new Set(["thread\0active"]));
        expect(result.messages.map((item) => item.text)).toEqual(["权威历史", "实时输出"]);
        expect(result.accepted).toBe(true);
    });

    it("显式等待的 Turn 即使历史尚未 ready 也可确认，普通快照则继续等待", () => {
        const snapshot = { messages: [message("message", "turn", "已完成")], settledTurnIds: ["turn"], historyReady: false };

        expect(applyAgentThreadSnapshot({ threadId: "thread", snapshot, currentMessages: [], activeTurnId: "", liveTurnKeys: new Set(), expectedTurnId: "turn" }).accepted).toBe(true);
        expect(applyAgentThreadSnapshot({ threadId: "thread", snapshot, currentMessages: [], activeTurnId: "", liveTurnKeys: new Set() }).accepted).toBe(false);
    });
});
