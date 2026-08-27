import { readFileSync } from "node:fs";

const contentRoot = new URL("../content/docs/progress/", import.meta.url);
const english = readFileSync(new URL("pending-test.mdx", contentRoot), "utf8");
const chinese = readFileSync(new URL("pending-test.zh-CN.mdx", contentRoot), "utf8");
const matrix = readFileSync(new URL("../frameflow-acceptance-matrix-2026-08-28.md", import.meta.url), "utf8");
const errors = [];

if (/[\u3400-\u9fff]/u.test(english)) errors.push("英文待测页包含中文正文");
if (!english.includes("/zh-CN/docs/progress/pending-test")) errors.push("英文待测页缺少中文权威清单链接");
if (!chinese.includes("唯一逐项清单")) errors.push("中文待测页没有声明为唯一逐项清单");

const englishItems = listItems(english);
const chineseItems = listItems(chinese);
if (!englishItems.length) errors.push("英文待测范围摘要为空");
if (!chineseItems.length) errors.push("中文逐项清单为空");
const duplicateChineseItems = duplicates(chineseItems.map(itemTitle));
if (duplicateChineseItems.length) errors.push(`中文逐项清单存在重复标题：${duplicateChineseItems.join("、")}`);

const matrixRows = matrix.split(/\r?\n/u).filter((line) => /^\| \d{2} \|/u.test(line));
if (matrixRows.length !== chineseItems.length) errors.push(`状态矩阵条目数为 ${matrixRows.length}，应与中文逐项清单 ${chineseItems.length} 项一致`);
const validStatuses = new Set(["未验证", "自动化通过", "人工通过", "已失效", "阻塞"]);
const matrixStatuses = [];
for (const [index, row] of matrixRows.entries()) {
    const cells = row.split("|").map((cell) => cell.trim());
    const id = Number(cells[1]);
    const status = cells[3];
    if (id !== index + 1) errors.push(`状态矩阵第 ${index + 1} 行编号应为 ${index + 1}，实际为 ${cells[1] || "空"}`);
    if (!validStatuses.has(status)) errors.push(`状态矩阵第 ${index + 1} 行状态无效：${status || "空"}`);
    matrixStatuses.push(status);
}

if (errors.length) {
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log(`文档语言检查通过：英文摘要 ${englishItems.length} 项，中文权威清单 ${chineseItems.length} 项，状态矩阵 ${matrixStatuses.length} 项。`);

function listItems(content) {
    return content.split(/\r?\n/u).filter((line) => line.startsWith("- "));
}

function itemTitle(item) {
    return item.slice(2).split(/[：:]/u, 1)[0].trim();
}

function duplicates(items) {
    const seen = new Set();
    const duplicateItems = new Set();
    items.forEach((item) => (seen.has(item) ? duplicateItems.add(item) : seen.add(item)));
    return [...duplicateItems];
}
