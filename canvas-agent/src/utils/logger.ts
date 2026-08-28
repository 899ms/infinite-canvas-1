import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {Writable} from "node:stream";
import {inspect} from "node:util";

import winston, {format, transports, type Logger as WinstonLogger} from "winston";

import {formatDateForFilename} from "./date.js";

/** 管理 Canvas Agent 的终端与文件 Debug 日志。 */
export class Logger {
    readonly enabled: boolean;
    readonly filePath: string;
    private readonly logger: WinstonLogger;

    /** 普通模式输出 Info 以上日志，Debug 模式额外输出 Debug 并写入文件。 */
    constructor(options: LoggerOptions = {}) {
        this.enabled = options.debug ?? process.argv.includes("--debug");
        this.filePath = this.enabled ? path.join(options.homeDirectory || os.homedir(), ".infinite-canvas", "logs", `canvas-agent-${formatDateForFilename(options.date)}.log`) : "";
        const line = format.printf(({level, message, timestamp, details}) => `${timestamp} ${level.toUpperCase()} ${message}${formatDetails(details)}`);
        const output = format.combine(format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}), line);
        if (this.enabled) fs.mkdirSync(path.dirname(this.filePath), {recursive: true});
        this.logger = winston.createLogger({
            level: this.enabled ? "debug" : "info",
            transports: [
                options.outputStream ? new transports.Stream({stream: options.outputStream, format: output}) : new transports.Console({format: output}),
                ...(this.enabled ? [new transports.File({filename: this.filePath, format: output})] : []),
            ],
        });
    }

    /** 输出 Debug 级别日志。 */
    debug(message: string, details?: unknown) {
        if (details === undefined) this.logger.debug(sanitizeLogMessage(message));
        else this.logger.debug(sanitizeLogMessage(message), {details: sanitizeLogDetails(details)});
    }

    /** 输出 Info 级别日志。 */
    info(message: string, details?: unknown) {
        if (details === undefined) this.logger.info(sanitizeLogMessage(message));
        else this.logger.info(sanitizeLogMessage(message), {details: sanitizeLogDetails(details)});
    }

    /** 输出 Warn 级别日志。 */
    warn(message: string, details?: unknown) {
        if (details === undefined) this.logger.warn(sanitizeLogMessage(message));
        else this.logger.warn(sanitizeLogMessage(message), {details: sanitizeLogDetails(details)});
    }

    /** 输出 Error 级别日志。 */
    error(message: string, details?: unknown) {
        if (details === undefined) this.logger.error(sanitizeLogMessage(message));
        else this.logger.error(sanitizeLogMessage(message), {details: sanitizeLogDetails(details)});
    }

    /** 完成待写日志；仅供受控关闭与测试使用。 */
    close() {
        return new Promise<void>((resolve, reject) => {
            this.logger.once("finish", resolve);
            this.logger.once("error", reject);
            this.logger.end();
        });
    }
}

export interface LoggerOptions {
    debug?: boolean;
    homeDirectory?: string;
    date?: Date;
    outputStream?: Writable;
}

/** 将日志详情格式化为紧凑的单行文本。 */
function formatDetails(details: unknown) {
    if (details === undefined) return "";
    if (!details || typeof details !== "object" || Array.isArray(details)) return ` ${inspect(details, {depth: null, breakLength: Infinity})}`;
    const text = Object.entries(details).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}=${inspect(value, {depth: null, breakLength: Infinity})}`).join(" ");
    return text ? ` ${text}` : "";
}

/** 清理日志内容中的敏感数据和不可序列化引用。 */
export function sanitizeLogDetails(value: unknown) {
    return sanitize(value);
}

function sanitize(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
    if (/token|authorization|api.?key|dataurl|password|secret|credential/i.test(key)) return "[REDACTED]";
    if (typeof value === "string") return value.startsWith("data:") ? `[DATA URL ${value.length} chars]` : redactLogText(value);
    if (value instanceof Error) return {name: value.name, message: redactLogText(value.message), stack: value.stack ? redactLogText(value.stack) : undefined};
    if (!value || typeof value !== "object") return value;
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    if (Array.isArray(value)) return value.map((item) => sanitize(item, key, seen));
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([field, item]) => [field, sanitize(item, field, seen)]));
}

function redactLogText(value: string) {
    return value
        .replace(/\bdata:[^\s'"`]+/gi, (dataUrl) => `[DATA URL ${dataUrl.length} chars]`)
        .replace(/\bbearer\s+[A-Za-z0-9._~+/=\-]{8,}/gi, "Bearer [REDACTED]")
        .replace(/\b(?:api[_ -]?key|access[_ -]?(?:key|token)|connect[_ -]?token|token|secret|password|authorization|credential)\s*(?:[:=：]|为|是)\s*(?:bearer\s+)?[`'"“]?[A-Za-z0-9_./+\-=]{8,}/gi, "[REDACTED]");
}

function sanitizeLogMessage(message: string) {
    return redactLogText(message).replace(/\r?\n|\r/g, "\\n");
}

export const logger = new Logger();
