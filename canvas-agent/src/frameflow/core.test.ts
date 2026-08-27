import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import { FrameFlowCore } from "./core.js";
import type { FrameFlowPromptPlanner, FrameFlowTrajectorySummarizer } from "./types.js";

const testPlan = {
    fields: {
        subject: ["ceramic vase"], composition: ["centered product shot"], color: ["warm white"], lighting: ["softbox lighting"],
        material: ["matte ceramic"], layout: ["single object"], mood: ["calm"], rendering: ["photorealistic"],
        technical: ["1:1"], negative: ["text", "watermark"],
    },
    compiledPrompt: "A matte ceramic vase, centered product shot, softbox lighting, warm white background.",
    reason: "保持单一主体并减少构图变量。",
};

async function approvedPrompt(core: FrameFlowCore, key: string) {
    const brief = await core.execute({
        type: "brief.create",
        input: {
            subject: "陶瓷花瓶", purpose: "电商主图", aspectRatio: "1:1",
            constraints: { keep: ["哑光陶瓷"], avoid: ["文字"] }, referenceImageIds: [], strategy: "stable", profileId: "default",
        },
        idempotencyKey: `${key}-brief`,
    });
    const prompt = await core.execute({ type: "round.plan", briefId: brief.resource!.id, strategy: "stable", idempotencyKey: `${key}-plan` });
    await core.execute({ type: "prompt.approve", promptVersionId: prompt.resource!.id, locks: {}, idempotencyKey: `${key}-approve` });
    return prompt.resource!.id;
}

async function waitFor(check: () => Promise<boolean>, timeoutMs = 2_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("等待 FrameFlow 状态超时");
}

async function waitRunTerminal(core: FrameFlowCore, runId: string) {
    await waitFor(async () => {
        const { run } = await core.query({ type: "run.detail", runId });
        return !["queued", "running", "retrying"].includes(run.status);
    });
    return await core.query({ type: "run.detail", runId });
}

async function importTestReference(core: FrameFlowCore, sourceId: string, key: string) {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64");
    return await core.importReference({ sourceId, sourceName: `${sourceId}.png`, idempotencyKey: key }, png);
}

async function generatedReviewFixture(workspace: string, key: string, count: number) {
    const generatedFile = path.join(workspace, `${key}.png`);
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => Array.from({ length: count }, () => generatedFile) },
    });
    const promptVersionId = await approvedPrompt(core, key);
    const run = await core.execute({ type: "run.start", promptVersionId, count, idempotencyKey: `${key}-run` });
    await waitRunTerminal(core, run.resource!.id);
    const items = (await core.query({ type: "review.queue", limit: 20 })).items.filter((item) => item.image.runId === run.resource!.id);
    return { core, briefId: items[0]!.briefId, imageIds: items.map((item) => item.image.id) };
}

test("浏览器图片可幂等导入为独立 Reference Asset", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-reference-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64");
    const core = new FrameFlowCore(workspace);
    const input = { sourceId: "browser-asset-1", sourceName: "moodboard.png", idempotencyKey: "import-browser-asset-1" };

    const first = await core.importReference(input, png);
    const duplicate = await core.importReference(input, png);
    const listed = await core.query({ type: "reference.list", limit: 20 });

    assert.deepEqual(duplicate, first);
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0]?.id, first.id);
    assert.equal(listed.items[0]?.source.type, "browser_asset");
    assert.equal(listed.items[0]?.source.id, "browser-asset-1");
    assert.equal(listed.items[0]?.file.bytes, 68);
    assert.match(listed.items[0]?.file.relativePath || "", /^assets\/references\/[a-f0-9-]+\.png$/);
    assert.deepEqual(await core.readReferenceContent(first.id), { data: png, mimeType: "image/png", etag: listed.items[0]?.file.sha256 });
});

test("Creative Brief 的 Reference Asset 会作为受控本地文件传给 ImageGen", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-reference-generate-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const receivedFiles: string[][] = [];
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async ({ referenceFiles }) => { receivedFiles.push(referenceFiles); throw new Error("stop after contract capture"); } },
    });
    const reference = await importTestReference(core, "browser-asset-contract", "reference-contract-import");
    const brief = await core.execute({
        type: "brief.create",
        input: {
            subject: "陶瓷花瓶", purpose: "电商主图", aspectRatio: "1:1", constraints: { keep: [], avoid: [] },
            referenceImageIds: [reference.id], strategy: "stable", profileId: "default",
        },
        idempotencyKey: "reference-contract-brief",
    });
    const prompt = await core.execute({ type: "round.plan", briefId: brief.resource!.id, strategy: "stable", idempotencyKey: "reference-contract-plan" });
    await core.execute({ type: "prompt.approve", promptVersionId: prompt.resource!.id, locks: {}, idempotencyKey: "reference-contract-approve" });
    const run = await core.execute({ type: "run.start", promptVersionId: prompt.resource!.id, count: 1, idempotencyKey: "reference-contract-run" });
    await waitRunTerminal(core, run.resource!.id);

    assert.equal(receivedFiles.length, 1);
    assert.match(receivedFiles[0]?.[0] || "", /\.infinite-canvas[\\/]frameflow[\\/]assets[\\/]references[\\/].+\.png$/);
    assert.deepEqual(await fs.readFile(receivedFiles[0]![0]!), (await core.readReferenceContent(reference.id)).data);
});

test("Brief 画幅传给 ImageGen，偏离结果在落库前无拉伸智能裁切并记录血缘", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-aspect-ratio-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "portrait-source.png");
    await sharp({ create: { width: 8, height: 12, channels: 3, background: { r: 24, g: 32, b: 40 } } }).png().toFile(generatedFile);
    const receivedRatios: string[] = [];
    const receivedCropPositions: string[] = [];
    const dashboardPlan = {
        ...testPlan,
        fields: { ...testPlan.fields, layout: ["web dashboard with top navigation"] },
        compiledPrompt: "A dark web dashboard with top navigation and a four-column asset grid.",
    };
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => dashboardPlan },
        imageGenerator: { generate: async ({ aspectRatio, cropPosition }) => { receivedRatios.push(aspectRatio); receivedCropPositions.push(cropPosition); return [generatedFile]; } },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: {
            subject: "深色资产库", purpose: "视觉概念验证", aspectRatio: "4:5",
            constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", profileId: "default",
        },
        idempotencyKey: "aspect-ratio-brief",
    });
    const planned = await core.execute({ type: "round.plan", briefId: brief.resource!.id, strategy: "balanced", idempotencyKey: "aspect-ratio-plan" });
    await core.execute({ type: "prompt.approve", promptVersionId: planned.resource!.id, locks: {}, idempotencyKey: "aspect-ratio-approve" });
    const started = await core.execute({ type: "run.start", promptVersionId: planned.resource!.id, count: 1, idempotencyKey: "aspect-ratio-run" });
    const run = await waitRunTerminal(core, started.resource!.id);
    const image = await core.query({ type: "image.detail", imageId: run.run.imageIds[0]! });
    const content = await core.readImageContent(image.image.id);
    const metadata = await sharp(content.data).metadata();

    assert.deepEqual(receivedRatios, ["4:5"]);
    assert.deepEqual(receivedCropPositions, ["top"]);
    assert.equal(image.image.width, 8);
    assert.equal(image.image.height, 10);
    assert.deepEqual(image.image.outputConstraint, {
        aspectRatio: "4:5",
        normalization: "top_crop",
        sourceWidth: 8,
        sourceHeight: 12,
    });
    assert.equal(metadata.width, 8);
    assert.equal(metadata.height, 10);
});

test("自动跑由 Codex 逐张审图并自动迭代，到达最大轮数后完成", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-auto-run-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const receivedPreferences: number[] = [];
    const receivedMachineReviews: number[] = [];
    const summaryInputs: Array<Parameters<FrameFlowTrajectorySummarizer["summarize"]>[0]> = [];
    let generation = 0;
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async ({ preference, machineReviews }) => {
            receivedPreferences.push(preference.sampleSize);
            receivedMachineReviews.push(machineReviews.length);
            return testPlan;
        } },
        imageGenerator: { generate: async () => {
            const generatedFile = path.join(workspace, `auto-run-${++generation}.png`);
            await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 220, g: 210, b: 200 } } }).png().toFile(generatedFile);
            return [generatedFile];
        } },
        imageReviewer: { review: async ({ images }) => images.map(({ imageId }) => ({
            imageId,
            rating: 4 as const,
            comment: "方向符合，下一轮保留主体并继续探索光线。",
            decision: "vary" as const,
            strengths: ["主体明确"],
            issues: ["光线层次可加强"],
        })) },
        trajectorySummarizer: { summarize: async (input) => {
            summaryInputs.push(input);
            return {
                improved: [{ issue: "主体表达", evidenceIterations: [1, 2], explanation: "第二轮主体更明确。" }],
                recurring: [{ issue: "光线层次", evidenceIterations: [1, 2], recommendation: "下一轮拉开明暗层级。" }],
                bestIteration: 2,
                bestReason: "第二轮在保持主体的同时完成度更高。",
            };
        } },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: {
            subject: "花器", purpose: "审美训练", style: "安静极简", scene: "晨间窗边", aspectRatio: "1:1",
            constraints: { keep: [], avoid: ["文字"] }, referenceImageIds: [], strategy: "balanced", profileId: "default",
        },
        idempotencyKey: "auto-run-brief",
    });
    const created = await core.execute({
        type: "auto_run.create",
        input: { name: "花器风格探索", briefId: brief.resource!.id, count: 1, maxIterations: 2 },
        idempotencyKey: "auto-run-create",
    });
    const first = await core.triggerAutoRun(created.resource!.id, "start");
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "completed");
    const autoRun = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    assert.equal(autoRun.state, "completed");
    assert.equal(autoRun.iteration, 2);
    assert.deepEqual(receivedPreferences, [0, 0]);
    assert.deepEqual(receivedMachineReviews, [0, 1]);
    const dna = await core.query({ type: "preference.dna", briefId: brief.resource!.id });
    assert.equal(dna.sampleSize, 0);
    const queue = await core.query({ type: "review.queue", limit: 20 });
    assert.equal(queue.items.length, 2);
    assert.ok(queue.items.every((item) => item.machineReview?.decision === "vary"));
    const trajectory = await core.query({ type: "auto_run.trajectory", autoRunId: autoRun.id });
    assert.equal(trajectory.autoRun.id, autoRun.id);
    assert.equal(trajectory.brief.id, brief.resource!.id);
    assert.deepEqual(trajectory.rounds.map((round) => round.iteration), [1, 2]);
    assert.deepEqual(trajectory.rounds.map((round) => round.prompt.revision), [1, 2]);
    assert.ok(trajectory.rounds.every((round) => round.images.length === 1));
    assert.ok(trajectory.rounds.every((round) => round.images[0]?.machineReview?.decision === "vary"));
    await waitFor(async () => Boolean((await core.query({ type: "auto_run.trajectory", autoRunId: autoRun.id })).summary));
    const summarized = await core.query({ type: "auto_run.trajectory", autoRunId: autoRun.id });
    assert.equal(summaryInputs.length, 1);
    assert.deepEqual(summaryInputs[0]!.rounds.map((round) => round.iteration), [1, 2]);
    assert.equal(summarized.summary?.throughIteration, 2);
    assert.equal(summarized.summary?.bestIteration, 2);
    assert.deepEqual(summarized.summary?.recurring[0]?.evidenceIterations, [1, 2]);
    assert.equal((await core.query({ type: "preference.dna", briefId: brief.resource!.id })).sampleSize, 0);
    const restarted = new FrameFlowCore(workspace);
    const restored = (await restarted.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    assert.equal(restored.state, "completed");
    assert.equal(restored.iteration, 2);
    assert.equal((await restarted.query({ type: "auto_run.trajectory", autoRunId: autoRun.id })).summary?.bestIteration, 2);
});

