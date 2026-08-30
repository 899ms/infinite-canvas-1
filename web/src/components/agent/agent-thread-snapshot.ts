import type { AgentChatItem } from "@/stores/use-agent-store";

import { mergeAgentMessages, normalizeHistoryMessages } from "./agent-event-formatters";

export type AgentThreadSnapshot = {
    messages?: AgentChatItem[];
    settledTurnIds?: string[];
    historyReady?: boolean;
};

export function applyAgentThreadSnapshot(input: { threadId: string; snapshot: AgentThreadSnapshot; currentMessages: AgentChatItem[]; activeTurnId: string; liveTurnKeys: ReadonlySet<string>; expectedTurnId?: string }) {
    const historyTurns = new Set((input.snapshot.settledTurnIds || []).map((turnId) => `${input.threadId}\0${turnId}`));
    const liveTurnKeys = new Set(input.liveTurnKeys);
    historyTurns.forEach((key) => liveTurnKeys.delete(key));
    if (input.activeTurnId) liveTurnKeys.add(`${input.threadId}\0${input.activeTurnId}`);
    const messages = mergeAgentMessages(normalizeHistoryMessages(input.snapshot.messages || []), input.currentMessages, input.threadId, liveTurnKeys);
    const coveredTurnIds = [...historyTurns].map((key) => key.slice(input.threadId.length + 1));
    const hasExpectedTurn = !input.expectedTurnId || historyTurns.has(`${input.threadId}\0${input.expectedTurnId}`);
    return { historyTurns, liveTurnKeys, messages, coveredTurnIds, accepted: hasExpectedTurn && (input.snapshot.historyReady !== false || Boolean(input.expectedTurnId)) };
}
