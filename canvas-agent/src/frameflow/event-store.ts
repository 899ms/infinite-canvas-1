import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { frameFlowManifestSchema, frameFlowTransactionSchema } from "./schemas.js";
import type { FrameFlowProjection } from "./reducer.js";
import type { FrameFlowTransaction } from "./types.js";

const MANIFEST = { schemaVersion: 1, projectionVersion: 1 } as const;
const JOURNAL_FILE = "transactions-000001.jsonl";

export class FrameFlowEventStore {
    readonly directory: string;
    private readonly journalFile: string;
    private readonly projectionFile: string;

    constructor(workspacePath: string) {
        this.directory = path.join(path.resolve(workspacePath), ".infinite-canvas", "frameflow");
        this.journalFile = path.join(this.directory, "journal", JOURNAL_FILE);
        this.projectionFile = path.join(this.directory, "projections", "workspace.json");
    }

    async load(): Promise<FrameFlowTransaction[]> {
        await this.ensureStorage();
        const raw = await fs.readFile(this.journalFile, "utf8");
        const transactions = raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
            try {
                return frameFlowTransactionSchema.parse(JSON.parse(line)) as FrameFlowTransaction;
            } catch (error) {
                throw new Error(`FrameFlow journal line ${index + 1} is invalid. Refusing to overwrite existing data.`, { cause: error });
            }
        });
        transactions.forEach((transaction, index) => {
            if (transaction.sequence !== index + 1) throw new Error("FrameFlow journal sequence is invalid. Refusing to overwrite existing data.");
        });
        return transactions;
    }

    async append(transaction: FrameFlowTransaction) {
        const handle = await fs.open(this.journalFile, "a");
        try {
            await handle.write(`${JSON.stringify(transaction)}\n`);
            await handle.sync();
        } finally {
            await handle.close();
        }
    }

    async writeProjection(projection: FrameFlowProjection) {
        await writeAtomic(this.projectionFile, JSON.stringify({ schemaVersion: 1, ...projection }));
    }

    private async ensureStorage() {
        try {
            const manifest = JSON.parse(await fs.readFile(path.join(this.directory, "manifest.json"), "utf8"));
            frameFlowManifestSchema.parse(manifest);
            await fs.access(this.journalFile);
            return;
        } catch (error) {
            if (!isMissing(error)) throw new Error("Unsupported or damaged FrameFlow storage. Refusing to overwrite existing data.", { cause: error });
        }

        if (await exists(this.directory)) throw new Error("FrameFlow manifest is missing. Refusing to overwrite existing data.");
        await fs.mkdir(path.dirname(this.directory), { recursive: true });
        const temporaryDirectory = `${this.directory}.${process.pid}.${crypto.randomUUID()}.tmp`;
        try {
            await fs.mkdir(path.join(temporaryDirectory, "journal"), { recursive: true });
            await fs.mkdir(path.join(temporaryDirectory, "projections"), { recursive: true });
            await fs.writeFile(path.join(temporaryDirectory, "manifest.json"), JSON.stringify(MANIFEST));
            await fs.writeFile(path.join(temporaryDirectory, "journal", JOURNAL_FILE), "");
            await fs.rename(temporaryDirectory, this.directory);
        } finally {
            await fs.rm(temporaryDirectory, { recursive: true, force: true });
        }
    }
}

async function writeAtomic(file: string, value: string) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporaryFile = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
        await fs.writeFile(temporaryFile, value);
        await fs.rename(temporaryFile, file);
    } finally {
        await fs.unlink(temporaryFile).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error;
        });
    }
}

async function exists(file: string) {
    try {
        await fs.access(file);
        return true;
    } catch (error) {
        if (isMissing(error)) return false;
        throw error;
    }
}

function isMissing(error: unknown) {
    return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}
