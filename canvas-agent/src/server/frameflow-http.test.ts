import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import express from "express";

import { FrameFlowCore } from "../frameflow/core.js";
import { createFrameFlowRouter } from "./frameflow-http.js";

test("FrameFlow HTTP 接收命令、查询投影并返回健康摘要", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-http-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const app = express();
    app.use(express.json());
    app.use("/agent/frameflow", createFrameFlowRouter(new FrameFlowCore(workspace)));
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const address = server.address();
    assert(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}/agent/frameflow`;

    const command = await post(`${baseUrl}/commands`, {
        type: "brief.create",
        input: {
            subject: "酒店大堂",
            purpose: "方案汇报",
            aspectRatio: "16:9",
            constraints: { keep: [], avoid: [] },
            referenceImageIds: [],
            strategy: "stable",
            profileId: "default",
        },
        idempotencyKey: "http-brief-1",
    });
    assert.equal(command.response.status, 200);
    assert.equal(command.body.ok, true);
    assert.equal(command.body.data.resource.type, "brief");

    const query = await post(`${baseUrl}/query`, { type: "workspace.summary" });
    assert.equal(query.response.status, 200);
    assert.equal(query.body.data.briefs, 1);

    const healthResponse = await fetch(`${baseUrl}/health`);
    const health = await healthResponse.json() as Record<string, any>;
    assert.deepEqual(health, { ok: true, data: { status: "ready", storageVersion: 1, sequence: 1 } });
});

test("FrameFlow HTTP 公开返回 Agent Decision 与 Prompt Diff 血缘", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-http-lineage-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace, {
        planner: {
            plan: async () => ({
                fields: {
                    subject: ["ceramic vase"], composition: ["editorial still life"], color: ["warm white"], lighting: ["soft daylight"],
                    material: ["matte ceramic"], layout: ["single object"], mood: ["quiet"], rendering: ["photorealistic"],
                    technical: ["4:5"], negative: ["text"],
                },
                compiledPrompt: "A matte ceramic vase in an editorial still life with soft daylight.",
                reason: "本轮没有可用偏好证据，只执行 Brief。",
            }),
        },
    });
    const app = express();
    app.use(express.json());
    app.use("/agent/frameflow", createFrameFlowRouter(core));
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const address = server.address();
    assert(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}/agent/frameflow`;

    const created = await post(`${baseUrl}/commands`, {
        type: "brief.create",
        input: {
            subject: "陶瓷花瓶", purpose: "新品视觉", aspectRatio: "4:5", constraints: { keep: [], avoid: ["文字"] },
            referenceImageIds: [], strategy: "balanced", profileId: "default",
        },
        idempotencyKey: "http-lineage-brief",
    });
    const planned = await post(`${baseUrl}/commands`, {
        type: "round.plan",
        briefId: created.body.data.resource.id,
        strategy: "balanced",
        idempotencyKey: "http-lineage-plan",
    });
    const promptVersionId = planned.body.data.resource.id;
    const lineage = await post(`${baseUrl}/query`, { type: "prompt.lineage", promptVersionId });

    assert.equal(lineage.response.status, 200);
    assert.equal(lineage.body.data.versions[0].decisionId, lineage.body.data.decisions[0].id);
    assert.equal(lineage.body.data.decisions[0].summary, "本轮没有可用偏好证据，只执行 Brief。");
    assert.deepEqual(lineage.body.data.decisions[0].evidence, []);
    assert.deepEqual(lineage.body.data.versions[0].diff.add.find((change: { field: string }) => change.field === "subject").after, ["ceramic vase"]);
});