test("机器审图失败后可在原自动跑恢复，且保留已生成批次", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-auto-run-review-recovery-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "review-recovery.png");
    await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 220, g: 210, b: 200 } } }).png().toFile(generatedFile);
    let reviewAttempts = 0;
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => [generatedFile] },
        imageReviewer: { review: async ({ images }) => {
            reviewAttempts += 1;
            if (reviewAttempts === 1) throw new Error("审图 Provider 暂时不可用");
            return images.map(({ imageId }) => ({ imageId, rating: 4 as const, comment: "恢复后仅补充缺失审图。", decision: "vary" as const, strengths: ["主体明确"], issues: [] }));
        } },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: { subject: "机器审图恢复", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", profileId: "default" },
        idempotencyKey: "review-recovery-brief",
    });
    const created = await core.execute({
        type: "auto_run.create",
        input: { name: "机器审图恢复", briefId: brief.resource!.id, count: 1, maxIterations: 1 },
        idempotencyKey: "review-recovery-auto-run",
    });

    await core.triggerAutoRun(created.resource!.id, "start");
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "failed");
    const failed = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    const firstRun = await core.query({ type: "run.detail", runId: failed.currentRunId! });
    assert.equal(firstRun.run.status, "succeeded");
    assert.equal(firstRun.run.imageIds.length, 1);
    assert.equal((await core.query({ type: "review.queue", limit: 20 })).items[0]?.machineReview, undefined);

    await core.triggerAutoRun(created.resource!.id, "start");
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "completed");
    const recovered = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    const recoveredRun = await core.query({ type: "run.detail", runId: recovered.currentRunId! });
    const reviewed = await core.query({ type: "review.queue", limit: 20 });
    assert.equal(reviewAttempts, 2);
    assert.equal(recovered.currentRunId, failed.currentRunId);
    assert.equal(recoveredRun.run.imageIds.length, 1);
    assert.equal(reviewed.items[0]?.machineReview?.decision, "vary");
});

test("完成态的 vary 机器审图可在原血缘上继续探索一轮", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-auto-run-extend-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const receivedMachineReviews: number[] = [];
    let generation = 0;
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async ({ machineReviews }) => {
            receivedMachineReviews.push(machineReviews.length);
            return testPlan;
        } },
        imageGenerator: { generate: async () => {
            const generatedFile = path.join(workspace, `auto-run-extend-${++generation}.png`);
            await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 210, g: 215, b: 220 } } }).png().toFile(generatedFile);
            return [generatedFile];
        } },
        imageReviewer: { review: async ({ images }) => images.map(({ imageId }) => ({
            imageId,
            rating: 4 as const,
            comment: "继续沿当前方向做一轮受控变化。",
            decision: "vary" as const,
            strengths: ["方向稳定"],
            issues: ["仍可继续探索"],
        })) },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: {
            subject: "玻璃与折纸静物", purpose: "审美训练", aspectRatio: "1:1",
            constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", profileId: "default",
        },
        idempotencyKey: "auto-run-extend-brief",
    });
    const created = await core.execute({
        type: "auto_run.create",
        input: { name: "继续探索测试", briefId: brief.resource!.id, count: 1, maxIterations: 2 },
        idempotencyKey: "auto-run-extend-create",
    });
    await core.triggerAutoRun(created.resource!.id, "start");
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "completed");

    const completed = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    assert.equal(completed.canContinueExploration, true);
    await core.execute({ type: "auto_run.extend", autoRunId: completed.id, additionalIterations: 1, idempotencyKey: "auto-run-extend-once" });
    await waitFor(async () => {
        const current = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0];
        return current?.state === "completed" && current.iteration === 3;
    });

    const extended = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    assert.equal(extended.id, completed.id);
    assert.equal(extended.maxIterations, 3);
    assert.equal(extended.canContinueExploration, true);
    assert.deepEqual(receivedMachineReviews, [0, 1, 2]);
    const queue = await core.query({ type: "review.queue", limit: 20 });
    assert.equal(queue.items.length, 3);
    const history = await core.query({ type: "event.history", subjectId: completed.id, limit: 200 });
    assert.ok(history.events.some((event) => event.type === "auto_run.extended"));
    const restarted = new FrameFlowCore(workspace);
    const restored = (await restarted.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    assert.equal(restored.id, completed.id);
    assert.equal(restored.state, "completed");
    assert.equal(restored.iteration, 3);
    assert.equal(restored.maxIterations, 3);
    assert.equal(restored.canContinueExploration, true);
});

test("完成态没有 vary 机器审图时不可继续探索", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-auto-run-no-extend-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "auto-run-keep.png");
    await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 205, b: 210 } } }).png().toFile(generatedFile);
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => [generatedFile] },
        imageReviewer: { review: async ({ images }) => images.map(({ imageId }) => ({
            imageId, rating: 5 as const, comment: "方向已经稳定。", decision: "keep" as const, strengths: ["完成"], issues: [],
        })) },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: { subject: "稳定方向", purpose: "审美训练", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "stable", profileId: "default" },
        idempotencyKey: "auto-run-no-extend-brief",
    });
    const created = await core.execute({
        type: "auto_run.create",
        input: { name: "无需继续探索", briefId: brief.resource!.id, count: 1, maxIterations: 1 },
        idempotencyKey: "auto-run-no-extend-create",
    });
    await core.triggerAutoRun(created.resource!.id, "start");
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "completed");

    const completed = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    assert.equal(completed.canContinueExploration, false);
    await assert.rejects(
        core.execute({ type: "auto_run.extend", autoRunId: completed.id, additionalIterations: 1, idempotencyKey: "auto-run-no-extend" }),
        /没有可继续探索的 vary 机器审图/,
    );
});

test("机器审图期间停止会保留结果但不会自动启动下一轮", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-auto-run-stop-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "stop-review.png");
    await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 180, g: 170, b: 160 } } }).png().toFile(generatedFile);
    let finishReview!: () => void;
    const reviewGate = new Promise<void>((resolve) => { finishReview = resolve; });
    let generationCount = 0;
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => { generationCount += 1; return [generatedFile]; } },
        imageReviewer: { review: async ({ images }) => {
            await reviewGate;
            return images.map(({ imageId }) => ({ imageId, rating: 3 as const, comment: "记录机器审图，但暂停后不续跑。", decision: "vary" as const, strengths: [], issues: ["继续观察"] }));
        } },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: { subject: "暂停测试", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", profileId: "default" },
        idempotencyKey: "auto-stop-brief",
    });
    const created = await core.execute({
        type: "auto_run.create",
        input: { name: "暂停测试", briefId: brief.resource!.id, count: 1, maxIterations: 2 },
        idempotencyKey: "auto-stop-create",
    });
    await core.triggerAutoRun(created.resource!.id, "start");
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "reviewing");
    await core.execute({ type: "auto_run.stop", autoRunId: created.resource!.id, idempotencyKey: "auto-stop" });
    finishReview();
    await waitFor(async () => (await core.query({ type: "review.queue", limit: 20 })).items[0]?.machineReview?.rating === 3);

    const stopped = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    const history = await core.query({ type: "event.history", subjectId: created.resource!.id, limit: 20 });
    const paused = history.events.find((event) => event.type === "auto_run.paused");
    assert.equal(stopped.state, "paused");
    assert.equal(paused?.reason, "user_requested");
    assert.equal(stopped.iteration, 1);
    assert.equal(generationCount, 1);
});

test("ImageGen 期间停止仍保存当前图片与机器审图，但不启动下一轮", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-auto-run-generation-stop-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "stop-generation.png");
    await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 205, g: 200, b: 195 } } }).png().toFile(generatedFile);
    let finishGeneration!: () => void;
    const generationGate = new Promise<void>((resolve) => { finishGeneration = resolve; });
    let generationCount = 0;
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => {
            generationCount += 1;
            await generationGate;
            return [generatedFile];
        } },
        imageReviewer: { review: async ({ images }) => images.map(({ imageId }) => ({
            imageId,
            rating: 4 as const,
            comment: "停止后仍完成当前图片的机器审图，但不进入下一轮。",
            decision: "vary" as const,
            strengths: ["当前结果已保留"],
            issues: ["自动跑已经停止"],
        })) },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: { subject: "生成中停止测试", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", profileId: "default" },
        idempotencyKey: "generation-stop-brief",
    });
    const created = await core.execute({
        type: "auto_run.create",
        input: { name: "生成中停止测试", briefId: brief.resource!.id, count: 1, maxIterations: 2 },
        idempotencyKey: "generation-stop-create",
    });

    await core.triggerAutoRun(created.resource!.id, "start");
    await waitFor(async () => {
        const item = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0];
        return item?.state === "generating" && Boolean(item.currentRunId) && generationCount === 1;
    });
    await core.execute({ type: "auto_run.stop", autoRunId: created.resource!.id, idempotencyKey: "generation-stop" });
    finishGeneration();
    await waitFor(async () => (await core.query({ type: "review.queue", limit: 20 })).items[0]?.machineReview?.rating === 4);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const stopped = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    const run = await core.query({ type: "run.detail", runId: stopped.lastRunId! });
    const queue = await core.query({ type: "review.queue", limit: 20 });
    assert.equal(stopped.state, "paused");
    assert.equal(stopped.iteration, 1);
    assert.equal(generationCount, 1);
    assert.equal(run.run.status, "succeeded");
    assert.equal(run.run.imageIds.length, 1);
    assert.equal(queue.items[0]?.machineReview?.decision, "vary");
});

test("Codex 规划期间启动立即返回，停止后不会进入 ImageGen", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-auto-run-planning-stop-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    let finishPlanning!: () => void;
    const planningGate = new Promise<void>((resolve) => { finishPlanning = resolve; });
    let generationCount = 0;
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => { await planningGate; return testPlan; } },
        imageGenerator: { generate: async () => { generationCount += 1; return []; } },
        imageReviewer: { review: async () => [] },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: { subject: "规划停止测试", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced", profileId: "default" },
        idempotencyKey: "planning-stop-brief",
    });
    const created = await core.execute({
        type: "auto_run.create",
        input: { name: "规划停止测试", briefId: brief.resource!.id, count: 1, maxIterations: 2 },
        idempotencyKey: "planning-stop-create",
    });

    const started = await core.triggerAutoRun(created.resource!.id, "start");
    assert.deepEqual(started.resource, { type: "auto_run", id: created.resource!.id });
    const planning = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    assert.equal(planning.state, "generating");
    assert.equal(planning.currentRunId, undefined);
    assert.ok(planning.lastStartedAt);

    await core.execute({ type: "auto_run.stop", autoRunId: created.resource!.id, idempotencyKey: "planning-stop" });
    finishPlanning();
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "paused");

    const stopped = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]!;
    assert.equal(stopped.state, "paused");
    assert.equal(stopped.iteration, 0);
    assert.equal(generationCount, 0);
    assert.equal((await core.query({ type: "run.list", limit: 20 })).runs.length, 0);
});

