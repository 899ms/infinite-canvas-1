import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { AGENT_PROMPT, ensureSiteWorkspace, resolveConfigDir } from "./config.js";

test("显式配置目录覆盖可隔离临时 Agent，默认仍使用用户目录", () => {
    const configured = path.join(os.tmpdir(), "canvas-agent-isolated-config");
    assert.equal(resolveConfigDir(configured), configured);
    assert.equal(resolveConfigDir("   "), path.join(os.homedir(), ".infinite-canvas"));
});

test("站点工作目录初始化时从独立指令源生成 AGENTS.md", () => {
    const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), "infinite-canvas-agent-"));
    try {
        const workspace = ensureSiteWorkspace({
            url: "http://127.0.0.1:17371",
            token: "test-token",
            workspace: { workspacePath },
        });

        assert.equal(workspace.workspacePath, workspacePath);
        assert.equal(fs.readFileSync(path.join(workspacePath, "AGENTS.md"), "utf8"), AGENT_PROMPT);
    } finally {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    }
});

test("旧版自动生成的 AGENTS.md 会更新，用户自写指令保持原样", () => {
    const generatedWorkspacePath = fs.mkdtempSync(path.join(os.tmpdir(), "infinite-canvas-agent-generated-"));
    const userWorkspacePath = fs.mkdtempSync(path.join(os.tmpdir(), "infinite-canvas-agent-user-"));
    const config = (workspacePath: string) => ({
        url: "http://127.0.0.1:17371",
        token: "test-token",
        workspace: { workspacePath },
    });
    try {
        fs.writeFileSync(path.join(generatedWorkspacePath, "AGENTS.md"), "# Infinite Canvas Agent\n旧版自动生成说明\n");
        fs.writeFileSync(path.join(userWorkspacePath, "AGENTS.md"), "# 用户自己的工作约定\n不要由 Canvas Agent 覆盖。\n");

        ensureSiteWorkspace(config(generatedWorkspacePath));
        ensureSiteWorkspace(config(userWorkspacePath));

        assert.equal(fs.readFileSync(path.join(generatedWorkspacePath, "AGENTS.md"), "utf8"), AGENT_PROMPT);
        assert.equal(fs.readFileSync(path.join(userWorkspacePath, "AGENTS.md"), "utf8"), "# 用户自己的工作约定\n不要由 Canvas Agent 覆盖。\n");
    } finally {
        fs.rmSync(generatedWorkspacePath, { recursive: true, force: true });
        fs.rmSync(userWorkspacePath, { recursive: true, force: true });
    }
});
