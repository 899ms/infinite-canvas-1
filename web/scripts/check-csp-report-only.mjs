import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
for (const configPath of ["vercel.json", "web/vercel.json"]) {
    const config = JSON.parse(await readFile(resolve(root, configPath), "utf8"));
    const headers = new Map(config.headers?.flatMap((rule) => rule.headers || []).map((header) => [header.key, header.value]));
    const policy = headers.get("Content-Security-Policy-Report-Only");
    if (!policy) throw new Error(`${configPath} 缺少 Content-Security-Policy-Report-Only 响应头`);
    for (const directive of ["default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:", "connect-src 'self' http: https:"]) {
        if (!policy.includes(directive)) throw new Error(`${configPath} 的 CSP 报告策略缺少必需指令：${directive}`);
    }
    for (const [key, value] of [
        ["X-Content-Type-Options", "nosniff"],
        ["X-Frame-Options", "DENY"],
        ["Referrer-Policy", "strict-origin-when-cross-origin"],
        ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
    ]) {
        if (headers.get(key) !== value) throw new Error(`${configPath} 缺少或弱化了安全响应头：${key}`);
    }
}

console.log("Vercel CSP 报告策略与静态安全响应头检查通过");
