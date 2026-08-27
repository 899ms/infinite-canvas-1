import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import express from "express";
import sharp from "sharp";

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

test("FrameFlow HTTP 隔离夹具覆盖停止、恢复、反馈、血缘与 Requirement 归档闭环", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-http-e2e-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFiles = await Promise.all(["first.png", "second.png"].map(async (name, index) => {
        const file = path.join(workspace, name);
        await sharp({ create: { width: 8, height: 8, channels: 3, background: index === 0 ? { r: 220, g: 210, b: 200 } : { r: 190, g: 200, b: 210 } } }).png().toFile(file);
        return file;
    }));
    let releaseGeneration!: () => void;
    const generationGate = new Promise<void>((resolve) => { releaseGeneration = resolve; });
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => ({
            fields: {
                subject: ["editorial chair"], composition: ["single subject"], color: ["warm gray"], lighting: ["window light"],
                material: ["linen"], layout: ["centered"], mood: ["quiet"], rendering: ["photorealistic"], technical: ["4:5"], negative: ["text"],
            },
            compiledPrompt: "A quiet editorial chair photograph.",
            reason: "以自由探索方向建立首轮基线。",
        }) },
        imageGenerator: { generate: async () => {
            await generationGate;
            return generatedFiles;
        } },
        imageReviewer: { review: async ({ images }) => images.map((image, index) => ({
            imageId: image.imageId,
            rating: index === 0 ? 5 as const : 2 as const,
            comment: index === 0 ? "主体与构图均符合方向。" : "保留方向，但需要降低干扰。",
            decision: index === 0 ? "keep" as const : "vary" as const,
            strengths: ["主体明确"],
            issues: index === 0 ? [] : ["减少背景噪点"],
        })) },
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
        input: {
            subject: "自由方向：安静的室内椅子", purpose: "隔离验收", style: "编辑摄影", scene: "自然窗光", aspectRatio: "4:5",
            constraints: { keep: ["单一主体"], avoid: ["文字"] }, referenceImageIds: [], strategy: "balanced",
        },
        idempotencyKey: "http-e2e-brief",
    });
    const briefId = brief.body.data.resource.id;
    const autoRun = await post(`${baseUrl}/commands`, {
        type: "auto_run.create",
        input: { name: "隔离闭环", briefId, count: 2, maxIterations: 1 },
        idempotencyKey: "http-e2e-auto-run",
    });
    const autoRunId = autoRun.body.data.resource.id;

    const started = await fetch(`${baseUrl}/auto-runs/${autoRunId}/start`, { method: "POST" });
    assert.equal(started.status, 200);
    const run = await waitForQuery(baseUrl, { type: "run.list", limit: 20 }, (data) => data.runs.length === 1);
    const runId = run.runs[0].id;

    const stopped = await post(`${baseUrl}/commands`, { type: "auto_run.stop", autoRunId, idempotencyKey: "http-e2e-stop" });
    assert.equal(stopped.response.status, 200);
    assert.equal((await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 })).body.data.autoRuns[0].state, "paused");

    // Stopping the auto-run does not discard an already-started ImageGen call. Its late result is recorded and reviewed,
    // while the task remains paused until the user explicitly resumes it.
    releaseGeneration();
    const completedRun = await waitForQuery(baseUrl, { type: "run.detail", runId }, (data) => data.run.status === "succeeded");
    assert.equal(completedRun.run.imageIds.length, 2);
    const reviewed = await waitForQuery(baseUrl, { type: "review.queue", limit: 20 }, (data) => data.items.length === 2 && data.items.every((item: { machineReview?: unknown }) => item.machineReview));
    assert.ok(reviewed.items.every((item: { image: { runId: string } }) => item.image.runId === runId));
    assert.equal((await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 })).body.data.autoRuns[0].state, "paused");

    const resumed = await fetch(`${baseUrl}/auto-runs/${autoRunId}/start`, { method: "POST" });
    assert.equal(resumed.status, 200);
    const completedAutoRun = await waitForQuery(baseUrl, { type: "auto_run.list", limit: 20 }, (data) => data.autoRuns[0]?.state === "completed");
    assert.equal(completedAutoRun.autoRuns[0].currentRunId, runId);

    const [preferred, discarded] = reviewed.items.map((item: { image: { id: string } }) => item.image.id);
    await post(`${baseUrl}/commands`, { type: "feedback.append", imageId: preferred, feedback: { kind: "rating", rating: 5 }, idempotencyKey: "http-e2e-rating" });
    await post(`${baseUrl}/commands`, { type: "feedback.append", imageId: preferred, feedback: { kind: "comment", comment: "保留椅子的留白和自然光。" }, idempotencyKey: "http-e2e-comment" });
    await post(`${baseUrl}/commands`, { type: "feedback.append", imageId: preferred, feedback: { kind: "soft_delete", reason: "aesthetic_dislike" }, idempotencyKey: "http-e2e-hide" });
    let preference = await post(`${baseUrl}/query`, { type: "preference.dna", briefId });
    assert.deepEqual(preference.body.data.avoid.map((item: { imageId: string; weight: number }) => ({ imageId: item.imageId, weight: item.weight })), [{ imageId: preferred, weight: -4 }]);
    await post(`${baseUrl}/commands`, { type: "feedback.append", imageId: preferred, feedback: { kind: "restore" }, idempotencyKey: "http-e2e-restore-image" });
    preference = await post(`${baseUrl}/query`, { type: "preference.dna", briefId });
    assert.deepEqual(preference.body.data.boost.map((item: { imageId: string; weight: number }) => ({ imageId: item.imageId, weight: item.weight })), [{ imageId: preferred, weight: 3 }]);
    await post(`${baseUrl}/commands`, { type: "feedback.append", imageId: discarded, feedback: { kind: "rating", rating: 1 }, idempotencyKey: "http-e2e-low-rating" });
    await post(`${baseUrl}/commands`, { type: "image.delete", imageId: discarded, idempotencyKey: "http-e2e-delete-without-learning" });
    preference = await post(`${baseUrl}/query`, { type: "preference.dna", briefId });
    assert.equal(preference.body.data.avoid.some((item: { imageId: string }) => item.imageId === discarded), false);

    const trajectory = await post(`${baseUrl}/query`, { type: "auto_run.trajectory", autoRunId });
    assert.equal(trajectory.body.data.brief.id, briefId);
    assert.deepEqual(trajectory.body.data.rounds[0].run.imageIds.sort(), [preferred, discarded].sort());
    assert.ok(trajectory.body.data.rounds[0].images.every((item: { machineReview?: { runId: string } }) => item.machineReview?.runId === runId));

    const archived = await post(`${baseUrl}/commands`, { type: "brief.archive", briefId, idempotencyKey: "http-e2e-archive" });
    assert.equal(archived.response.status, 200);
    assert.deepEqual((await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 })).body.data.autoRuns, []);
    const archivedRuns = await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20, includeArchived: true });
    assert.equal(archivedRuns.body.data.autoRuns[0].id, autoRunId);
    assert.equal(archivedRuns.body.data.autoRuns[0].requirementArchived, true);
    await post(`${baseUrl}/commands`, { type: "brief.restore", briefId, idempotencyKey: "http-e2e-restore-requirement" });
    const restoredRuns = await post(`${baseUrl}/query`, { type: "auto_run.list", limit: 20 });
    assert.equal(restoredRuns.body.data.autoRuns[0].id, autoRunId);
    assert.equal(restoredRuns.body.data.autoRuns[0].requirementArchived, false);
});

async function post(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { response, body: await response.json() as Record<string, any> };
}

async function waitForQuery(baseUrl: string, query: unknown, matches: (data: any) => boolean, timeoutMs = 2_000) {
    const deadline = Date.now() + timeoutMs;
    let result = await post(`${baseUrl}/query`, query);
    while (!matches(result.body.data)) {
        if (Date.now() >= deadline) throw new Error(`等待 FrameFlow 验收夹具状态超时：${JSON.stringify(query)}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
        result = await post(`${baseUrl}/query`, query);
    }
    return result.body.data;
}
