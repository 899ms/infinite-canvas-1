import { expect, test, type Page } from "@playwright/test";

const conversation = { revision: 1, conversationId: "conversation-permissions", threadId: "thread-permissions", status: "ready" as const, mcpStatuses: {} };

type ApprovalRequest = { requestId: string; decision: string };

async function primeAgent(page: Page) {
    await page.evaluate(
        async ({ conversation }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({
                url: "http://127.0.0.1:4173",
                token: "agent-permission-token",
                connected: true,
                enabled: true,
                panelOpen: false,
                panelMounted: false,
                panelClosing: false,
                activeTab: "chat",
                activeThreadId: "thread-permissions",
                conversation,
                messages: [],
                threads: [],
                eventLogs: [],
                pendingApprovals: [],
                loadingThreads: false,
                sending: false,
                waiting: false,
            });
        },
        { conversation },
    );
}

test("Agent 权限模式会持久化，完全访问需确认，并逐一处理并发审批", async ({ page }) => {
    const approvalRequests: ApprovalRequest[] = [];
    await page.addInitScript(
        ({ conversation }) => {
            class MockEventSource {
                static instances: MockEventSource[] = [];
                private listeners = new Map<string, Array<(event: MessageEvent) => void>>();

                constructor() {
                    MockEventSource.instances.push(this);
                    window.setTimeout(() => this.emit("hello", { protocolVersion: 6, conversation }), 0);
                }

                addEventListener(type: string, listener: (event: MessageEvent) => void) {
                    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
                }

                close() {}

                emit(type: string, payload: unknown) {
                    for (const listener of this.listeners.get(type) || []) listener({ data: JSON.stringify(payload) } as MessageEvent);
                }
            }

            Object.defineProperty(window, "EventSource", { configurable: true, value: MockEventSource });
            Object.assign(window, {
                __emitCodexApproval: (payload: unknown) => MockEventSource.instances.at(-1)?.emit("codex_approval", payload),
                __resolveCodexApproval: (payload: unknown) => MockEventSource.instances.at(-1)?.emit("codex_approval_resolved", payload),
            });
        },
        { conversation },
    );
    await page.route("http://127.0.0.1:4173/agent/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/agent/codex/threads") {
            await route.fulfill({ json: { ok: true, workspace: { workspacePath: "F:/isolated/workspace", activeThreadId: "thread-permissions" }, conversation, data: [] } });
            return;
        }
        if (path === "/agent/codex/approval") {
            approvalRequests.push(route.request().postDataJSON() as ApprovalRequest);
            await route.fulfill({ json: { ok: true } });
            return;
        }
        await route.fulfill({ json: { ok: true, data: [], errors: [] } });
    });
    await page.goto("/");
    await primeAgent(page);
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await page.waitForFunction(() => typeof (window as Window & { __emitCodexApproval?: unknown }).__emitCodexApproval === "function");
    await page.evaluate(
        async ({ conversation }) => {
            const { useAgentStore } = await import("/src/stores/use-agent-store.ts");
            useAgentStore.setState({ conversation, loadingThreads: false });
        },
        { conversation },
    );

    const permissionControl = () => page.getByRole("button", { name: /选择 Codex 权限模式/ });
    await expect(permissionControl()).toHaveAccessibleName("选择 Codex 权限模式，当前为 请求批准");
    await permissionControl().click();
    await page.getByText("自动审查", { exact: true }).click();
    await expect(permissionControl()).toHaveAccessibleName("选择 Codex 权限模式，当前为 自动审查");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("canvas-agent-permission-mode"))).toBe("automatic");

    await page.reload();
    await primeAgent(page);
    await page.getByRole("button", { name: "打开 Agent" }).click();
    await expect(permissionControl()).toHaveAccessibleName("选择 Codex 权限模式，当前为 自动审查");

    await permissionControl().click();
    await page.getByText("完全访问权限", { exact: true }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("启用完全访问权限");
    await expect(confirm).toContainText("Codex 将不受沙箱限制，可访问互联网及本机任意文件。请仅在信任当前任务时使用。");
    await confirm.getByRole("button", { name: "启用完全访问" }).click();
    await expect(permissionControl()).toHaveAccessibleName("选择 Codex 权限模式，当前为 完全访问权限");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("canvas-agent-permission-mode"))).toBe("full");

    await permissionControl().click();
    await page.getByText("请求批准", { exact: true }).click();
    await expect(permissionControl()).toHaveAccessibleName("选择 Codex 权限模式，当前为 请求批准");
    await page.evaluate(() => {
        const events = window as Window & { __emitCodexApproval: (payload: unknown) => void };
        events.__emitCodexApproval({ requestId: "approval-file", method: "item/fileChange/requestApproval", threadId: "thread-permissions", turnId: "turn-permissions", reason: "需要修改工作区外配置", grantRoot: "F:/outside-workspace" });
        events.__emitCodexApproval({
            requestId: "approval-network",
            method: "item/permissions/requestApproval",
            threadId: "thread-permissions",
            turnId: "turn-permissions",
            reason: "需要访问模型服务",
            networkApprovalContext: { protocol: "https", host: "example.test", port: 443 },
        });
    });

    const fileApproval = page.getByText("需要修改工作区外配置", { exact: true }).locator("..").locator("..").locator("..");
    const networkApproval = page.getByText("需要访问模型服务", { exact: true }).locator("..").locator("..").locator("..");
    await expect(page.getByText("请求编辑文件", { exact: true })).toBeVisible();
    await expect(page.getByText("请求网络访问", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "拒绝" })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "允许一次" })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "本会话允许" })).toHaveCount(2);
    await expect(fileApproval.getByRole("button", { name: "本会话允许" })).toBeVisible();
    await networkApproval.getByRole("button", { name: "拒绝" }).click();
    await expect.poll(() => approvalRequests).toEqual([{ requestId: "approval-network", decision: "decline" }]);

    await page.evaluate(() => (window as Window & { __resolveCodexApproval: (payload: unknown) => void }).__resolveCodexApproval({ requestId: "approval-network", decision: "decline" }));
    await expect(page.getByText("需要访问模型服务", { exact: true })).toHaveCount(0);
    await expect(page.getByText("需要修改工作区外配置", { exact: true })).toBeVisible();
    await fileApproval.getByRole("button", { name: "本会话允许" }).click();
    await expect
        .poll(() => approvalRequests)
        .toEqual([
            { requestId: "approval-network", decision: "decline" },
            { requestId: "approval-file", decision: "acceptForSession" },
        ]);
    await page.evaluate(() => (window as Window & { __resolveCodexApproval: (payload: unknown) => void }).__resolveCodexApproval({ requestId: "approval-file", decision: "acceptForSession" }));
    await expect(page.getByText("需要修改工作区外配置", { exact: true })).toHaveCount(0);
});