test("ImageGen 全失败时仍持久化可追溯的失败 Run 和 slot", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => { throw new Error("provider unavailable at C:\\secret\\job"); } },
    });
    const promptVersionId = await approvedPrompt(core, "failed-run");

    const started = await core.execute({ type: "run.start", promptVersionId, count: 2, idempotencyKey: "failed-run-start" });
    const detail = await waitRunTerminal(core, started.resource!.id);

    assert.equal(detail.run.status, "failed");
    assert.equal(detail.run.imageIds.length, 0);
    assert.equal(detail.slots.length, 2);
    assert.ok(detail.slots.every((slot) => slot.status === "failed" && slot.attempts === 1));
    assert.ok(detail.slots.every((slot) => slot.error?.code === "IMAGEGEN_FAILED"));
    assert.ok(detail.slots.every((slot) => !slot.error?.message.includes("C:\\secret")));
    assert.equal((await core.query({ type: "workspace.summary" })).sequence, 5);

    const restarted = new FrameFlowCore(workspace);
    assert.deepEqual(await restarted.query({ type: "run.detail", runId: detail.run.id }), detail);
});

test("ImageGen 少返回图片时登记部分成功并标记缺失 slot", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "generated.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => [generatedFile] },
    });
    const promptVersionId = await approvedPrompt(core, "partial-run");

    const started = await core.execute({ type: "run.start", promptVersionId, count: 2, idempotencyKey: "partial-run-start" });
    const detail = await waitRunTerminal(core, started.resource!.id);

    assert.equal(detail.run.status, "partially_succeeded");
    assert.equal(detail.run.imageIds.length, 1);
    assert.deepEqual(detail.slots.map((slot) => slot.status), ["succeeded", "failed"]);
    assert.equal(detail.slots[0]?.attempts, 1);
    assert.equal(detail.slots[1]?.attempts, 1);
    assert.equal(detail.slots[1]?.error?.code, "IMAGEGEN_MISSING_RESULT");
});

test("run.retry 只重跑指定的失败 slot 并保留原成功图片", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "generated.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    const requestedCounts: number[] = [];
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async ({ count }) => {
            requestedCounts.push(count);
            return requestedCounts.length === 1 ? [generatedFile] : [generatedFile];
        } },
    });
    const promptVersionId = await approvedPrompt(core, "retry-run");
    const started = await core.execute({ type: "run.start", promptVersionId, count: 2, idempotencyKey: "retry-run-start" });
    const before = await waitRunTerminal(core, started.resource!.id);
    const failedSlot = before.slots.find((slot) => slot.status === "failed")!;
    const originalImageId = before.run.imageIds[0]!;

    const retried = await core.execute({ type: "run.retry", runId: before.run.id, failedSlotIds: [failedSlot.id], idempotencyKey: "retry-run-slot" });
    const after = await waitRunTerminal(core, before.run.id);

    assert.deepEqual(requestedCounts, [2, 1]);
    assert.deepEqual(retried.resource, { type: "run", id: before.run.id });
    assert.equal(after.run.status, "succeeded");
    assert.equal(after.run.imageIds.length, 2);
    assert.ok(after.run.imageIds.includes(originalImageId));
    assert.equal(after.slots.find((slot) => slot.id === failedSlot.id)?.status, "succeeded");
    assert.equal(after.slots.find((slot) => slot.id === failedSlot.id)?.attempts, 2);
});

test("运行列表按最新批次优先返回可查询的 Run", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "generated.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    let attempt = 0;
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => ++attempt === 1 ? Promise.reject(new Error("temporary failure")) : [generatedFile] },
    });
    const promptVersionId = await approvedPrompt(core, "run-list");
    const failed = await core.execute({ type: "run.start", promptVersionId, count: 1, idempotencyKey: "run-list-failed" });
    await waitRunTerminal(core, failed.resource!.id);
    const succeeded = await core.execute({ type: "run.start", promptVersionId, count: 1, idempotencyKey: "run-list-succeeded" });
    await waitRunTerminal(core, succeeded.resource!.id);

    const list = await core.query({ type: "run.list", limit: 20 });

    assert.deepEqual(list.runs.map((run) => run.id), [succeeded.resource!.id, failed.resource!.id]);
    assert.deepEqual(list.runs.map((run) => run.status), ["succeeded", "failed"]);
});

test("已批准 Prompt 通过 ImageGen 生成并登记真实 PNG 血缘", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "generated.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    const core = new FrameFlowCore(workspace, {
        planner: {
            plan: async () => ({
                fields: {
                    subject: ["ceramic vase"], composition: ["centered product shot"], color: ["warm white"], lighting: ["softbox lighting"],
                    material: ["matte ceramic"], layout: ["single object"], mood: ["calm"], rendering: ["photorealistic"],
                    technical: ["1:1"], negative: ["text", "watermark"],
                },
                compiledPrompt: "A matte ceramic vase, centered product shot, softbox lighting, warm white background.",
                reason: "保持单一主体并减少构图变量。",
            }),
        },
        imageGenerator: { generate: async () => [generatedFile] },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: {
            subject: "陶瓷花瓶",
            purpose: "电商主图",
            aspectRatio: "1:1",
            constraints: { keep: ["哑光陶瓷"], avoid: ["文字"] },
            referenceImageIds: [],
            strategy: "stable",
            profileId: "default",
        },
        idempotencyKey: "run-brief",
    });
    const prompt = await core.execute({ type: "round.plan", briefId: brief.resource!.id, strategy: "stable", idempotencyKey: "run-plan" });
    await core.execute({ type: "prompt.approve", promptVersionId: prompt.resource!.id, locks: {}, idempotencyKey: "run-approve" });

    const started = await core.execute({ type: "run.start", promptVersionId: prompt.resource!.id, count: 1, idempotencyKey: "run-start" });
    assert.equal(started.resource?.type, "run");
    const run = await waitRunTerminal(core, started.resource!.id);
    assert.equal(run.run.status, "succeeded");
    assert.equal(run.run.imageIds.length, 1);

    const image = await core.query({ type: "image.detail", imageId: run.run.imageIds[0]! });
    assert.equal(image.image.runId, run.run.id);
    assert.equal(image.image.promptVersionId, prompt.resource!.id);
    assert.equal(image.image.file.mimeType, "image/png");
    assert.equal(image.image.width, 1);
    assert.equal(image.image.height, 1);
    assert.match(image.image.file.sha256, /^[a-f0-9]{64}$/);
    const content = await core.readImageContent(image.image.id);
    assert.equal(content.mimeType, "image/png");
    assert.equal(content.etag, image.image.file.sha256);
    assert.equal(content.data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

    const restarted = new FrameFlowCore(workspace);
    assert.deepEqual(await restarted.query({ type: "run.detail", runId: run.run.id }), run);
    assert.deepEqual(await restarted.query({ type: "image.detail", imageId: image.image.id }), image);
});

test("生成图片可在公开待审队列中完成评分、评论、隐藏和恢复", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-review-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "generated.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async ({ count }) => Array.from({ length: count }, () => generatedFile) },
    });
    const promptVersionId = await approvedPrompt(core, "review-queue");
    const run = await core.execute({ type: "run.start", promptVersionId, count: 2, idempotencyKey: "review-queue-run" });
    await waitRunTerminal(core, run.resource!.id);

    const initial = await core.query({ type: "review.queue", limit: 20 });
    assert.equal(initial.items.length, 2);
    assert.ok(initial.items.every((item) => item.image.status === "pending_review" && !item.feedback.rating && !item.feedback.hiddenReason));
    const imageId = initial.items[0]!.image.id;

    await core.execute({ type: "feedback.append", imageId, feedback: { kind: "rating", rating: 5 }, idempotencyKey: "review-rating" });
    await core.execute({ type: "feedback.append", imageId, feedback: { kind: "comment", comment: "喜欢自然材质和克制留白" }, idempotencyKey: "review-comment" });
    const reviewed = await core.query({ type: "review.queue", limit: 20 });
    assert.deepEqual(reviewed.items.find((item) => item.image.id === imageId)?.feedback, {
        rating: 5,
        comment: "喜欢自然材质和克制留白",
    });
    assert.equal(reviewed.items.find((item) => item.image.id === imageId)?.image.status, "reviewed");

    await core.execute({ type: "feedback.append", imageId, feedback: { kind: "soft_delete", reason: "aesthetic_dislike" }, idempotencyKey: "review-hide" });
    const hidden = await core.query({ type: "review.queue", limit: 20 });
    assert.equal(hidden.items.find((item) => item.image.id === imageId)?.feedback.hiddenReason, "aesthetic_dislike");
    assert.equal(hidden.items.find((item) => item.image.id === imageId)?.image.status, "hidden");

    await core.execute({ type: "feedback.append", imageId, feedback: { kind: "restore" }, idempotencyKey: "review-restore" });
    const restored = await new FrameFlowCore(workspace).query({ type: "review.queue", limit: 20 });
    assert.equal(restored.items.find((item) => item.image.id === imageId)?.image.status, "restored");
    assert.equal(restored.items.find((item) => item.image.id === imageId)?.feedback.hiddenReason, undefined);

    await core.execute({ type: "image.delete", imageId, idempotencyKey: "review-delete-without-learning" });
    const deletedCore = new FrameFlowCore(workspace);
    const afterDelete = await deletedCore.query({ type: "review.queue", limit: 20 });
    assert.equal(afterDelete.items.some((item) => item.image.id === imageId), false);
    assert.equal((await deletedCore.query({ type: "image.detail", imageId })).image.status, "permanently_deleted");
    assert.deepEqual(await deletedCore.query({ type: "preference.dna", briefId: initial.items[0]!.briefId }), {
        type: "preference.dna",
        briefId: initial.items[0]!.briefId,
        totalWeight: 0,
        sampleSize: 0,
        boost: [],
        avoid: [],
        qualityRejections: 0,
    });
});

test("取消运行会立即生效并把迟到的生成文件移入 quarantine", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-cancel-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "late-generated.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    let releaseGeneration!: () => void;
    let signalAborted = false;
    const generationGate = new Promise<void>((resolve) => releaseGeneration = resolve);
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async ({ signal }) => { signal.addEventListener("abort", () => signalAborted = true, { once: true }); await generationGate; return [generatedFile]; } },
    });
    const promptVersionId = await approvedPrompt(core, "cancel-run");
    let started;
    try {
        started = await Promise.race([
            core.execute({ type: "run.start", promptVersionId, count: 1, idempotencyKey: "cancel-run-start" }),
            new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("run.start 没有立即返回")), 250)),
        ]);
    } finally {
        if (!started) releaseGeneration();
    }
    const runId = started.resource!.id;
    assert.equal((await core.query({ type: "run.detail", runId })).run.status, "running");

    await core.execute({ type: "run.cancel", runId, idempotencyKey: "cancel-run-now" });
    assert.equal(signalAborted, true);
    releaseGeneration();
    await waitFor(async () => (await core.query({ type: "run.detail", runId })).run.status === "cancelled");

    const detail = await core.query({ type: "run.detail", runId });
    assert.equal(detail.run.status, "cancelled");
    assert.deepEqual(detail.run.imageIds, []);
    assert.equal(detail.slots[0]?.status, "cancelled");
    const quarantine = await core.query({ type: "quarantine.list", limit: 20 });
    assert.equal(quarantine.items.length, 1);
    assert.equal(quarantine.items[0]?.reason, "generation_cancelled");
    assert.equal(quarantine.items[0]?.runId, runId);
    assert.equal(quarantine.items[0]?.bytes, 68);
});

