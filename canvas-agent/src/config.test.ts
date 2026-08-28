import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { AGENT_PROMPT, ensureSiteWorkspace } from "./config.js";

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
