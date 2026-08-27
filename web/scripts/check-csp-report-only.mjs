import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const config = JSON.parse(await readFile(resolve(root, "vercel.json"), "utf8"));
const policy = config.headers
    ?.flatMap((rule) => rule.headers || [])
    .find((header) => header.key === "Content-Security-Policy-Report-Only")
    ?.value;

if (!policy) throw new Error("vercel.json 缺少 Content-Security-Policy-Report-Only 响应头");

for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "connect-src 'self' http: https:",
]) {
    if (!policy.includes(directive)) throw new Error(`CSP 报告策略缺少必需指令：${directive}`);
}

console.log("CSP 报告策略检查通过");