test("重试运行也可取消且不会覆盖原成功图片", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-retry-cancel-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "retry-late.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    let attempt = 0;
    let releaseRetry!: () => void;
    const retryGate = new Promise<void>((resolve) => releaseRetry = resolve);
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => ++attempt === 1 ? [] : (await retryGate, [generatedFile]) },
    });
    const promptVersionId = await approvedPrompt(core, "retry-cancel");
    const started = await core.execute({ type: "run.start", promptVersionId, count: 1, idempotencyKey: "retry-cancel-start" });
    const failed = await waitRunTerminal(core, started.resource!.id);
    const slotId = failed.slots[0]!.id;

    await core.execute({ type: "run.retry", runId: failed.run.id, failedSlotIds: [slotId], idempotencyKey: "retry-cancel-retry" });
    assert.equal((await core.query({ type: "run.detail", runId: failed.run.id })).run.status, "retrying");
    await core.execute({ type: "run.cancel", runId: failed.run.id, idempotencyKey: "retry-cancel-now" });
    releaseRetry();
    await waitFor(async () => (await core.query({ type: "quarantine.list", limit: 20 })).items.length === 1);

    const cancelled = await core.query({ type: "run.detail", runId: failed.run.id });
    assert.equal(cancelled.run.status, "cancelled");
    assert.deepEqual(cancelled.run.imageIds, []);
    assert.equal(cancelled.slots[0]?.status, "cancelled");
});

test("重启时把未被事件血缘引用的 managed 文件移入 quarantine", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-orphan-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    await new FrameFlowCore(workspace).query({ type: "workspace.summary" });
    const orphan = path.join(workspace, ".infinite-canvas", "frameflow", "assets", "originals", "orphan.png");
    const referenceOrphan = path.join(workspace, ".infinite-canvas", "frameflow", "assets", "references", "orphan-reference.png");
    await fs.mkdir(path.dirname(orphan), { recursive: true });
    await fs.mkdir(path.dirname(referenceOrphan), { recursive: true });
    await fs.writeFile(orphan, Buffer.from("orphan-file"));
    await fs.writeFile(referenceOrphan, Buffer.from("orphan-reference-file"));

    const restarted = new FrameFlowCore(workspace);
    const quarantine = await restarted.query({ type: "quarantine.list", limit: 20 });
    assert.equal(quarantine.items.length, 2);
    assert(quarantine.items.every((item) => item.reason === "orphan_recovery"));
    await assert.rejects(fs.access(orphan));
    await assert.rejects(fs.access(referenceOrphan));
});

test("Codex Planner 只在同一 Creative Brief 内继承人工偏好证据", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-preference-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "generated.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    const plannerInputs: Array<Parameters<FrameFlowPromptPlanner["plan"]>[0]> = [];
    const core = new FrameFlowCore(workspace, {
        planner: {
            plan: async (input) => {
                plannerInputs.push(input);
                if (!input.preference.sampleSize) return testPlan;
                return {
                    ...testPlan,
                    decision: {
                        summary: "逐条处置本轮可用审美证据。",
                        evidence: [
                            ...input.preference.boost.map((evidence) => ({ imageId: evidence.imageId, disposition: "adopted" as const, affectedFields: ["lighting" as const, "material" as const], reason: "延续五星样本的光线和材质。" })),
                            ...input.preference.avoid.map((evidence) => ({ imageId: evidence.imageId, disposition: "avoided" as const, affectedFields: ["composition" as const], reason: "规避审美删除样本的构图。" })),
                        ],
                    },
                };
            },
        },
        imageGenerator: { generate: async ({ count }) => Array.from({ length: count }, () => generatedFile) },
    });
    const promptVersionId = await approvedPrompt(core, "preference-source");
    const sourceRun = await core.execute({ type: "run.start", promptVersionId, count: 2, idempotencyKey: "preference-source-run" });
    await waitRunTerminal(core, sourceRun.resource!.id);
    const queue = await core.query({ type: "review.queue", limit: 20 });
    const likedId = queue.items[0]!.image.id;
    const dislikedId = queue.items[1]!.image.id;
    const likedRating = await core.execute({ type: "feedback.append", imageId: likedId, feedback: { kind: "rating", rating: 5 }, idempotencyKey: "preference-liked" });
    const likedComment = await core.execute({ type: "feedback.append", imageId: likedId, feedback: { kind: "comment", comment: "保留哑光材质和柔和光线" }, idempotencyKey: "preference-liked-comment" });
    const dislikedComment = await core.execute({ type: "feedback.append", imageId: dislikedId, feedback: { kind: "comment", comment: "构图太居中，缺少呼吸感" }, idempotencyKey: "preference-disliked-comment" });
    const dislikedDelete = await core.execute({ type: "feedback.append", imageId: dislikedId, feedback: { kind: "soft_delete", reason: "aesthetic_dislike" }, idempotencyKey: "preference-disliked" });

    const sourceBriefId = (await core.query({ type: "prompt.lineage", promptVersionId })).versions[0]!.briefId;
    await core.execute({ type: "round.plan", briefId: sourceBriefId, strategy: "balanced", idempotencyKey: "preference-same-brief-next-plan" });

    const nextBrief = await core.execute({
        type: "brief.create",
        input: {
            subject: "玻璃花瓶",
            purpose: "新品视觉",
            aspectRatio: "4:5",
            constraints: { keep: [], avoid: [] },
            referenceImageIds: [],
            strategy: "balanced",
            profileId: "default",
        },
        idempotencyKey: "preference-next-brief",
    });
    await core.execute({ type: "round.plan", briefId: nextBrief.resource!.id, strategy: "balanced", idempotencyKey: "preference-next-plan" });

    assert.equal(plannerInputs.length, 3);
    assert.equal(plannerInputs[0]!.preference.sampleSize, 0);
    assert.deepEqual(plannerInputs[1]!.preference.boost[0], {
        imageId: likedId,
        sourceEventIds: [likedRating.eventIds[0], likedComment.eventIds[0]],
        weight: 3,
        rating: 5,
        comment: "保留哑光材质和柔和光线",
        promptVersionId,
        fields: testPlan.fields,
    });
    assert.deepEqual(plannerInputs[1]!.preference.avoid[0], {
        imageId: dislikedId,
        sourceEventIds: [dislikedDelete.eventIds[0], dislikedComment.eventIds[0]],
        weight: -4,
        comment: "构图太居中，缺少呼吸感",
        promptVersionId,
        fields: testPlan.fields,
    });
    assert.equal(plannerInputs[2]!.preference.sampleSize, 0);
    assert.deepEqual(plannerInputs[2]!.preference.boost, []);
    assert.deepEqual(plannerInputs[2]!.preference.avoid, []);
});

test("每轮规划会持久化证据处置并生成可重放的 Prompt Diff", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-decision-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "generated.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    const nextPlan = {
        ...testPlan,
        fields: {
            ...testPlan.fields,
            composition: ["editorial asymmetry", "negative space"],
            lighting: ["soft morning light"],
        },
        compiledPrompt: "A matte ceramic vase, editorial asymmetry, negative space, soft morning light.",
        reason: "采用五星样本的柔和光线，并规避被删除样本的居中构图。",
    };
    const core = new FrameFlowCore(workspace, {
        planner: {
            plan: async (input) => input.preference.sampleSize === 0 ? testPlan : {
                ...nextPlan,
                decision: {
                    summary: "采用五星样本的光线与材质；规避审美删除样本的居中构图。",
                    evidence: [
                        { imageId: input.preference.boost[0]!.imageId, disposition: "adopted" as const, affectedFields: ["lighting" as const, "material" as const], reason: "五星与 Comment 明确要求延续柔和光线和哑光材质。" },
                        { imageId: input.preference.avoid[0]!.imageId, disposition: "avoided" as const, affectedFields: ["composition" as const], reason: "审美删除与 Comment 明确反对居中构图。" },
                    ],
                },
            },
        },
        imageGenerator: { generate: async ({ count }) => Array.from({ length: count }, () => generatedFile) },
    });

    const sourcePromptId = await approvedPrompt(core, "decision-source");
    const sourceRun = await core.execute({ type: "run.start", promptVersionId: sourcePromptId, count: 2, idempotencyKey: "decision-source-run" });
    await waitRunTerminal(core, sourceRun.resource!.id);
    const queue = await core.query({ type: "review.queue", limit: 20 });
    const likedId = queue.items[0]!.image.id;
    const dislikedId = queue.items[1]!.image.id;
    const likedRating = await core.execute({ type: "feedback.append", imageId: likedId, feedback: { kind: "rating", rating: 5 }, idempotencyKey: "decision-liked-rating" });
    const likedComment = await core.execute({ type: "feedback.append", imageId: likedId, feedback: { kind: "comment", comment: "保留哑光材质和柔和光线" }, idempotencyKey: "decision-liked-comment" });
    const dislikedComment = await core.execute({ type: "feedback.append", imageId: dislikedId, feedback: { kind: "comment", comment: "构图太居中，缺少呼吸感" }, idempotencyKey: "decision-disliked-comment" });
    const dislikedDelete = await core.execute({ type: "feedback.append", imageId: dislikedId, feedback: { kind: "soft_delete", reason: "aesthetic_dislike" }, idempotencyKey: "decision-disliked-delete" });

    const sourceBriefId = (await core.query({ type: "prompt.lineage", promptVersionId: sourcePromptId })).versions[0]!.briefId;
    assert.equal((await core.query({ type: "preference.dna", briefId: sourceBriefId })).sampleSize, 2);
    const planned = await core.execute({ type: "round.plan", briefId: sourceBriefId, strategy: "balanced", idempotencyKey: "decision-next-plan" });
    const lineage = await core.query({ type: "prompt.lineage", promptVersionId: planned.resource!.id });
    const prompt = lineage.versions.at(-1)!;
    const decision = lineage.decisions.find((item) => item.promptVersionId === prompt.id)!;

    assert.equal(prompt.decisionId, decision.id);
    assert.equal(decision.promptVersionId, prompt.id);
    assert.equal(decision.summary, "采用五星样本的光线与材质；规避审美删除样本的居中构图。");
    assert.deepEqual(decision.evidence[0], {
        imageId: likedId,
        sourceEventIds: [likedRating.eventIds[0], likedComment.eventIds[0]],
        weight: 3,
        rating: 5,
        comment: "保留哑光材质和柔和光线",
        sourcePromptVersionId: sourcePromptId,
        disposition: "adopted",
        affectedFields: ["lighting", "material"],
        reason: "五星与 Comment 明确要求延续柔和光线和哑光材质。",
    });
    assert.deepEqual(decision.evidence[1], {
        imageId: dislikedId,
        sourceEventIds: [dislikedDelete.eventIds[0], dislikedComment.eventIds[0]],
        weight: -4,
        comment: "构图太居中，缺少呼吸感",
        sourcePromptVersionId: sourcePromptId,
        disposition: "avoided",
        affectedFields: ["composition"],
        reason: "审美删除与 Comment 明确反对居中构图。",
    });
    assert.deepEqual(prompt.diff.change.find((change) => change.field === "lighting")?.evidenceImageIds, [likedId]);
    assert.deepEqual(prompt.diff.change.find((change) => change.field === "lighting")?.evidenceEventIds, [likedRating.eventIds[0], likedComment.eventIds[0]]);
    assert.deepEqual(prompt.diff.avoid.find((change) => change.field === "composition"), {
        field: "composition",
        before: testPlan.fields.composition,
        after: nextPlan.fields.composition,
        reason: "审美删除与 Comment 明确反对居中构图。",
        evidenceEventIds: [dislikedDelete.eventIds[0], dislikedComment.eventIds[0]],
        evidenceImageIds: [dislikedId],
    });
    assert.equal((await core.query({ type: "workspace.summary" })).decisions, 2);
    assert.deepEqual(await new FrameFlowCore(workspace).query({ type: "prompt.lineage", promptVersionId: prompt.id }), lineage);
});

