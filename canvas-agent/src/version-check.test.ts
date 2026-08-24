import assert from "node:assert/strict";
import test from "node:test";

import { resolveCodexVersionCommand } from "./version-check.js";

test("runs the npm command shim through cmd.exe when checking Codex on Windows", () => {
    assert.deepEqual(resolveCodexVersionCommand("win32", "C:\\Windows\\System32\\cmd.exe"), {
        command: "C:\\Windows\\System32\\cmd.exe",
        args: ["/d", "/s", "/c", "codex.cmd --version"],
    });
});

test("uses the executable name on Unix platforms", () => {
    assert.deepEqual(resolveCodexVersionCommand("linux"), { command: "codex", args: ["--version"] });
    assert.deepEqual(resolveCodexVersionCommand("darwin"), { command: "codex", args: ["--version"] });
});
