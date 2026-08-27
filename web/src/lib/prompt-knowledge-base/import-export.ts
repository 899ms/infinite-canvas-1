import type { FeedbackMap } from "@/lib/image-feedback";
import type { PromptFillTemplate } from "@/lib/prompt-fill/templates";
import { addCapture, addPromptCandidate, addRecipeCandidate, addTermCandidate, createEmptyPromptKnowledgeBase, setReviewState, type BrowseCategory, type CaptureSourceType, type PromptKnowledgeBase, type ReviewState } from "./domain";

export type ImportReport = { added: number; merged: number; skipped: number; conflicts: number; failed: number; reasons: string[] };
export type MigrationSnapshot = { schemaVersion: 1; exportedAt: string; knowledgeBase: PromptKnowledgeBase; promptFillTemplates: PromptFillTemplate[]; imageFeedback: FeedbackMap };
export type MigrationExportReceipt = { fileName: string; bytes: number; captures: number; terms: number; recipes: number; prompts: number; templates: number; feedback: number; verified: true };
const categories = new Set<BrowseCategory>(["成像", "光线", "镜头", "构图", "动作", "情绪", "主体", "服装", "场景", "道具", "色彩", "材质", "版式", "风格", "其他"]);
const reviewStates = new Set<ReviewState>(["pending", "machine_passed", "human_approved", "needs_revision"]);
const report = (): ImportReport => ({ added: 0, merged: 0, skipped: 0, conflicts: 0, failed: 0, reasons: [] });
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function exportMigrationSnapshot(knowledgeBase: PromptKnowledgeBase, promptFillTemplates: PromptFillTemplate[], imageFeedback: FeedbackMap): string {
    return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), knowledgeBase, promptFillTemplates, imageFeedback } satisfies MigrationSnapshot, null, 2);
}
export function createMigrationExport(knowledgeBase: PromptKnowledgeBase, promptFillTemplates: PromptFillTemplate[], imageFeedback: FeedbackMap) {
    const json = exportMigrationSnapshot(knowledgeBase, promptFillTemplates, imageFeedback);
    return { json, receipt: inspectMigrationExport(json) };
}
export function inspectMigrationExport(raw: string): MigrationExportReceipt {
    const parsed = JSON.parse(raw) as Partial<MigrationSnapshot>;
    if (parsed.schemaVersion !== 1 || !isRecord(parsed.knowledgeBase) || !Array.isArray(parsed.promptFillTemplates) || !isRecord(parsed.imageFeedback)) throw new Error("不是有效的提示词迁移包");
    const roundTrip = importMigrationSnapshot(raw);
    if (roundTrip.report.failed) throw new Error(`迁移包校验失败：${roundTrip.report.failed} 项无法恢复`);
    return {
        fileName: "infinite-canvas-prompt-migration.json",
        bytes: new Blob([raw]).size,
        captures: roundTrip.knowledgeBase.captures.length,
        terms: roundTrip.knowledgeBase.terms.length,
        recipes: roundTrip.knowledgeBase.recipes.length,
        prompts: roundTrip.knowledgeBase.prompts.length,
        templates: roundTrip.promptFillTemplates.length,
        feedback: Object.keys(roundTrip.imageFeedback).length,
        verified: true,
    };
}
export function exportKnowledgeBase(value: PromptKnowledgeBase) {
    return exportMigrationSnapshot(value, [], {});
}