test("Codex 规划成功后创建可追溯的 Prompt Version", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace, {
        planner: {
            plan: async () => ({
                fields: {
                    subject: ["modern hotel lobby"],
                    composition: ["wide symmetrical composition"],
                    color: ["warm ivory and walnut"],
                    lighting: ["soft daylight"],
                    material: ["travertine", "walnut"],
                    layout: ["open reception area"],
                    mood: ["quiet luxury"],
                    rendering: ["photorealistic architectural visualization"],
                    technical: ["16:9", "high detail"],
                    negative: ["people", "text", "distortion"],
                },
                compiledPrompt: "Modern hotel lobby, wide symmetrical composition, warm ivory and walnut, soft daylight.",
                reason: "根据稳定策略保留空间主体并控制探索幅度。",
            }),
        },
    });
    const reference = await importTestReference(core, "reference-a", "import-reference-a");
    const brief = await core.execute({
        type: "brief.create",
        input: {
            subject: "现代酒店大堂",
            purpose: "提案效果图",
            aspectRatio: "16:9",
            constraints: { keep: ["挑空"], avoid: ["人物"] },
            referenceImageIds: [reference.id],
            strategy: "stable",
            profileId: "default",
        },
        idempotencyKey: "brief-for-prompt",
    });

    const planned = await core.execute({
        type: "round.plan",
        briefId: brief.resource!.id,
        strategy: "stable",
        idempotencyKey: "plan-prompt-v1",
    });
    assert.equal(planned.resource?.type, "prompt_version");

    const lineage = await core.query({ type: "prompt.lineage", promptVersionId: planned.resource!.id });
    assert.equal(lineage.versions.length, 1);
    assert.equal(lineage.versions[0]?.status, "draft");
    assert.equal(lineage.versions[0]?.revision, 1);
    assert.deepEqual(lineage.versions[0]?.referenceImageIds, [reference.id]);
    assert.deepEqual(lineage.versions[0]?.fields.negative, ["people", "text", "distortion"]);
    assert.equal((await core.query({ type: "workspace.summary" })).prompts, 1);

    await core.execute({
        type: "prompt.approve",
        promptVersionId: planned.resource!.id,
        locks: { subject: ["modern hotel lobby"], material: ["travertine"] },
        idempotencyKey: "approve-prompt-v1",
    });
    const approved = await core.query({ type: "prompt.lineage", promptVersionId: planned.resource!.id });
    assert.equal(approved.versions[0]?.status, "approved");
    assert.deepEqual(approved.versions[0]?.locks, { subject: ["modern hotel lobby"], material: ["travertine"] });

    const restarted = new FrameFlowCore(workspace);
    assert.deepEqual(await restarted.query({ type: "prompt.lineage", promptVersionId: planned.resource!.id }), approved);
});

test("Codex 返回无效 Prompt 时不写入事实日志", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => ({ fields: {}, compiledPrompt: "", reason: "" }) as never },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: {
            subject: "产品静物",
            purpose: "电商主图",
            aspectRatio: "1:1",
            constraints: { keep: [], avoid: [] },
            referenceImageIds: [],
            strategy: "balanced",
            profileId: "default",
        },
        idempotencyKey: "brief-invalid-plan",
    });

    await assert.rejects(core.execute({
        type: "round.plan",
        briefId: brief.resource!.id,
        strategy: "balanced",
        idempotencyKey: "invalid-plan",
    }));
    assert.equal((await core.query({ type: "workspace.summary" })).sequence, 1);
    assert.equal((await core.query({ type: "workspace.summary" })).prompts, 0);
});

test("创建 Creative Brief 后可查询实体事实与工作区计数", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);
    const reference = await importTestReference(core, "reference-1", "import-reference-1");

    const result = await core.execute({
        type: "brief.create",
        input: {
            subject: "现代客厅",
            purpose: "室内设计提案",
            platform: "小红书",
            style: "侘寂",
            scene: "日间自然光",
            aspectRatio: "4:5",
            constraints: { keep: ["落地窗"], avoid: ["过度装饰"] },
            referenceImageIds: [reference.id],
            strategy: "balanced",
            profileId: "default",
        },
        idempotencyKey: "brief-living-room-v1",
    });

    assert.equal(result.resource?.type, "brief");
    const history = await core.query({ type: "event.history", subjectId: result.resource!.id, limit: 20 });
    assert.equal(history.events.length, 1);
    assert.equal(history.events[0]?.type, "brief.created");
    assert.deepEqual("brief" in history.events[0]! ? history.events[0].brief.constraints : undefined, {
        keep: ["落地窗"],
        avoid: ["过度装饰"],
    });
    assert.equal((await core.query({ type: "workspace.summary" })).briefs, 1);
});

test("Creative Brief 用途可省略或留空并归一化为审美训练用途", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-optional-purpose-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);
    const created = await core.execute({
        type: "brief.create",
        input: {
            subject: "现代原木休闲椅",
            purpose: "   ",
            style: "侘寂",
            scene: "晨间窗边",
            aspectRatio: "4:5",
            constraints: { keep: [], avoid: [] },
            referenceImageIds: [],
            strategy: "balanced",
            profileId: "default",
        },
        idempotencyKey: "brief-optional-purpose",
    });

    const detail = await core.query({ type: "brief.detail", briefId: created.resource!.id });
    assert.equal(detail.brief.purpose, "审美训练与灵感采集");
    assert.deepEqual(await new FrameFlowCore(workspace).query({ type: "brief.detail", briefId: created.resource!.id }), detail);
});

test("创建页可通过公开查询读取已持久化的 Creative Brief", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);
    const created = await core.execute({
        type: "brief.create",
        input: {
            subject: "玻璃香水瓶",
            purpose: "新品视觉",
            style: "极简",
            scene: "晨间窗边",
            aspectRatio: "4:5",
            constraints: { keep: ["透明玻璃"], avoid: ["文字"] },
            referenceImageIds: [],
            strategy: "balanced",
            profileId: "default",
        },
        idempotencyKey: "brief-detail-create",
    });

    const detail = await core.query({ type: "brief.detail", briefId: created.resource!.id });

    assert.equal(detail.brief.id, created.resource!.id);
    assert.equal(detail.brief.style, "极简");
    assert.equal(detail.brief.scene, "晨间窗边");
    assert.deepEqual(detail.brief.constraints, { keep: ["透明玻璃"], avoid: ["文字"] });
    const restarted = new FrameFlowCore(workspace);
    assert.deepEqual(await restarted.query({ type: "brief.detail", briefId: created.resource!.id }), detail);
});

test("修改需求创建同一需求的新 Brief 修订，删除需求只归档且保留历史血缘", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-brief-lifecycle-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const { core, briefId, imageIds } = await generatedReviewFixture(workspace, "brief-lifecycle", 1);
    await core.execute({ type: "feedback.append", imageId: imageIds[0]!, feedback: { kind: "rating", rating: 5 }, idempotencyKey: "brief-lifecycle-rating" });
    const original = (await core.query({ type: "brief.detail", briefId })).brief;
    const sourceAutoRun = await core.execute({
        type: "auto_run.create",
        input: { name: "陶瓷花瓶自动跑", briefId, count: 3, maxIterations: 4 },
        idempotencyKey: "brief-lifecycle-auto-run",
    });

    const revised = await core.execute({
        type: "brief.revise",
        briefId,
        sourceAutoRunId: sourceAutoRun.resource!.id,
        input: {
            subject: "修订后的陶瓷花瓶方向",
            purpose: original.purpose,
            aspectRatio: "4:5",
            constraints: { keep: ["哑光陶瓷"], avoid: ["文字"] },
            referenceImageIds: original.referenceImageIds,
            strategy: "balanced",
        },
        idempotencyKey: "brief-lifecycle-revise",
    });
    const revisedId = revised.resource!.id;
    const revisedDetail = (await core.query({ type: "brief.detail", briefId: revisedId })).brief;
    assert.equal(revisedDetail.requirementId, briefId);
    assert.equal(revisedDetail.revision, 2);
    assert.equal(revisedDetail.supersedesBriefId, briefId);
    assert.equal(revisedDetail.subject, "修订后的陶瓷花瓶方向");
    const superseded = (await core.query({ type: "brief.detail", briefId })).brief;
    assert.ok(superseded.supersededAt);
    assert.equal(superseded.supersededByBriefId, revisedId);
    assert.equal(superseded.archivedAt, undefined);
    assert.deepEqual((await core.query({ type: "brief.list", limit: 20 })).briefs.map((brief) => brief.id), [revisedId]);
    assert.equal((await core.query({ type: "brief.list", limit: 20, includeArchived: true })).briefs.length, 2);
    assert.equal((await core.query({ type: "preference.dna", briefId: revisedId })).sampleSize, 1);
    const replacementAutoRun = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns.find((item) => item.briefId === revisedId);
    assert.equal(replacementAutoRun?.state, "paused");
    assert.equal(replacementAutoRun?.count, 3);
    assert.equal(replacementAutoRun?.maxIterations, 4);
    await assert.rejects(
        core.execute({ type: "round.plan", briefId, strategy: "stable", idempotencyKey: "brief-lifecycle-old-plan" }),
        /已归档或已被新修订取代/,
    );
    await assert.rejects(
        core.execute({ type: "auto_run.create", input: { name: "旧修订任务", briefId, count: 1, maxIterations: 1 }, idempotencyKey: "brief-lifecycle-old-auto-run" }),
        /已归档或已被新修订取代/,
    );
    await assert.rejects(
        core.execute({ type: "auto_run.start", autoRunId: sourceAutoRun.resource!.id, idempotencyKey: "brief-lifecycle-old-start" }),
        /已归档或已被新修订取代/,
    );

    await core.execute({ type: "brief.archive", briefId: revisedId, idempotencyKey: "brief-lifecycle-archive" });
    assert.deepEqual((await core.query({ type: "brief.list", limit: 20 })).briefs, []);
    assert.equal((await core.query({ type: "brief.list", limit: 20, includeArchived: true })).briefs.length, 2);
    assert.ok((await new FrameFlowCore(workspace).query({ type: "brief.detail", briefId: revisedId })).brief.archivedAt);
    const requirementHistory = await core.query({ type: "event.history", subjectId: briefId, limit: 20 });
    assert.deepEqual(requirementHistory.events.filter((event) => event.type.startsWith("brief.")).map((event) => event.type), ["brief.created", "brief.revised", "brief.archived"]);
});

