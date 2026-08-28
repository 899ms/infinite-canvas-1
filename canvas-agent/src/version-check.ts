import { execFile, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import { VERSION } from "./config.js";
import { logger } from "./utils/logger.js";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const CODEX_VERSION = String(
  (require("@openai/codex/package.json") as { version: string }).version,
);

type VersionLog = {
  level: "info" | "warn";
  message: string;
  meta?: Record<string, string>;
};

/** 输出当前版本，并在后台检查 npm 最新版本。 */
export function checkVersions() {
  const localCodexVersion = commandVersion(resolveCodexVersionCommand());
  startupVersionMessages(VERSION, CODEX_VERSION, localCodexVersion).forEach(
    (entry) => {
      if (entry.level === "info") logger.info(entry.message, entry.meta);
      else logger.warn(entry.message);
    },
  );
  void checkLatestVersions(localCodexVersion);
}

/** 返回启动时必须输出的版本信息和本机 Codex 兼容性提醒。 */
export function startupVersionMessages(
  agentVersion: string,
  bundledCodexVersion: string,
  localCodexVersion: string,
): VersionLog[] {
  const result: VersionLog[] = [
    {
      level: "info",
      message: "Canvas Agent version",
      meta: { version: agentVersion },
    },
    {
      level: "info",
      message: "Bundled Codex version",
      meta: { version: bundledCodexVersion },
    },
    {
      level: "info",
      message: "Local Codex version",
      meta: { version: localCodexVersion || "not found" },
    },
  ];
  if (!localCodexVersion) {
    result.push({
      level: "warn",
      message:
        "Local Codex was not found. Install the latest version with: npm install -g @openai/codex@latest",
    });
  } else if (localCodexVersion !== bundledCodexVersion) {
    result.push({
      level: "warn",
      message: `Bundled Codex ${bundledCodexVersion} does not match local Codex ${localCodexVersion}. Keep both current with: npm install -g @openai/codex@latest && npx -y @basketikun/canvas-agent@latest`,
    });
  }
  return result;
}

/** Windows 的 Node 子进程需经 cmd.exe 执行 npm 生成的 codex.cmd。 */
export function resolveCodexVersionCommand(
  platform: NodeJS.Platform = process.platform,
  comspec = process.env.ComSpec || "cmd.exe",
) {
  return platform === "win32"
    ? { command: comspec, args: ["/d", "/s", "/c", "codex.cmd --version"] }
    : { command: "codex", args: ["--version"] };
}

/** 查询 npm，提醒升级不再维护的旧版本。 */
export async function checkLatestVersions(
  localCodexVersion: string,
  dependencies: Partial<{
    agentVersion: string;
    bundledCodexVersion: string;
    npmVersion: (name: string) => Promise<string>;
    warn: (message: string) => void;
  }> = {},
) {
  const agentVersion = dependencies.agentVersion || VERSION;
  const bundledCodexVersion = dependencies.bundledCodexVersion || CODEX_VERSION;
  const readNpmVersion = dependencies.npmVersion || npmVersion;
  const warn = dependencies.warn || ((message: string) => logger.warn(message));
  try {
    const [latestAgent, latestCodex] = await Promise.all([
      readNpmVersion("@basketikun/canvas-agent"),
      readNpmVersion("@openai/codex"),
    ]);
    if (isOlder(agentVersion, latestAgent))
      warn(
        `Update available: Canvas Agent ${agentVersion} -> ${latestAgent}. Run: npx -y @basketikun/canvas-agent@latest`,
      );
    if (isOlder(bundledCodexVersion, latestCodex))
      warn(
        `Update available: bundled Codex ${bundledCodexVersion} -> ${latestCodex}. Upgrade Canvas Agent with: npx -y @basketikun/canvas-agent@latest`,
      );
    if (localCodexVersion && isOlder(localCodexVersion, latestCodex))
      warn(
        `Update available: local Codex ${localCodexVersion} -> ${latestCodex}. Run: npm install -g @openai/codex@latest`,
      );
  } catch {
    warn("Unable to check the latest npm versions; startup will continue.");
  }
}

/** 读取本机命令输出中的语义版本号。 */
function commandVersion(input: { command: string; args: string[] }) {
  try {
    return (
      execFileSync(input.command, input.args, {
        encoding: "utf8",
        timeout: 5_000,
      }).match(/\d+\.\d+\.\d+/)?.[0] || ""
    );
  } catch {
    return "";
  }
}

/** 读取 npm 包的最新版本。 */
async function npmVersion(name: string) {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const { stdout } = await execFileAsync(command, ["view", name, "version"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  return stdout.trim();
}

/** 比较仅包含数字段的稳定版语义版本。 */
function isOlder(current: string, latest: string) {
  const left = current.split(".").map(Number);
  const right = latest.split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    if ((left[index] || 0) !== (right[index] || 0))
      return (left[index] || 0) < (right[index] || 0);
  }
  return false;
}
