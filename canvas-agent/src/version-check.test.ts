import assert from "node:assert/strict";
import test from "node:test";

import {
  checkLatestVersions,
  resolveCodexVersionCommand,
  startupVersionMessages,
} from "./version-check.js";

test("runs the npm command shim through cmd.exe when checking Codex on Windows", () => {
  assert.deepEqual(
    resolveCodexVersionCommand("win32", "C:\\Windows\\System32\\cmd.exe"),
    {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "codex.cmd --version"],
    },
  );
});

test("uses the executable name on Unix platforms", () => {
  assert.deepEqual(resolveCodexVersionCommand("linux"), {
    command: "codex",
    args: ["--version"],
  });
  assert.deepEqual(resolveCodexVersionCommand("darwin"), {
    command: "codex",
    args: ["--version"],
  });
});

test("启动时报告 Agent、内置 Codex 和本机 Codex 版本，并为缺失或不匹配给出升级提醒", () => {
  assert.deepEqual(startupVersionMessages("0.6.0", "0.146.0", ""), [
    {
      level: "info",
      message: "Canvas Agent version",
      meta: { version: "0.6.0" },
    },
    {
      level: "info",
      message: "Bundled Codex version",
      meta: { version: "0.146.0" },
    },
    {
      level: "info",
      message: "Local Codex version",
      meta: { version: "not found" },
    },
    {
      level: "warn",
      message:
        "Local Codex was not found. Install the latest version with: npm install -g @openai/codex@latest",
    },
  ]);
  assert.match(
    startupVersionMessages("0.6.0", "0.146.0", "0.145.0").at(-1)?.message || "",
    /does not match local Codex 0\.145\.0/,
  );
});

test("npm 有新版本时分别提醒 Agent、内置与本机 Codex，检查失败不抛出", async () => {
  const warnings: string[] = [];
  await checkLatestVersions("0.145.0", {
    agentVersion: "0.6.0",
    bundledCodexVersion: "0.146.0",
    npmVersion: async (name) =>
      name === "@basketikun/canvas-agent" ? "0.7.0" : "0.147.0",
    warn: (message) => warnings.push(message),
  });
  assert.equal(warnings.length, 3);
  assert.match(warnings[0]!, /Canvas Agent 0\.6\.0 -> 0\.7\.0/);
  assert.match(warnings[1]!, /bundled Codex 0\.146\.0 -> 0\.147\.0/);
  assert.match(warnings[2]!, /local Codex 0\.145\.0 -> 0\.147\.0/);

  await checkLatestVersions("", {
    npmVersion: async () => {
      throw new Error("offline");
    },
    warn: (message) => warnings.push(message),
  });
  assert.equal(
    warnings.at(-1),
    "Unable to check the latest npm versions; startup will continue.",
  );
});
