import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const prettierBin = fileURLToPath(new URL("../node_modules/prettier/bin/prettier.cjs", import.meta.url));
const baseline = new Set(JSON.parse(readFileSync(new URL("./prettier-baseline.json", import.meta.url), "utf8")).map(normalize));
const result = spawnSync(process.execPath, [prettierBin, "--list-different", "."], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" });

if (result.status !== 0 && result.status !== 1) {
    process.stderr.write(result.stderr || result.stdout || "Prettier 检查启动失败\n");
    process.exit(result.status || 2);
}

const different = new Set(result.stdout.split(/\r?\n/).map(normalize).filter(Boolean));
const newViolations = [...different].filter((file) => !baseline.has(file)).sort();
const resolved = [...baseline].filter((file) => !different.has(file)).sort();

if (newViolations.length) {
    console.error(`发现 ${newViolations.length} 个不在格式基线中的新问题：`);
    newViolations.forEach((file) => console.error(`- ${file}`));
    process.exit(1);
}

console.log(`格式检查通过：${different.size} 个历史文件仍在基线内，没有新增格式问题。`);
if (resolved.length) console.log(`${resolved.length} 个基线文件已经修复，可从 scripts/prettier-baseline.json 移除。`);

function normalize(value) {
    return String(value).trim().replaceAll("\\", "/").replace(/^\.\//, "");
}