test("归档 Requirement 后活动列表排除全部后代，显式查询仍返回只读血缘", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-requirement-archive-lists-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const { core, briefId } = await generatedReviewFixture(workspace, "requirement-archive-lists", 1);
    const sourceAutoRun = await core.execute({
        type: "auto_run.create",
        input: { name: "旧修订自动跑", briefId, count: 1, maxIterations: 2 },
        idempotencyKey: "requirement-archive-lists-auto-run",
    });
    const original = (await core.query({ type: "brief.detail", briefId })).brief;
    const revised = await core.execute({
        type: "brief.revise",
        briefId,
        sourceAutoRunId: sourceAutoRun.resource!.id,
        input: {
            subject: "当前修订",
            purpose: original.purpose,
            aspectRatio: original.aspectRatio,
            constraints: original.constraints,
            referenceImageIds: original.referenceImageIds,
            strategy: original.strategy,
        },
        idempotencyKey: "requirement-archive-lists-revise",
    });
    await core.execute({ type: "brief.archive", briefId: revised.resource!.id, idempotencyKey: "requirement-archive-lists-archive" });

    assert.deepEqual((await core.query({ type: "brief.list", limit: 20 })).briefs, []);
    assert.deepEqual((await core.query({ type: "auto_run.list", limit: 20 })).autoRuns, []);
    assert.deepEqual((await core.query({ type: "run.list", limit: 20 })).runs, []);
    assert.deepEqual((await core.query({ type: "review.queue", limit: 20 })).items, []);

    const briefs = (await core.query({ type: "brief.list", limit: 20, includeArchived: true })).briefs;
    assert.equal(briefs.length, 2);
    assert.ok(briefs.find((brief) => brief.id === briefId)?.archivedAt);
    assert.ok(briefs.find((brief) => brief.id === revised.resource!.id)?.archivedAt);

    const autoRuns = (await core.query({ type: "auto_run.list", limit: 20, includeArchived: true })).autoRuns;
    assert.equal(autoRuns.length, 2);
    assert.ok(autoRuns.every((autoRun) => autoRun.requirementArchived));
    assert.equal(autoRuns.find((autoRun) => autoRun.briefId === briefId)?.briefSuperseded, true);
    assert.equal(autoRuns.find((autoRun) => autoRun.briefId === revised.resource!.id)?.briefSuperseded, false);
    const trajectory = await core.query({ type: "auto_run.trajectory", autoRunId: autoRuns.find((autoRun) => autoRun.briefId === briefId)!.id });
    assert.equal(trajectory.autoRun.requirementArchived, true);
    assert.equal(trajectory.autoRun.briefSuperseded, true);

    const runs = (await core.query({ type: "run.list", limit: 20, includeArchived: true })).runs;
    assert.equal(runs.length, 1);
    assert.equal(runs[0]?.briefId, briefId);
    assert.equal(runs[0]?.requirementArchived, true);
    assert.equal(runs[0]?.briefSuperseded, true);

    const review = (await core.query({ type: "review.queue", limit: 20, includeArchived: true })).items;
    assert.equal(review.length, 1);
    assert.equal(review[0]?.briefId, briefId);
    assert.equal(review[0]?.requirementArchived, true);
    assert.equal(review[0]?.briefSuperseded, true);
});

test("活动 Requirement 的旧 Revision 图片仍可反馈，归档后反馈与删除均拒绝", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-requirement-feedback-guard-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const { core, briefId, imageIds } = await generatedReviewFixture(workspace, "requirement-feedback-guard", 1);
    const sourceAutoRun = await core.execute({
        type: "auto_run.create",
        input: { name: "反馈边界", briefId, count: 1, maxIterations: 1 },
        idempotencyKey: "requirement-feedback-guard-auto-run",
    });
    const original = (await core.query({ type: "brief.detail", briefId })).brief;
    const revised = await core.execute({
        type: "brief.revise",
        briefId,
        sourceAutoRunId: sourceAutoRun.resource!.id,
        input: {
            subject: "反馈边界当前修订",
            purpose: original.purpose,
            aspectRatio: original.aspectRatio,
            constraints: original.constraints,
            referenceImageIds: original.referenceImageIds,
            strategy: original.strategy,
        },
        idempotencyKey: "requirement-feedback-guard-revise",
    });
    await core.execute({
        type: "feedback.append",
        imageId: imageIds[0]!,
        feedback: { kind: "comment", comment: "旧修订图片仍是当前 Requirement 的有效证据" },
        idempotencyKey: "requirement-feedback-guard-active-comment",
    });
    await core.execute({ type: "brief.archive", briefId: revised.resource!.id, idempotencyKey: "requirement-feedback-guard-archive" });
    const sequence = (await core.query({ type: "workspace.summary" })).sequence;

    await assert.rejects(
        core.execute({
            type: "feedback.append",
            imageId: imageIds[0]!,
            feedback: { kind: "rating", rating: 5 },
            idempotencyKey: "requirement-feedback-guard-archived-rating",
        }),
        /Requirement 已归档/,
    );
    await assert.rejects(
        core.execute({ type: "image.delete", imageId: imageIds[0]!, idempotencyKey: "requirement-feedback-guard-archived-delete" }),
        /Requirement 已归档/,
    );
    assert.equal((await core.query({ type: "workspace.summary" })).sequence, sequence);
});

test("旧 Revision 的 Auto Run 与 Prompt 配置只读", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-superseded-write-guard-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan, translate: async () => ({ fields: testPlan.fields, compiledPrompt: "中文展示提示词" }) },
        imageReviewer: { review: async () => [] },
    });
    const created = await core.execute({
        type: "brief.create",
        input: { subject: "旧修订只读", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "stable" },
        idempotencyKey: "superseded-write-guard-brief",
    });
    const briefId = created.resource!.id;
    const autoRun = await core.execute({
        type: "auto_run.create",
        input: { name: "旧修订任务", briefId, count: 1, maxIterations: 1 },
        idempotencyKey: "superseded-write-guard-auto-run",
    });
    const prompt = await core.execute({ type: "round.plan", briefId, strategy: "stable", idempotencyKey: "superseded-write-guard-plan" });
    const original = (await core.query({ type: "brief.detail", briefId })).brief;
    await core.execute({
        type: "brief.revise",
        briefId,
        sourceAutoRunId: autoRun.resource!.id,
        input: {
            subject: "当前修订",
            purpose: original.purpose,
            aspectRatio: original.aspectRatio,
            constraints: original.constraints,
            referenceImageIds: original.referenceImageIds,
            strategy: original.strategy,
        },
        idempotencyKey: "superseded-write-guard-revise",
    });
    const sequence = (await core.query({ type: "workspace.summary" })).sequence;

    await assert.rejects(
        core.execute({ type: "auto_run.update", autoRunId: autoRun.resource!.id, input: { name: "不应写入" }, idempotencyKey: "superseded-write-guard-update" }),
        /当前 Brief 修订/,
    );
    await assert.rejects(
        core.execute({ type: "auto_run.create", input: { name: "不应创建", briefId, count: 1, maxIterations: 1 }, idempotencyKey: "superseded-write-guard-create" }),
        /当前 Brief 修订/,
    );
    await assert.rejects(
        core.execute({ type: "auto_run.start", autoRunId: autoRun.resource!.id, idempotencyKey: "superseded-write-guard-start" }),
        /当前 Brief 修订/,
    );
    await assert.rejects(
        core.execute({ type: "auto_run.extend", autoRunId: autoRun.resource!.id, additionalIterations: 1, idempotencyKey: "superseded-write-guard-extend" }),
        /当前 Brief 修订/,
    );
    await assert.rejects(
        core.execute({ type: "auto_run.advance", autoRunId: autoRun.resource!.id, idempotencyKey: "superseded-write-guard-advance" }),
        /当前 Brief 修订/,
    );
    await assert.rejects(
        core.execute({ type: "round.plan", briefId, strategy: "stable", idempotencyKey: "superseded-write-guard-round-plan" }),
        /当前 Brief 修订/,
    );
    await assert.rejects(
        core.execute({ type: "prompt.approve", promptVersionId: prompt.resource!.id, locks: {}, idempotencyKey: "superseded-write-guard-approve" }),
        /当前 Brief 修订/,
    );
    await assert.rejects(
        core.execute({ type: "prompt.translate", promptVersionId: prompt.resource!.id, language: "zh-CN", idempotencyKey: "superseded-write-guard-translate" }),
        /当前 Brief 修订/,
    );
    await assert.rejects(
        core.execute({ type: "run.start", promptVersionId: prompt.resource!.id, count: 1, idempotencyKey: "superseded-write-guard-run-start" }),
        /当前 Brief 修订/,
    );
    assert.equal((await core.query({ type: "workspace.summary" })).sequence, sequence);
});

test("跨轮总结跨越归档恢复 ABA 时丢弃旧结果，恢复后新请求可写入", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-trajectory-archive-guard-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "trajectory-archive.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    const writer = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => [generatedFile] },
        imageReviewer: { review: async ({ images }) => images.map(({ imageId }) => ({
            imageId, rating: 4 as const, comment: "继续探索。", decision: "vary" as const, strengths: ["稳定"], issues: ["层次"],
        })) },
    });
    const brief = await writer.execute({
        type: "brief.create",
        input: { subject: "归档总结", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced" },
        idempotencyKey: "trajectory-archive-guard-brief",
    });
    const autoRun = await writer.execute({
        type: "auto_run.create",
        input: { name: "归档总结", briefId: brief.resource!.id, count: 1, maxIterations: 2 },
        idempotencyKey: "trajectory-archive-guard-auto-run",
    });
    await writer.triggerAutoRun(autoRun.resource!.id, "start");
    await waitFor(async () => (await writer.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "completed");

    let releaseSummary!: () => void;
    let summaryStarted!: () => void;
    const summaryGate = new Promise<void>((resolve) => { releaseSummary = resolve; });
    const started = new Promise<void>((resolve) => { summaryStarted = resolve; });
    let summaryCalls = 0;
    const core = new FrameFlowCore(workspace, {
        trajectorySummarizer: { summarize: async () => {
            summaryCalls += 1;
            summaryStarted();
            await summaryGate;
            return {
                improved: [{ issue: "层次", evidenceIterations: [1, 2], explanation: "第二轮更清晰。" }],
                recurring: [{ issue: "留白", evidenceIterations: [1, 2], recommendation: "继续控制留白。" }],
                bestIteration: 2,
                bestReason: "第二轮更完整。",
            };
        } },
    });
    const lateSummary = core.summarizeAutoRunTrajectory(autoRun.resource!.id, true);
    await started;
    await core.execute({ type: "brief.archive", briefId: brief.resource!.id, idempotencyKey: "trajectory-archive-guard-archive" });
    let archivedSummaryCalls = 0;
    const archivedCore = new FrameFlowCore(workspace, { trajectorySummarizer: { summarize: async () => {
        archivedSummaryCalls += 1;
        throw new Error("归档 Requirement 不应调用总结器");
    } } });
    await assert.rejects(archivedCore.summarizeAutoRunTrajectory(autoRun.resource!.id, true), /Requirement 已归档/);
    assert.equal(archivedSummaryCalls, 0);
    await core.execute({ type: "brief.restore", briefId: brief.resource!.id, idempotencyKey: "trajectory-archive-guard-restore" });
    const restoredSequence = (await core.query({ type: "workspace.summary" })).sequence;
    releaseSummary();

    await assert.rejects(lateSummary, /Requirement 生命周期已变更/);
    assert.equal((await core.query({ type: "workspace.summary" })).sequence, restoredSequence);
    assert.equal((await core.query({ type: "auto_run.trajectory", autoRunId: autoRun.resource!.id })).summary, undefined);
    const freshSummary = await core.summarizeAutoRunTrajectory(autoRun.resource!.id, true);
    assert.equal(freshSummary.throughIteration, 2);
    assert.equal(summaryCalls, 2);
});

