import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Writable} from "node:stream";
import test from "node:test";

import { Logger, sanitizeLogDetails } from "./logger.js";

test("日志详情移除凭据字段、Data URL 与异常文本中的 Bearer 凭据", () => {
    const details = sanitizeLogDetails({
        token: "connect-token-value",
        password: "password-value",
        secret: "secret-value",
        credentials: { apiKey: "api-key-value" },
        image: { dataUrl: "data:image/png;base64,private-image" },
        response: "外部响应包含 data:image/png;base64,embedded-private-payload",
        error: new Error("request failed: Authorization: Bearer bearer-token-value"),
    });
    const text = JSON.stringify(details);

    assert.doesNotMatch(text, /connect-token-value|password-value|secret-value|api-key-value|private-image|embedded-private-payload|bearer-token-value/);
    assert.match(text, /\[REDACTED\]|\[DATA URL/);
});

test("普通模式只向终端输出 Info 以上的紧凑脱敏日志", async () => {
    const output = captureOutput();
    const logger = new Logger({debug: false, outputStream: output.stream});

    logger.debug("不应输出的调试信息");
    logger.info("已连接 Canvas", {token: "terminal-token-value"});
    logger.warn("外部响应包含 data:image/png;base64,private-image");
    logger.error("任务失败", {reason: "可恢复"});
    await logger.close();

    assert.match(output.text(), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} INFO 已连接 Canvas token='\[REDACTED\]'$/m);
    assert.match(output.text(), /WARN 外部响应包含 \[DATA URL \d+ chars\]/);
    assert.match(output.text(), /ERROR 任务失败 reason='可恢复'/);
    assert.doesNotMatch(output.text(), /不应输出的调试信息|terminal-token-value|private-image/);
});

test("Debug 模式按日追加脱敏文件日志", async (t) => {
    const homeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-agent-logger-"));
    t.after(() => fs.rmSync(homeDirectory, {recursive: true, force: true}));
    const date = new Date(2026, 7, 28, 9, 30);
    const firstOutput = captureOutput();
    const firstLogger = new Logger({debug: true, homeDirectory, date, outputStream: firstOutput.stream});
    firstLogger.debug("画布状态", {dataUrl: "data:image/png;base64,first-private-image"});
    firstLogger.info("第一条文件日志", {authorization: "Bearer first-file-token"});
    await firstLogger.close();

    const secondLogger = new Logger({debug: true, homeDirectory, date, outputStream: captureOutput().stream});
    secondLogger.warn("第二条文件日志", {secret: "second-file-secret"});
    await secondLogger.close();

    const filePath = path.join(homeDirectory, ".infinite-canvas", "logs", "canvas-agent-2026-08-28.log");
    const lines = fs.readFileSync(filePath, "utf8").trim().split("\n").map((line) => line.replace(/\r$/, ""));
    assert.equal(lines.length, 3);
    assert.match(lines[0], /^2026-08-28 \d{2}:\d{2}:\d{2} DEBUG 画布状态 dataUrl='\[REDACTED\]'$/);
    assert.match(lines[1], /^2026-08-28 \d{2}:\d{2}:\d{2} INFO 第一条文件日志 authorization='\[REDACTED\]'$/);
    assert.match(lines[2], /^2026-08-28 \d{2}:\d{2}:\d{2} WARN 第二条文件日志 secret='\[REDACTED\]'$/);
    assert.doesNotMatch(lines.join("\n"), /first-private-image|first-file-token|second-file-secret/);
});

function captureOutput() {
    let text = "";
    const stream = new Writable({
        write(chunk, _encoding, callback) {
            text += chunk.toString();
            callback();
        },
    });
    return {stream, text: () => text};
}
