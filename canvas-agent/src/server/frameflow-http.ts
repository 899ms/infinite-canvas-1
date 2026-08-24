import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

import { FrameFlowDomainError, type FrameFlowCore } from "../frameflow/core.js";
import type { FrameFlowCommand, FrameFlowQuery } from "../frameflow/types.js";

export function createFrameFlowRouter(core: FrameFlowCore, onChanged?: (payload: unknown) => void) {
    const router = express.Router();

    router.post("/commands", route(async (req, res) => {
        const data = await core.execute(req.body as FrameFlowCommand);
        onChanged?.({ sequence: data.sequence, resource: data.resource });
        res.json({ ok: true, data });
    }));
    router.post("/query", route(async (req, res) => {
        res.json({ ok: true, data: await core.query(req.body as FrameFlowQuery) });
    }));
    router.post("/auto-runs/:autoRunId/start", route(async (req, res) => {
        const autoRunId = param(req.params.autoRunId);
        const data = await core.triggerAutoRun(autoRunId, "start");
        onChanged?.({ sequence: data.sequence, resource: data.resource, autoRunId });
        res.json({ ok: true, data });
    }));
    router.post("/auto-runs/:autoRunId/advance", route(async (req, res) => {
        const autoRunId = param(req.params.autoRunId);
        const data = await core.triggerAutoRun(autoRunId, "advance");
        onChanged?.({ sequence: data.sequence, resource: data.resource, autoRunId });
        res.json({ ok: true, data });
    }));
    router.post("/auto-runs/:autoRunId/summarize", route(async (req, res) => {
        const autoRunId = param(req.params.autoRunId);
        const summary = await core.summarizeAutoRunTrajectory(autoRunId, req.body?.force === true);
        onChanged?.({ autoRunId, summaryThroughIteration: summary.throughIteration });
        res.json({ ok: true, data: { summary } });
    }));
    router.get("/health", route(async (_req, res) => {
        const summary = await core.query({ type: "workspace.summary" });
        res.json({ ok: true, data: { status: "ready", storageVersion: 1, sequence: summary.sequence } });
    }));
    router.post("/references/import", express.raw({ type: "image/png", limit: "20mb" }), route(async (req, res) => {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new FrameFlowDomainError("FrameFlow 参考图必须是非空 PNG", 400);
        const reference = await core.importReference({
            sourceId: queryParam(req.query.sourceId),
            sourceName: queryParam(req.query.sourceName),
            idempotencyKey: queryParam(req.query.idempotencyKey),
        }, req.body);
        onChanged?.({ resource: { type: "reference", id: reference.id } });
        res.json({ ok: true, data: { reference } });
    }));
    router.get("/references/:referenceId/content", route(async (req, res) => sendImage(res, await core.readReferenceContent(param(req.params.referenceId)))));
    router.get("/assets/:imageId/content", route(async (req, res) => sendImage(res, await core.readImageContent(param(req.params.imageId)))));
    router.get("/assets/:imageId/thumbnail", route(async (req, res) => sendImage(res, await core.readImageContent(param(req.params.imageId)))));
    router.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
        if (error instanceof ZodError) return void res.status(400).json({ ok: false, error: "FrameFlow 请求格式无效", issues: error.issues });
        if (error instanceof FrameFlowDomainError) return void res.status(error.statusCode).json({ ok: false, error: error.message });
        res.status(500).json({ ok: false, error: error.message });
    });

    return router;
}

function sendImage(res: Response, image: Awaited<ReturnType<FrameFlowCore["readImageContent"]>>) {
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.setHeader("ETag", `"${image.etag}"`);
    res.setHeader("Content-Length", String(image.data.length));
    res.type(image.mimeType).send(image.data);
}

function param(value: string | string[]) {
    return Array.isArray(value) ? value[0] || "" : value;
}

function queryParam(value: unknown) {
    if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
    return typeof value === "string" ? value : "";
}

function route(handler: (req: Request, res: Response) => Promise<unknown>) {
    return (req: Request, res: Response, next: NextFunction) => void handler(req, res).catch(next);
}
