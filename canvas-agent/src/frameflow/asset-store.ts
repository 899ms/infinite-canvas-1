import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import type { FrameFlowImageAsset, FrameFlowReferenceAsset, QuarantineReason, QuarantineRecord } from "./types.js";

export class FrameFlowAssetValidationError extends Error {
    override name = "FrameFlowAssetValidationError";
}

export class FrameFlowAssetStore {
    private quarantineQueue: Promise<unknown> = Promise.resolve();

    constructor(private readonly frameFlowDirectory: string) {}

    async importGenerated(files: string[], input: { runId: string; promptVersionId: string; aspectRatio: string; cropPosition: "top" | "attention"; createdAt: string }): Promise<FrameFlowImageAsset[]> {
        const imported: FrameFlowImageAsset[] = [];
        try {
            for (const source of files) {
                const sourceData = await fs.readFile(source);
                const normalized = await normalizePngAspectRatio(sourceData, input.aspectRatio, input.cropPosition);
                const { data, width, height } = normalized;
                const id = crypto.randomUUID();
                const relativePath = path.posix.join("assets", "originals", `${id}.png`);
                const target = path.join(this.frameFlowDirectory, ...relativePath.split("/"));
                await writeAtomic(target, data);
                imported.push({
                    id,
                    runId: input.runId,
                    promptVersionId: input.promptVersionId,
                    referenceImageIds: [],
                    file: { relativePath, sha256: crypto.createHash("sha256").update(data).digest("hex"), bytes: data.length, mimeType: "image/png" },
                    thumbnail: { relativePath, width, height },
                    width,
                    height,
                    outputConstraint: {
                        aspectRatio: input.aspectRatio,
                        normalization: normalized.normalization,
                        sourceWidth: normalized.sourceWidth,
                        sourceHeight: normalized.sourceHeight,
                    },
                    status: "pending_review",
                    createdAt: input.createdAt,
                });
            }
            return imported;
        } catch (error) {
            await this.remove(imported);
            throw error;
        }
    }

    async importReference(data: Buffer, input: { sourceId: string; sourceName: string; createdAt: string }): Promise<FrameFlowReferenceAsset> {
        if (data.length > 20 * 1024 * 1024) throw new FrameFlowAssetValidationError("FrameFlow 参考图不能超过 20MB");
        const { width, height } = pngDimensions(data);
        const id = crypto.randomUUID();
        const relativePath = path.posix.join("assets", "references", `${id}.png`);
        await writeAtomic(path.join(this.frameFlowDirectory, ...relativePath.split("/")), data);
        return {
            id,
            source: { type: "browser_asset", id: input.sourceId, name: input.sourceName },
            file: { relativePath, sha256: crypto.createHash("sha256").update(data).digest("hex"), bytes: data.length, mimeType: "image/png" },
            width,
            height,
            createdAt: input.createdAt,
        };
    }