test("FrameFlow HTTP 可幂等导入浏览器参考图并按内容哈希读取", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-http-reference-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const app = express();
    app.use(express.json());
    const core = new FrameFlowCore(workspace);
    app.use("/agent/frameflow", createFrameFlowRouter(core));
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const address = server.address();
    assert(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}/agent/frameflow`;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64");
    const importUrl = `${baseUrl}/references/import?sourceId=browser-http-1&sourceName=moodboard.png&idempotencyKey=http-reference-1`;

    const firstResponse = await fetch(importUrl, { method: "POST", headers: { "content-type": "image/png" }, body: png });
    const first = await firstResponse.json() as Record<string, any>;
    const duplicateResponse = await fetch(importUrl, { method: "POST", headers: { "content-type": "image/png" }, body: png });
    const duplicate = await duplicateResponse.json() as Record<string, any>;

    assert.equal(firstResponse.status, 200);
    assert.equal(duplicateResponse.status, 200);
    assert.equal(first.data.reference.id, duplicate.data.reference.id);
    assert.deepEqual(first.data.reference.source, { type: "browser_asset", id: "browser-http-1", name: "moodboard.png" });

    const contentResponse = await fetch(`${baseUrl}/references/${first.data.reference.id}/content`);
    assert.equal(contentResponse.status, 200);
    assert.equal(contentResponse.headers.get("content-type"), "image/png");
    assert.equal(contentResponse.headers.get("etag"), `"${first.data.reference.file.sha256}"`);
    assert.deepEqual(Buffer.from(await contentResponse.arrayBuffer()), png);

    const listed = await post(`${baseUrl}/query`, { type: "reference.list", limit: 20 });
    assert.equal(listed.body.data.items.length, 1);

    const invalidResponse = await fetch(`${baseUrl}/references/import?sourceId=bad&sourceName=bad.png&idempotencyKey=http-reference-invalid`, {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: Buffer.from("not-a-png"),
    });
    assert.equal(invalidResponse.status, 400);
    assert.match(((await invalidResponse.json()) as Record<string, any>).error, /有效 PNG/);
});

test("FrameFlow HTTP 按方向启动自动跑并立即创建可追溯 Run", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-http-auto-run-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "auto-run.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    let finishPlanning!: () => void;
    const planningGate = new Promise<void>((resolve) => { finishPlanning = resolve; });
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => {
            await planningGate;
            return ({
            fields: {
                subject: ["poster"], composition: ["centered"], color: ["warm"], lighting: ["soft"], material: ["paper"],
                layout: ["editorial"], mood: ["calm"], rendering: ["graphic design"], technical: ["1:1"], negative: ["watermark"],
            },
            compiledPrompt: "A calm editorial poster.",
            reason: "使用方向与最新偏好。",
            });
        } },
        imageGenerator: { generate: async () => [generatedFile] },
        imageReviewer: { review: async ({ images }) => images.map(({ imageId }) => ({ imageId, rating: 4 as const, comment: "方向符合，继续变体。", decision: "vary" as const, strengths: ["构图明确"], issues: ["增加层次"] })) },
    });
    const app = express();
    app.use(express.json());
    app.use("/agent/frameflow", createFrameFlowRouter(core));
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const address = server.address();
    assert(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}/agent/frameflow`;
    const brief = await post(`${baseUrl}/commands`, {
        type: "brief.create",
        input: { subject: "海报", purpose: "审美训练", style: "编辑设计", scene: "画廊", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", profileId: "default" },
        idempotencyKey: "http-auto-run-brief",
    });
    const autoRun = await post(`${baseUrl}/commands`, {
        type: "auto_run.create",
        input: { name: "编辑海报探索", briefId: brief.body.data.resource.id, count: 1, maxIterations: 1 },
        idempotencyKey: "http-auto-run-create",
    });

    const runResponse = await fetch(`${baseUrl}/auto-runs/${autoRun.body.data.resource.id}/start`, { method: "POST" });
    const run = await runResponse.json() as Record<string, any>;
    assert.equal(runResponse.status, 200);
    assert.deepEqual(run.data.resource, { type: "auto_run", id: autoRun.body.data.resource.id });
    const planning = await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 });
    assert.equal(planning.body.data.autoRuns[0].state, "generating");
    assert.equal(planning.body.data.autoRuns[0].currentRunId, undefined);
    finishPlanning();

    let startedRun = await post(`${baseUrl}/query`, { type: "run.list", limit: 20 });
    for (let index = 0; index < 100 && !startedRun.body.data.runs[0]; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        startedRun = await post(`${baseUrl}/query`, { type: "run.list", limit: 20 });
    }
    const runId = startedRun.body.data.runs[0].id;

    for (let index = 0; index < 100; index += 1) {
        const detail = await post(`${baseUrl}/query`, { type: "run.detail", runId });
        if (!["queued", "running", "retrying"].includes(detail.body.data.run.status)) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    let listed = await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 });
    for (let index = 0; index < 100 && listed.body.data.autoRuns[0].state !== "completed"; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        listed = await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 });
    }
    assert.equal(listed.body.data.autoRuns[0].currentRunId, runId);
    assert.equal(listed.body.data.autoRuns[0].iteration, 1);
    assert.equal(listed.body.data.autoRuns[0].state, "completed");
    const queue = await post(`${baseUrl}/query`, { type: "review.queue", limit: 20 });
    assert.equal(queue.body.data.items[0].machineReview.rating, 4);
});

test("FrameFlow HTTP 归档查询默认隔离后代并可恢复 Requirement", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-http-requirement-archive-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const app = express();
    app.use(express.json());
    app.use("/agent/frameflow", createFrameFlowRouter(new FrameFlowCore(workspace)));
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    context.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const address = server.address();
    assert(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}/agent/frameflow`;
    const brief = await post(`${baseUrl}/commands`, {
        type: "brief.create",
        input: { subject: "HTTP 归档恢复", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced" },
        idempotencyKey: "http-requirement-archive-brief",
    });
    const autoRun = await post(`${baseUrl}/commands`, {
        type: "auto_run.create",
        input: { name: "HTTP 归档恢复", briefId: brief.body.data.resource.id, count: 1, maxIterations: 1 },
        idempotencyKey: "http-requirement-archive-auto-run",
    });
    await post(`${baseUrl}/commands`, {
        type: "brief.archive", briefId: brief.body.data.resource.id, idempotencyKey: "http-requirement-archive-command",
    });

    const rejected = await post(`${baseUrl}/commands`, {
        type: "auto_run.update", autoRunId: autoRun.body.data.resource.id, input: { name: "不应写入" }, idempotencyKey: "http-requirement-archive-rejected-update",
    });
    assert.equal(rejected.response.status, 409);
    assert.match(rejected.body.error, /Requirement 已归档/);
    assert.deepEqual((await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 })).body.data.autoRuns, []);
    const history = await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20, includeArchived: true });
    assert.equal(history.body.data.autoRuns[0].requirementArchived, true);
    assert.equal(history.body.data.autoRuns[0].briefSuperseded, false);

    const restored = await post(`${baseUrl}/commands`, {
        type: "brief.restore", briefId: brief.body.data.resource.id, idempotencyKey: "http-requirement-restore-command",
    });
    assert.equal(restored.response.status, 200);
    assert.deepEqual(restored.body.data.resource, { type: "brief", id: brief.body.data.resource.id });
    const active = await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 });
    assert.equal(active.body.data.autoRuns.length, 1);
    assert.equal(active.body.data.autoRuns[0].requirementArchived, false);
});

async function post(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { response, body: await response.json() as Record<string, any> };
}