test("Machine Review 跨越归档恢复 ABA 时丢弃旧结果，显式恢复后可重新审图", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-machine-review-archive-guard-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "machine-review-archive.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    let releaseReview!: () => void;
    let markReviewStarted!: () => void;
    const reviewGate = new Promise<void>((resolve) => { releaseReview = resolve; });
    const reviewStarted = new Promise<void>((resolve) => { markReviewStarted = resolve; });
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => [generatedFile] },
        imageReviewer: { review: async ({ images }) => {
            markReviewStarted();
            await reviewGate;
            return images.map(({ imageId }) => ({
                imageId, rating: 4 as const, comment: "这条结果已经迟到。", decision: "vary" as const, strengths: ["完整"], issues: ["已归档"],
            }));
        } },
    });
    const brief = await core.execute({
        type: "brief.create",
        input: { subject: "机器审图归档竞态", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced" },
        idempotencyKey: "machine-review-archive-guard-brief",
    });
    const autoRun = await core.execute({
        type: "auto_run.create",
        input: { name: "机器审图归档竞态", briefId: brief.resource!.id, count: 1, maxIterations: 1 },
        idempotencyKey: "machine-review-archive-guard-auto-run",
    });
    await core.triggerAutoRun(autoRun.resource!.id, "start");
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "reviewing");
    await reviewStarted;
    await core.execute({ type: "auto_run.stop", autoRunId: autoRun.resource!.id, idempotencyKey: "machine-review-archive-guard-stop" });
    await core.execute({ type: "brief.archive", briefId: brief.resource!.id, idempotencyKey: "machine-review-archive-guard-archive" });
    await core.execute({ type: "brief.restore", briefId: brief.resource!.id, idempotencyKey: "machine-review-archive-guard-restore" });
    const restoredSequence = (await core.query({ type: "workspace.summary" })).sequence;
    releaseReview();
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.equal((await core.query({ type: "workspace.summary" })).sequence, restoredSequence);
    const review = (await core.query({ type: "review.queue", limit: 20 })).items;
    assert.equal(review.length, 1);
    assert.equal(review[0]?.machineReview, undefined);
    await core.triggerAutoRun(autoRun.resource!.id, "start");
    await waitFor(async () => (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns[0]?.state === "completed");
    assert.ok((await core.query({ type: "review.queue", limit: 20 })).items[0]?.machineReview);
});

test("任一 Revision 可恢复归档 Requirement，归档事实跨三代一致且重启可重放", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-requirement-restore-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);
    const first = await core.execute({
        type: "brief.create",
        input: { subject: "第一版", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced" },
        idempotencyKey: "requirement-restore-v1",
    });
    const requirementId = first.resource!.id;
    const firstAutoRun = await core.execute({
        type: "auto_run.create",
        input: { name: "三代恢复", briefId: requirementId, count: 1, maxIterations: 1 },
        idempotencyKey: "requirement-restore-auto-run-v1",
    });
    const second = await core.execute({
        type: "brief.revise",
        briefId: requirementId,
        sourceAutoRunId: firstAutoRun.resource!.id,
        input: { subject: "第二版", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced" },
        idempotencyKey: "requirement-restore-v2",
    });
    const secondAutoRun = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns.find((item) => item.briefId === second.resource!.id)!;
    const third = await core.execute({
        type: "brief.revise",
        briefId: second.resource!.id,
        sourceAutoRunId: secondAutoRun.id,
        input: { subject: "第三版", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "balanced" },
        idempotencyKey: "requirement-restore-v3",
    });
    await core.execute({ type: "brief.archive", briefId: third.resource!.id, idempotencyKey: "requirement-restore-archive" });

    const archived = (await core.query({ type: "brief.list", limit: 20, includeArchived: true })).briefs;
    assert.equal(archived.length, 3);
    assert.ok(archived.every((brief) => brief.archivedAt));
    assert.deepEqual((await core.query({ type: "auto_run.list", limit: 20 })).autoRuns, []);

    const restored = await core.execute({ type: "brief.restore", briefId: requirementId, idempotencyKey: "requirement-restore-command" });
    assert.deepEqual(restored.resource, { type: "brief", id: third.resource!.id });
    const all = (await core.query({ type: "brief.list", limit: 20, includeArchived: true })).briefs;
    assert.ok(all.every((brief) => !brief.archivedAt));
    assert.ok(all.find((brief) => brief.id === requirementId)?.supersededAt);
    assert.ok(all.find((brief) => brief.id === second.resource!.id)?.supersededAt);
    assert.equal(all.find((brief) => brief.id === third.resource!.id)?.supersededAt, undefined);
    assert.deepEqual((await core.query({ type: "brief.list", limit: 20 })).briefs.map((brief) => brief.id), [third.resource!.id]);
    const activeAutoRuns = (await core.query({ type: "auto_run.list", limit: 20 })).autoRuns;
    assert.equal(activeAutoRuns.length, 3);
    assert.equal(activeAutoRuns.find((item) => item.briefId === requirementId)?.briefSuperseded, true);
    assert.equal(activeAutoRuns.find((item) => item.briefId === third.resource!.id)?.briefSuperseded, false);

    const restarted = new FrameFlowCore(workspace);
    assert.deepEqual((await restarted.query({ type: "brief.list", limit: 20 })).briefs.map((brief) => brief.id), [third.resource!.id]);
    assert.ok((await restarted.query({ type: "brief.list", limit: 20, includeArchived: true })).briefs.every((brief) => !brief.archivedAt));
    const history = await restarted.query({ type: "event.history", subjectId: requirementId, limit: 20 });
    assert.deepEqual(history.events.filter((event) => event.type.startsWith("brief.")).map((event) => event.type), [
        "brief.created", "brief.revised", "brief.revised", "brief.archived", "brief.restored",
    ]);
});

test("旧 brief.archived 事件缺少 requirementId 时仍按目标 Revision 的 Requirement 重放", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-legacy-requirement-archive-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);
    const first = await core.execute({
        type: "brief.create",
        input: { subject: "旧归档事件第一版", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "stable" },
        idempotencyKey: "legacy-requirement-archive-v1",
    });
    const autoRun = await core.execute({
        type: "auto_run.create",
        input: { name: "旧归档事件", briefId: first.resource!.id, count: 1, maxIterations: 1 },
        idempotencyKey: "legacy-requirement-archive-auto-run",
    });
    const second = await core.execute({
        type: "brief.revise",
        briefId: first.resource!.id,
        sourceAutoRunId: autoRun.resource!.id,
        input: { subject: "旧归档事件第二版", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "stable" },
        idempotencyKey: "legacy-requirement-archive-v2",
    });
    await core.execute({ type: "brief.archive", briefId: second.resource!.id, idempotencyKey: "legacy-requirement-archive-command" });

    const journal = path.join(workspace, ".infinite-canvas", "frameflow", "journal", "transactions-000001.jsonl");
    const transactions = (await fs.readFile(journal, "utf8")).trim().split(/\r?\n/).map((line) => JSON.parse(line) as Record<string, any>);
    for (const transaction of transactions) {
        for (const event of transaction.events as Array<Record<string, any>>) {
            if (event.type === "brief.archived") delete event.requirementId;
        }
    }
    await fs.writeFile(journal, `${transactions.map((transaction) => JSON.stringify(transaction)).join("\n")}\n`);

    const replayed = new FrameFlowCore(workspace);
    const archived = (await replayed.query({ type: "brief.list", limit: 20, includeArchived: true })).briefs;
    assert.equal(archived.length, 2);
    assert.ok(archived.every((brief) => brief.archivedAt));
    assert.deepEqual((await replayed.query({ type: "brief.list", limit: 20 })).briefs, []);
    for (const subjectId of [first.resource!.id, second.resource!.id]) {
        const history = await replayed.query({ type: "event.history", subjectId, limit: 20 });
        assert.ok(history.events.some((event) => event.type === "brief.archived"));
    }
});

test("auto_run.stop 只改写真正运行中的任务，并保留归档旧 Revision 的安全停止例外", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-stop-safety-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);
    const created = await core.execute({
        type: "brief.create",
        input: { subject: "停止安全边界", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "stable" },
        idempotencyKey: "stop-safety-brief",
    });
    const autoRuns = await Promise.all(["completed", "failed", "generating"].map((state) => core.execute({
        type: "auto_run.create",
        input: { name: `停止边界 ${state}`, briefId: created.resource!.id, count: 1, maxIterations: 1 },
        idempotencyKey: `stop-safety-${state}`,
    })));
    const revised = await core.execute({
        type: "brief.revise",
        briefId: created.resource!.id,
        sourceAutoRunId: autoRuns[0]!.resource!.id,
        input: { subject: "停止安全边界新修订", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "stable" },
        idempotencyKey: "stop-safety-revise",
    });
    await core.execute({ type: "brief.archive", briefId: revised.resource!.id, idempotencyKey: "stop-safety-archive" });

    const states = new Map(autoRuns.map((item, index) => [item.resource!.id, ["completed", "failed", "generating"][index]!]));
    const journal = path.join(workspace, ".infinite-canvas", "frameflow", "journal", "transactions-000001.jsonl");
    const transactions = (await fs.readFile(journal, "utf8")).trim().split(/\r?\n/).map((line) => JSON.parse(line) as Record<string, any>);
    for (const transaction of transactions) {
        for (const event of transaction.events as Array<Record<string, any>>) {
            if (event.type === "auto_run.created" && states.has(event.autoRun.id)) event.autoRun.state = states.get(event.autoRun.id);
        }
    }
    await fs.writeFile(journal, `${transactions.map((transaction) => JSON.stringify(transaction)).join("\n")}\n`);

    const replayed = new FrameFlowCore(workspace);
    const before = (await replayed.query({ type: "workspace.summary" })).sequence;
    for (const item of autoRuns.slice(0, 2)) {
        await assert.rejects(
            replayed.execute({ type: "auto_run.stop", autoRunId: item.resource!.id, idempotencyKey: `stop-safety-reject-${item.resource!.id}` }),
            /只有正在生成或机器审图/,
        );
    }
    assert.equal((await replayed.query({ type: "workspace.summary" })).sequence, before);

    await replayed.execute({ type: "auto_run.stop", autoRunId: autoRuns[2]!.resource!.id, idempotencyKey: "stop-safety-running" });
    const listed = (await replayed.query({ type: "auto_run.list", limit: 20, includeArchived: true })).autoRuns;
    assert.equal(listed.find((item) => item.id === autoRuns[2]!.resource!.id)?.state, "paused");
    assert.equal((await replayed.query({ type: "workspace.summary" })).sequence, before + 1);
});