    async remove(images: FrameFlowImageAsset[]) {
        await Promise.all(images.map((image) => fs.unlink(path.join(this.frameFlowDirectory, ...image.file.relativePath.split("/"))).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error;
        })));
    }

    quarantineGenerated(files: string[], input: { reason: QuarantineReason; runId?: string; promptVersionId?: string }): Promise<QuarantineRecord[]> {
        return this.enqueueQuarantine(async () => {
            const records: QuarantineRecord[] = [];
            for (const source of files) {
                const data = await fs.readFile(source);
                records.push(await this.writeQuarantineFile(data, path.basename(source), input));
            }
            return records;
        });
    }

    quarantineImported(images: FrameFlowImageAsset[], reason: QuarantineReason): Promise<QuarantineRecord[]> {
        return this.enqueueQuarantine(async () => {
            const records: QuarantineRecord[] = [];
            for (const image of images) {
                const source = this.absolutePath(image);
                let data: Buffer;
                try {
                    data = await fs.readFile(source);
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
                    throw error;
                }
                const record = await this.writeQuarantineFile(data, path.basename(source), {
                    reason,
                    runId: image.runId,
                    promptVersionId: image.promptVersionId,
                    imageId: image.id,
                });
                await fs.unlink(source);
                records.push(record);
            }
            return records;
        });
    }

    quarantineReferences(references: FrameFlowReferenceAsset[], reason: QuarantineReason): Promise<QuarantineRecord[]> {
        return this.enqueueQuarantine(async () => {
            const records: QuarantineRecord[] = [];
            for (const reference of references) {
                const source = this.absoluteReferencePath(reference);
                let data: Buffer;
                try {
                    data = await fs.readFile(source);
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
                    throw error;
                }
                const record = await this.writeQuarantineFile(data, path.basename(source), {
                    reason,
                    imageId: reference.id,
                });
                await fs.unlink(source);
                records.push(record);
            }
            return records;
        });
    }

    quarantineOrphans(registeredRelativePaths: Set<string>): Promise<QuarantineRecord[]> {
        return this.quarantineDirectoryOrphans("originals", registeredRelativePaths);
    }

    quarantineReferenceOrphans(registeredRelativePaths: Set<string>): Promise<QuarantineRecord[]> {
        return this.quarantineDirectoryOrphans("references", registeredRelativePaths);
    }

    private quarantineDirectoryOrphans(directoryName: "originals" | "references", registeredRelativePaths: Set<string>): Promise<QuarantineRecord[]> {
        return this.enqueueQuarantine(async () => {
            const directory = path.join(this.frameFlowDirectory, "assets", directoryName);
            let names: string[];
            try {
                names = await fs.readdir(directory);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
                throw error;
            }
            const records: QuarantineRecord[] = [];
            for (const name of names) {
                const relativePath = path.posix.join("assets", directoryName, name);
                if (registeredRelativePaths.has(relativePath)) continue;
                const source = path.join(directory, name);
                const stat = await fs.stat(source);
                if (!stat.isFile()) continue;
                const data = await fs.readFile(source);
                const record = await this.writeQuarantineFile(data, name, { reason: "orphan_recovery" });
                await fs.unlink(source);
                records.push(record);
            }
            return records;
        });
    }

    async listQuarantine(limit: number): Promise<QuarantineRecord[]> {
        await this.quarantineQueue.catch(() => undefined);
        const journal = path.join(this.frameFlowDirectory, "quarantine", "records.jsonl");
        let raw: string;
        try {
            raw = await fs.readFile(journal, "utf8");
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
            throw error;
        }
        return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as QuarantineRecord).slice(-limit).reverse();
    }

    absolutePath(image: FrameFlowImageAsset) {
        return path.join(this.frameFlowDirectory, ...image.file.relativePath.split("/"));
    }

    absoluteReferencePath(reference: FrameFlowReferenceAsset) {
        return path.join(this.frameFlowDirectory, ...reference.file.relativePath.split("/"));
    }

    async read(image: FrameFlowImageAsset) {
        const data = await fs.readFile(this.absolutePath(image));
        const sha256 = crypto.createHash("sha256").update(data).digest("hex");
        if (sha256 !== image.file.sha256) throw new Error("FrameFlow 图片文件校验失败");
        return { data, mimeType: image.file.mimeType, etag: sha256 };
    }

    async readReference(reference: FrameFlowReferenceAsset) {
        const data = await fs.readFile(this.absoluteReferencePath(reference));
        const sha256 = crypto.createHash("sha256").update(data).digest("hex");
        if (sha256 !== reference.file.sha256) throw new Error("FrameFlow 参考图文件校验失败");
        return { data, mimeType: reference.file.mimeType, etag: sha256 };
    }

    private enqueueQuarantine<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.quarantineQueue.catch(() => undefined).then(operation);
        this.quarantineQueue = result.catch(() => undefined);
        return result;
    }

    private async writeQuarantineFile(
        data: Buffer,
        sourceName: string,
        input: { reason: QuarantineReason; runId?: string; promptVersionId?: string; imageId?: string },
    ): Promise<QuarantineRecord> {
        const id = crypto.randomUUID();
        const extension = path.extname(sourceName).toLowerCase() === ".png" ? ".png" : ".bin";
        const relativePath = path.posix.join("quarantine", "files", `${id}${extension}`);
        await writeAtomic(path.join(this.frameFlowDirectory, ...relativePath.split("/")), data);
        const record: QuarantineRecord = {
            id,
            reason: input.reason,
            ...(input.runId ? { runId: input.runId } : {}),
            ...(input.promptVersionId ? { promptVersionId: input.promptVersionId } : {}),
            ...(input.imageId ? { imageId: input.imageId } : {}),
            sourceName,
            relativePath,
            sha256: crypto.createHash("sha256").update(data).digest("hex"),
            bytes: data.length,
            createdAt: new Date().toISOString(),
        };
        const journal = path.join(this.frameFlowDirectory, "quarantine", "records.jsonl");
        await fs.mkdir(path.dirname(journal), { recursive: true });
        const handle = await fs.open(journal, "a");
        try {
            await handle.write(`${JSON.stringify(record)}\n`);
            await handle.sync();
        } finally {
            await handle.close();
        }
        return record;
    }
}

