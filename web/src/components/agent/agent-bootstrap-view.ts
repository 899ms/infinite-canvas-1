import type { AgentBootstrapStatus, AgentConversationState } from "@/stores/use-agent-store";

type AgentRuntimeTranslate = (key: string, options?: Record<string, unknown>) => string;

export function buildAgentBootstrapView(conversation: AgentConversationState, translate: AgentRuntimeTranslate) {
    const mcpStartupStatuses: Record<string, AgentBootstrapStatus> = Object.fromEntries(
        Object.entries(conversation.mcpStatuses).map(([name, item]) => {
            const view: AgentBootstrapStatus =
                item.status === "starting"
                    ? { key: `mcp:${name}:starting`, text: translate("mcpStarting", { name }), detail: translate("mcpConnecting"), status: "running" }
                    : item.status === "ready"
                      ? { key: `mcp:${name}:ready`, text: translate("mcpReadyNamed", { name }), detail: translate("toolsReady"), status: "ready" }
                      : { key: `mcp:${name}:${item.status}`, text: translate(item.status === "failed" ? "mcpFailedNamed" : "mcpCanceledNamed", { name }), detail: item.error || translate("toolInitFailed"), status: "error" };
            return [name, view];
        }),
    );
    const services = Object.values(mcpStartupStatuses);
    const pending = services.filter((item) => item.status === "running").length;
    const bootstrapStatus: AgentBootstrapStatus | null =
        conversation.status === "idle" || conversation.status === "preparing"
            ? services.length
                ? { key: "mcp:starting", text: translate("mcpServicesStarting"), detail: pending ? translate("toolServicesPending", { count: pending }) : translate("checkingToolServices"), status: "running" }
                : { key: "codex:preparing", text: translate("conversationInitializing"), detail: translate("conversationCreating"), status: "running" }
            : conversation.status === "warning"
              ? { key: "mcp:warning", text: translate("someMcpFailed"), detail: translate("remainingToolsReady"), status: "error" }
              : conversation.status === "failed"
                ? { key: "codex:prepare_failed", text: translate("conversationInitFailed"), detail: conversation.error || translate("conversationCreateFailed"), status: "error" }
                : conversation.status === "ready"
                  ? { key: "mcp:ready", text: translate("mcpServicesReady", { count: services.length }), detail: translate("toolsReady"), status: "ready" }
                  : null;
    return { bootstrapStatus, mcpStartupStatuses };
}