function rawKnowledgeBase(value: unknown) {
    if (!isRecord(value)) throw new Error("不是可导入的提示词知识库文件");
    if (isRecord(value.knowledgeBase)) return value.knowledgeBase;
    if (isRecord(value.data)) return value.data;
    if (Array.isArray(value.captures) && Array.isArray(value.terms) && Array.isArray(value.recipes) && Array.isArray(value.prompts)) return value;
    throw new Error("迁移包缺少提示词知识库数据");
}
function asString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback;
}
function asStrings(value: unknown) {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function importMigrationSnapshot(raw: string, current = createEmptyPromptKnowledgeBase()): { knowledgeBase: PromptKnowledgeBase; promptFillTemplates: PromptFillTemplate[]; imageFeedback: FeedbackMap; report: ImportReport } {
    const parsed: unknown = JSON.parse(raw);
    const incoming = rawKnowledgeBase(parsed);
    const result = report();
    let knowledgeBase = current;
    const captureMap = new Map<string, string>();
    const termMap = new Map<string, string>();
    const recipeMap = new Map<string, string>();
    for (const item of Array.isArray(incoming.captures) ? incoming.captures : []) {
        if (!isRecord(item) || !asString(item.sourceText || item.content).trim()) {
            result.failed += 1;
            result.reasons.push("跳过了缺少原文的收录");
            continue;
        }
        const content = asString(item.sourceText || item.content).trim();
        const duplicate = knowledgeBase.captures.find((capture) => capture.content === content && capture.sourceType === asString(item.sourceType, "manual"));
        if (duplicate) {
            captureMap.set(asString(item.id), duplicate.id);
            result.skipped += 1;
            continue;
        }
        const sourceType = (["manual", "remote-prompt", "asset", "canvas-text-node", "image-feedback"] as CaptureSourceType[]).includes(item.sourceType as CaptureSourceType) ? (item.sourceType as CaptureSourceType) : "manual";
        knowledgeBase = addCapture(knowledgeBase, { sourceType, content, sourceLabel: asString(item.sourceLabel) || undefined, sourceRef: isRecord(item.sourceRef) ? item.sourceRef : undefined });
        const created = knowledgeBase.captures.at(-1)!;
        captureMap.set(asString(item.id), created.id);
        result.added += 1;
    }
    for (const item of Array.isArray(incoming.terms) ? incoming.terms : []) {
        if (!isRecord(item)) {
            result.failed += 1;
            continue;
        }
        const sourceCaptureIds = asStrings(item.sourceCaptureIds)
            .map((id) => captureMap.get(id))
            .filter((id): id is string => Boolean(id));
        const text = asString(item.label || item.text).trim();
        if (!text) {
            result.failed += 1;
            result.reasons.push("跳过了没有内容的词条");
            continue;
        }
        if (!sourceCaptureIds.length) {
            const createdAt = new Date().toISOString();
            const termId = `term_${crypto.randomUUID()}`;
            const category = categories.has(item.category as BrowseCategory) ? (item.category as BrowseCategory) : categories.has(item.browseCategory as BrowseCategory) ? (item.browseCategory as BrowseCategory) : "其他";
            knowledgeBase = {
                ...knowledgeBase,
                terms: [
                    ...knowledgeBase.terms,
                    { id: termId, text, label: text, browseCategory: category, category, visualDuty: asString(item.visualDuty), sourceCaptureIds: [], reviewState: "pending", validationErrors: ["迁移时原始收录引用缺失"], createdAt, updatedAt: createdAt },
                ],
            };
            termMap.set(asString(item.id), termId);
            result.conflicts += 1;
            result.reasons.push(`词条“${text}”已保留为待修复项`);
            continue;
        }
        const before = knowledgeBase.terms.length;
        const category = categories.has(item.category as BrowseCategory) ? (item.category as BrowseCategory) : categories.has(item.browseCategory as BrowseCategory) ? (item.browseCategory as BrowseCategory) : "其他";
        knowledgeBase = addTermCandidate(knowledgeBase, { text, sourceCaptureIds, browseCategory: category, visualDuty: asString(item.visualDuty) });
        const created = knowledgeBase.terms.find((term) => term.text.toLocaleLowerCase("zh-CN") === text.toLocaleLowerCase("zh-CN"))!;
        termMap.set(asString(item.id), created.id);
        if (knowledgeBase.terms.length === before) result.merged += 1;
        else result.added += 1;
        if (reviewStates.has(item.reviewState as ReviewState)) knowledgeBase = setReviewState(knowledgeBase, "term", created.id, item.reviewState as ReviewState);
    }
    for (const item of Array.isArray(incoming.recipes) ? incoming.recipes : []) {
        if (!isRecord(item)) {
            result.failed += 1;
            continue;
        }
        const termIds = asStrings(item.termIds)
            .map((id) => termMap.get(id))
            .filter((id): id is string => Boolean(id));
        const sourceCaptureIds = asStrings(item.sourceCaptureIds)
            .map((id) => captureMap.get(id))
            .filter((id): id is string => Boolean(id));
        if (termIds.length < 2 || !sourceCaptureIds.length) {
            const createdAt = new Date().toISOString();
            const recipeId = `recipe_${crypto.randomUUID()}`;
            const title = asString(item.title, "未命名");
            const errors = [termIds.length < 2 ? "迁移时词条引用不足或缺失" : "", !sourceCaptureIds.length ? "迁移时原始收录引用缺失" : ""].filter(Boolean);
            knowledgeBase = {
                ...knowledgeBase,
                recipes: [...knowledgeBase.recipes, { id: recipeId, title, termIds, sourceCaptureIds, template: asString(item.template) || undefined, reviewState: "pending", validationErrors: errors, createdAt, updatedAt: createdAt }],
            };
            recipeMap.set(asString(item.id), recipeId);
            result.conflicts += 1;
            result.reasons.push(`配方“${title}”已保留为待修复项`);
            continue;
        }
        const duplicate = knowledgeBase.recipes.find((recipe) => recipe.title === asString(item.title) && recipe.termIds.length === termIds.length && recipe.termIds.every((termId) => termIds.includes(termId)));
        if (duplicate) {
            recipeMap.set(asString(item.id), duplicate.id);
            result.skipped += 1;
            continue;
        }
        knowledgeBase = addRecipeCandidate(knowledgeBase, { title: asString(item.title), termIds, sourceCaptureIds, template: asString(item.template) || undefined });
        const created = knowledgeBase.recipes.at(-1)!;
        recipeMap.set(asString(item.id), created.id);
        result.added += 1;
        if (reviewStates.has(item.reviewState as ReviewState)) knowledgeBase = setReviewState(knowledgeBase, "recipe", created.id, item.reviewState as ReviewState);
    }
    for (const item of Array.isArray(incoming.prompts) ? incoming.prompts : []) {
        if (!isRecord(item)) {
            result.failed += 1;
            continue;
        }
        const sourceCaptureIds = asStrings(item.sourceCaptureIds)
            .map((id) => captureMap.get(id))
            .filter((id): id is string => Boolean(id));
        if (!sourceCaptureIds.length) {
            const createdAt = new Date().toISOString();
            const title = asString(item.title, "未命名");
            const recipeId = recipeMap.get(asString(item.recipeId));
            knowledgeBase = {
                ...knowledgeBase,
                prompts: [
                    ...knowledgeBase.prompts,
                    { id: `prompt_${crypto.randomUUID()}`, title, content: asString(item.content), sourceCaptureIds: [], recipeId, reviewState: "pending", validationErrors: ["迁移时原始收录引用缺失"], createdAt, updatedAt: createdAt },
                ],
            };
            result.conflicts += 1;
            result.reasons.push(`完整提示词“${title}”已保留为待修复项`);
            continue;
        }
        if (knowledgeBase.prompts.some((prompt) => prompt.title === asString(item.title) && prompt.content === asString(item.content))) {
            result.skipped += 1;
            continue;
        }
        knowledgeBase = addPromptCandidate(knowledgeBase, { title: asString(item.title), content: asString(item.content), sourceCaptureIds, recipeId: recipeMap.get(asString(item.recipeId)) });
        const created = knowledgeBase.prompts.at(-1)!;
        result.added += 1;
        if (reviewStates.has(item.reviewState as ReviewState)) knowledgeBase = setReviewState(knowledgeBase, "prompt", created.id, item.reviewState as ReviewState);
    }
    const snapshot = isRecord(parsed) ? parsed : {};
    const promptFillTemplates = Array.isArray(snapshot.promptFillTemplates)
        ? snapshot.promptFillTemplates
              .filter((item): item is PromptFillTemplate => isRecord(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.content === "string")
              .map((item) => ({
                  id: item.id,
                  title: item.title,
                  content: item.content,
                  category: asString(item.category, "我的模板"),
                  description: asString(item.description, "迁入的自定义模板"),
                  custom: true,
                  createdAt: asString(item.createdAt) || undefined,
              }))
        : [];
    const imageFeedback: FeedbackMap = isRecord(snapshot.imageFeedback)
        ? Object.fromEntries(
              Object.entries(snapshot.imageFeedback).flatMap(([assetId, value]) => {
                  if (!isRecord(value)) return [];
                  const rating = value.rating === 1 || value.rating === 2 || value.rating === 3 || value.rating === 4 || value.rating === 5 ? value.rating : undefined;
                  const timestamp = asString(value.updatedAt) || new Date().toISOString();
                  return [
                      [
                          assetId,
                          {
                              id: asString(value.id) || `feedback_${assetId}`,
                              assetId,
                              rating,
                              comment: asString(value.comment),
                              hidden: value.hidden === true,
                              promptSnapshot: asString(value.promptSnapshot) || undefined,
                              style: asString(value.style) || undefined,
                              scene: asString(value.scene) || undefined,
                              canvasId: asString(value.canvasId) || undefined,
                              canvasNodeId: asString(value.canvasNodeId) || undefined,
                              createdAt: asString(value.createdAt) || timestamp,
                              updatedAt: timestamp,
                          },
                      ],
                  ];
              }),
          )
        : {};
    return { knowledgeBase, promptFillTemplates, imageFeedback, report: result };
}
export function importKnowledgeBase(raw: string): PromptKnowledgeBase {
    return importMigrationSnapshot(raw).knowledgeBase;
}