async function normalizePngAspectRatio(data: Buffer, aspectRatio: string, cropPosition: "top" | "attention") {
    const { width: sourceWidth, height: sourceHeight } = pngDimensions(data);
    const [ratioWidth, ratioHeight] = aspectRatio.split(":").map(Number);
    if (!ratioWidth || !ratioHeight) throw new FrameFlowAssetValidationError("FrameFlow 目标画幅无效");
    if (sourceWidth * ratioHeight === sourceHeight * ratioWidth) {
        return { data, width: sourceWidth, height: sourceHeight, sourceWidth, sourceHeight, normalization: "none" as const };
    }

    const scale = Math.floor(Math.min(sourceWidth / ratioWidth, sourceHeight / ratioHeight));
    if (scale < 1) throw new FrameFlowAssetValidationError(`PNG 尺寸无法满足 ${aspectRatio} 画幅`);
    const width = ratioWidth * scale;
    const height = ratioHeight * scale;
    let normalized: Buffer;
    try {
        normalized = await sharp(data).resize({ width, height, fit: "cover", position: cropPosition, withoutEnlargement: true }).png().toBuffer();
    } catch {
        throw new FrameFlowAssetValidationError(`PNG 无法安全归一化为 ${aspectRatio} 画幅`);
    }
    const dimensions = pngDimensions(normalized);
    if (dimensions.width * ratioHeight !== dimensions.height * ratioWidth) throw new FrameFlowAssetValidationError(`PNG 归一化后仍不符合 ${aspectRatio} 画幅`);
    return { data: normalized, ...dimensions, sourceWidth, sourceHeight, normalization: cropPosition === "top" ? "top_crop" as const : "attention_crop" as const };
}

function pngDimensions(data: Buffer) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (data.length < 24 || !data.subarray(0, 8).equals(signature) || data.toString("ascii", 12, 16) !== "IHDR") throw new FrameFlowAssetValidationError("文件不是有效 PNG");
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    if (!width || !height || width > 100_000 || height > 100_000) throw new FrameFlowAssetValidationError("PNG 尺寸无效");
    return { width, height };
}

async function writeAtomic(file: string, data: Buffer) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporaryFile = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
        const handle = await fs.open(temporaryFile, "wx");
        try {
            await handle.writeFile(data);
            await handle.sync();
        } finally {
            await handle.close();
        }
        await fs.rename(temporaryFile, file);
    } finally {
        await fs.unlink(temporaryFile).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error;
        });
    }
}
