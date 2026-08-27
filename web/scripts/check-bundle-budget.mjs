import { readdir, stat } from "node:fs/promises";

const assets = new URL("../dist/assets/", import.meta.url);
const files = await readdir(assets);
const configChunk = files.find((file) => /^app-config-modal-.*\.js$/.test(file));
if (!configChunk) throw new Error("未找到配置页生产分包，请先运行 npm run build");

const { size } = await stat(new URL(configChunk, assets));
const limit = 400 * 1024;
if (size > limit) throw new Error(`配置页首包 ${(size / 1024).toFixed(1)} KiB，超过 ${limit / 1024} KiB 预算`);
console.log(`配置页首包 ${(size / 1024).toFixed(1)} KiB，预算 ${limit / 1024} KiB`);