test("生成中的批次会阻止修改或删除需求", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-brief-active-run-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const generatedFile = path.join(workspace, "brief-active-run.png");
    await fs.writeFile(generatedFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7KAAAAAASUVORK5CYII=", "base64"));
    let releaseGeneration!: () => void;
    const generationGate = new Promise<void>((resolve) => { releaseGeneration = resolve; });
    const core = new FrameFlowCore(workspace, {
        planner: { plan: async () => testPlan },
        imageGenerator: { generate: async () => { await generationGate; return [generatedFile]; } },
    });
    const promptVersionId = await approvedPrompt(core, "brief-active-run");
    const promptLineage = await core.query({ type: "prompt.lineage", promptVersionId });
    const briefId = promptLineage.versions[0]!.briefId;
    const brief = (await core.query({ type: "brief.detail", briefId })).brief;
    const started = await core.execute({ type: "run.start", promptVersionId, count: 1, idempotencyKey: "brief-active-run-start" });
    assert.equal((await core.query({ type: "run.detail", runId: started.resource!.id })).run.status, "running");

    await assert.rejects(core.execute({
        type: "brief.revise",
        briefId,
        input: {
            subject: "运行中不可修改",
            purpose: brief.purpose,
            aspectRatio: brief.aspectRatio,
            constraints: brief.constraints,
            referenceImageIds: brief.referenceImageIds,
            strategy: brief.strategy,
        },
        idempotencyKey: "brief-active-run-revise",
    }), /请先停止正在生成的批次/);
    await assert.rejects(
        core.execute({ type: "brief.archive", briefId, idempotencyKey: "brief-active-run-archive" }),
        /请先停止正在生成的批次/,
    );

    await core.execute({ type: "run.cancel", runId: started.resource!.id, idempotencyKey: "brief-active-run-cancel" });
    releaseGeneration();
    await waitFor(async () => (await core.query({ type: "run.detail", runId: started.resource!.id })).run.status === "cancelled");
    await waitFor(async () => (await core.query({ type: "quarantine.list", limit: 20 })).items.some((item) => item.runId === started.resource!.id));
    await core.execute({ type: "brief.archive", briefId, idempotencyKey: "brief-active-run-archive-after-cancel" });
    assert.ok((await core.query({ type: "brief.detail", briefId })).brief.archivedAt);
});

test("5 星强化、生成失败不污染偏好，且重启后结果一致", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const { core, briefId, imageIds } = await generatedReviewFixture(workspace, "preference-restart", 2);

    const ratingReceipt = await core.execute({
        type: "feedback.append",
        imageId: imageIds[0]!,
        feedback: { kind: "rating", rating: 5 },
        idempotencyKey: "rate-image-liked-5",
    });
    await core.execute({
        type: "feedback.append",
        imageId: imageIds[1]!,
        feedback: { kind: "soft_delete", reason: "generation_failure" },
        idempotencyKey: "hide-image-broken",
    });

    const beforeRestart = await core.query({ type: "preference.dna", briefId });
    assert.deepEqual(beforeRestart, {
        type: "preference.dna",
        briefId,
        totalWeight: 3,
        sampleSize: 1,
        boost: [{ imageId: imageIds[0]!, weight: 3, sourceEventIds: ratingReceipt.eventIds }],
        avoid: [],
        qualityRejections: 1,
    });

    const restarted = new FrameFlowCore(workspace);
    assert.deepEqual(await restarted.query({ type: "preference.dna", briefId }), beforeRestart);
});

test("重复 idempotencyKey 返回原结果且不产生第二条事件", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);
    const command = {
        type: "feedback.append" as const,
        imageId: "image-liked",
        feedback: { kind: "rating" as const, rating: 5 as const },
        idempotencyKey: "rate-once",
    };

    const first = await core.execute(command);
    const duplicate = await core.execute(command);

    assert.deepEqual(duplicate, first);
    assert.deepEqual(await core.query({ type: "workspace.summary" }), {
        type: "workspace.summary",
        sequence: 1,
        feedbackImages: 1,
        qualityRejections: 0,
        briefs: 0,
        prompts: 0,
        runs: 0,
        images: 0,
        decisions: 0,
    });
    assert.equal((await core.query({ type: "event.history", subjectId: "image-liked", limit: 20 })).events.length, 1);
});

test("改分覆盖当前权重，审美删除与恢复保留完整历史", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const { core, briefId, imageIds } = await generatedReviewFixture(workspace, "preference-overwrite", 1);
    const imageId = imageIds[0]!;

    await core.execute({ type: "feedback.append", imageId, feedback: { kind: "rating", rating: 5 }, idempotencyKey: "rating-5" });
    const lowRating = await core.execute({ type: "feedback.append", imageId, feedback: { kind: "rating", rating: 1 }, idempotencyKey: "rating-1" });
    assert.deepEqual((await core.query({ type: "preference.dna", briefId })).avoid, [
        { imageId, weight: -2, sourceEventIds: lowRating.eventIds },
    ]);

    const hidden = await core.execute({ type: "feedback.append", imageId, feedback: { kind: "soft_delete", reason: "aesthetic_dislike" }, idempotencyKey: "hide-aesthetic" });
    assert.deepEqual((await core.query({ type: "preference.dna", briefId })).avoid, [
        { imageId, weight: -4, sourceEventIds: hidden.eventIds },
    ]);

    await core.execute({ type: "feedback.append", imageId, feedback: { kind: "restore" }, idempotencyKey: "restore-image" });
    assert.deepEqual((await core.query({ type: "preference.dna", briefId })).avoid, [
        { imageId, weight: -2, sourceEventIds: lowRating.eventIds },
    ]);
    assert.equal((await core.query({ type: "event.history", subjectId: imageId, limit: 20 })).events.length, 6);
});

test("生成失败型删除不改变已有审美权重", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const { core, briefId, imageIds } = await generatedReviewFixture(workspace, "preference-quality-rejection", 1);
    const imageId = imageIds[0]!;
    const rating = await core.execute({ type: "feedback.append", imageId, feedback: { kind: "rating", rating: 5 }, idempotencyKey: "rating" });
    await core.execute({ type: "feedback.append", imageId, feedback: { kind: "soft_delete", reason: "generation_failure" }, idempotencyKey: "hide" });

    assert.deepEqual(await core.query({ type: "preference.dna", briefId }), {
        type: "preference.dna",
        briefId,
        totalWeight: 3,
        sampleSize: 1,
        boost: [{ imageId, weight: 3, sourceEventIds: rating.eventIds }],
        avoid: [],
        qualityRejections: 1,
    });
});

test("Prompt 中文展示翻译独立持久化且不改变英文执行原文", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-translation-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    let translations = 0;
    const translation = {
        fields: {
            subject: ["陶瓷花瓶"], composition: ["居中产品摄影"], color: ["暖白色"], lighting: ["柔光箱照明"],
            material: ["哑光陶瓷"], layout: ["单一物体"], mood: ["平静"], rendering: ["照片级真实"],
            technical: ["1:1"], negative: ["文字", "水印"],
        },
        compiledPrompt: "一个哑光陶瓷花瓶，居中产品摄影，柔光箱照明，暖白色背景。",
    };
    const planner: FrameFlowPromptPlanner = {
        plan: async () => testPlan,
        translate: async ({ prompt, language }) => {
            translations += 1;
            assert.equal(language, "zh-CN");
            assert.equal(prompt.compiledPrompt, testPlan.compiledPrompt);
            return translation;
        },
    };
    const core = new FrameFlowCore(workspace, { planner });
    const brief = await core.execute({
        type: "brief.create",
        input: { subject: "陶瓷花瓶", aspectRatio: "1:1", constraints: { keep: [], avoid: [] }, referenceImageIds: [], strategy: "stable", profileId: "default" },
        idempotencyKey: "translation-brief",
    });
    const planned = await core.execute({ type: "round.plan", briefId: brief.resource!.id, strategy: "stable", idempotencyKey: "translation-plan" });
    await core.execute({ type: "prompt.translate", promptVersionId: planned.resource!.id, language: "zh-CN", idempotencyKey: "translation-create" });
    await core.execute({ type: "prompt.translate", promptVersionId: planned.resource!.id, language: "zh-CN", idempotencyKey: "translation-existing" });

    const lineage = await core.query({ type: "prompt.lineage", promptVersionId: planned.resource!.id });
    assert.equal(translations, 1);
    assert.equal(lineage.versions[0]?.compiledPrompt, testPlan.compiledPrompt);
    assert.deepEqual(lineage.versions[0]?.fields, testPlan.fields);
    assert.deepEqual(lineage.versions[0]?.translations?.["zh-CN"], translation);

    const restored = new FrameFlowCore(workspace, { planner });
    const restoredLineage = await restored.query({ type: "prompt.lineage", promptVersionId: planned.resource!.id });
    assert.deepEqual(restoredLineage.versions[0]?.translations?.["zh-CN"], translation);
});

test("并发命令仍获得连续唯一序列", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);

    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => core.execute({
        type: "feedback.append",
        imageId: `image-${index}`,
        feedback: { kind: "comment", comment: `comment-${index}` },
        idempotencyKey: `comment-${index}`,
    })));

    assert.deepEqual(results.map((result) => result.sequence), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal((await core.query({ type: "workspace.summary" })).feedbackImages, 8);
});

test("未知存储版本会拒绝覆盖原数据", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const storage = path.join(workspace, ".infinite-canvas", "frameflow");
    await fs.mkdir(storage, { recursive: true });
    await fs.writeFile(path.join(storage, "manifest.json"), JSON.stringify({ schemaVersion: 99, projectionVersion: 1 }));
    await fs.writeFile(path.join(storage, "keep-me.txt"), "original");

    const core = new FrameFlowCore(workspace);
    await assert.rejects(core.query({ type: "workspace.summary" }), /Refusing to overwrite existing data/);
    assert.equal(await fs.readFile(path.join(storage, "keep-me.txt"), "utf8"), "original");
});

test("无效命令不会写入事件", async (context) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "frameflow-core-"));
    context.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const core = new FrameFlowCore(workspace);

    await assert.rejects(core.execute({
        type: "feedback.append",
        imageId: "image-a",
        feedback: { kind: "comment", comment: "" },
        idempotencyKey: "empty-comment",
    }));
    assert.equal((await core.query({ type: "workspace.summary" })).sequence, 0);
});
