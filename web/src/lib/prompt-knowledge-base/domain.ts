export type CaptureSourceType = "manual" | "remote-prompt" | "asset" | "canvas-text-node" | "image-feedback";
export type CaptureStatus = "pending" | "processed";
export type ReviewState = "pending" | "machine_passed" | "human_approved" | "needs_revision";
export type BrowseCategory = "成像" | "光线" | "镜头" | "构图" | "动作" | "情绪" | "主体" | "服装" | "场景" | "道具" | "色彩" | "材质" | "版式" | "风格" | "其他";
export type SourceRef = { sourceId?: string; promptId?: string; assetId?: string; canvasId?: string; nodeId?: string; sourceUrl?: string };

export type Capture = {
    id: string;
    sourceType: CaptureSourceType;
    content: string;
    sourceLabel?: string;
    sourceRef?: SourceRef;
    metadata?: Record<string, unknown>;
    status: CaptureStatus;
    derivedTermIds: string[];
    derivedRecipeIds: string[];
    derivedPromptIds: string[];
    createdAt: string;
};
export type VisualTerm = {
    id: string;
    text: string;
    label: string;
    browseCategory: BrowseCategory;
    category: BrowseCategory;
    visualDuty: string;
    sourceCaptureIds: string[];
    reviewState: ReviewState;
    validationErrors?: string[];
    createdAt: string;
    updatedAt: string;
};
export type PromptRecipe = { id: string; title: string; termIds: string[]; template?: string; sourceCaptureIds: string[]; reviewState: ReviewState; validationErrors?: string[]; createdAt: string; updatedAt: string };
export type CompletePrompt = { id: string; title: string; content: string; recipeId?: string; sourceCaptureIds: string[]; reviewState: ReviewState; validationErrors?: string[]; createdAt: string; updatedAt: string };
export type PromptKnowledgeBase = { version: 1; captures: Capture[]; terms: VisualTerm[]; recipes: PromptRecipe[]; prompts: CompletePrompt[] };
export type RuntimePromptLibrary = { version: 1; generatedAt: string; terms: VisualTerm[]; recipes: PromptRecipe[]; prompts: CompletePrompt[] };
export type ReviewableKind = "term" | "recipe" | "prompt";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const normalized = (value: string) => value.trim().toLocaleLowerCase("zh-CN");
const unique = (values: string[]) => [...new Set(values)];

export function createEmptyPromptKnowledgeBase(): PromptKnowledgeBase {
    return { version: 1, captures: [], terms: [], recipes: [], prompts: [] };
}

export function addCapture(knowledgeBase: PromptKnowledgeBase, value: Omit<Capture, "id" | "createdAt" | "status" | "derivedTermIds" | "derivedRecipeIds" | "derivedPromptIds">): PromptKnowledgeBase {
    const content = value.content.trim();
    if (!content) throw new Error("采集内容不能为空");
    return { ...knowledgeBase, captures: [...knowledgeBase.captures, { ...value, content, id: id("capture"), status: "pending", derivedTermIds: [], derivedRecipeIds: [], derivedPromptIds: [], createdAt: now() }] };
}

function appendCaptureRelation(knowledgeBase: PromptKnowledgeBase, captureIds: string[], relation: "derivedTermIds" | "derivedRecipeIds" | "derivedPromptIds", value: string) {
    return knowledgeBase.captures.map((capture) => (captureIds.includes(capture.id) ? { ...capture, status: "processed" as const, [relation]: unique([...capture[relation], value]) } : capture));
}

export function addTermCandidate(knowledgeBase: PromptKnowledgeBase, value: { text: string; sourceCaptureIds: string[]; browseCategory?: BrowseCategory; visualDuty?: string }): PromptKnowledgeBase {
    const text = value.text.trim();
    const sourceCaptureIds = unique(value.sourceCaptureIds);
    if (!text) throw new Error("词条不能为空");
    if (!sourceCaptureIds.length || sourceCaptureIds.some((captureId) => !knowledgeBase.captures.some((capture) => capture.id === captureId))) throw new Error("找不到原始收录，不能创建无来源词条");
    const existing = knowledgeBase.terms.find((item) => normalized(item.text) === normalized(text));
    const termId = existing?.id || id("term");
    const updatedAt = now();
    return {
        ...knowledgeBase,
        captures: appendCaptureRelation(knowledgeBase, sourceCaptureIds, "derivedTermIds", termId),
        terms: existing
            ? knowledgeBase.terms.map((item) => (item.id === termId ? { ...item, sourceCaptureIds: unique([...item.sourceCaptureIds, ...sourceCaptureIds]), updatedAt } : item))
            : [
                  ...knowledgeBase.terms,
                  {
                      id: termId,
                      text,
                      label: text,
                      browseCategory: value.browseCategory || "其他",
                      category: value.browseCategory || "其他",
                      visualDuty: value.visualDuty?.trim() || "",
                      sourceCaptureIds,
                      reviewState: "pending",
                      createdAt: updatedAt,
                      updatedAt,
                  },
              ],
    };
}

export function addRecipeCandidate(knowledgeBase: PromptKnowledgeBase, value: { title: string; termIds: string[]; sourceCaptureIds: string[]; template?: string }): PromptKnowledgeBase {
    const termIds = unique(value.termIds).filter((termId) => knowledgeBase.terms.some((term) => term.id === termId));
    const sourceCaptureIds = unique(value.sourceCaptureIds);
    if (termIds.length < 2) throw new Error("至少需要两个有效词条");
    if (!sourceCaptureIds.length || sourceCaptureIds.some((captureId) => !knowledgeBase.captures.some((capture) => capture.id === captureId))) throw new Error("找不到原始收录，不能创建无来源配方");
    const title = value.title.trim();
    if (!title) throw new Error("配方标题不能为空");
    const createdAt = now();
    const recipeId = id("recipe");
    return {
        ...knowledgeBase,
        captures: appendCaptureRelation(knowledgeBase, sourceCaptureIds, "derivedRecipeIds", recipeId),
        recipes: [...knowledgeBase.recipes, { id: recipeId, title, termIds, sourceCaptureIds, template: value.template?.trim() || undefined, reviewState: "pending", createdAt, updatedAt: createdAt }],
    };
}

export function addPromptCandidate(knowledgeBase: PromptKnowledgeBase, value: { title: string; content: string; sourceCaptureIds: string[]; recipeId?: string }): PromptKnowledgeBase {
    const title = value.title.trim();
    const content = value.content.trim();
    const sourceCaptureIds = unique(value.sourceCaptureIds);
    if (!title || !content) throw new Error("完整提示词需要标题和内容");
    if (!sourceCaptureIds.length || sourceCaptureIds.some((captureId) => !knowledgeBase.captures.some((capture) => capture.id === captureId))) throw new Error("找不到原始收录，不能创建无来源完整 Prompt");
    if (value.recipeId && !knowledgeBase.recipes.some((item) => item.id === value.recipeId)) throw new Error("配方不存在");
    const createdAt = now();
    const promptId = id("prompt");
    return {
        ...knowledgeBase,
        captures: appendCaptureRelation(knowledgeBase, sourceCaptureIds, "derivedPromptIds", promptId),
        prompts: [...knowledgeBase.prompts, { id: promptId, title, content, sourceCaptureIds, recipeId: value.recipeId, reviewState: "pending", createdAt, updatedAt: createdAt }],
    };
}

export function setReviewState(knowledgeBase: PromptKnowledgeBase, kind: ReviewableKind, itemId: string, reviewState: ReviewState): PromptKnowledgeBase {
    const updatedAt = now();
    if (reviewState === "machine_passed" || reviewState === "human_approved") {
        const errors = validateReviewable(knowledgeBase, kind, itemId);
        if (errors.length) throw new Error(`校验失败：${errors.join("；")}`);
    }
    if (kind === "term") return { ...knowledgeBase, terms: knowledgeBase.terms.map((item) => (item.id === itemId ? { ...item, reviewState, validationErrors: undefined, updatedAt } : item)) };
    if (kind === "recipe") return { ...knowledgeBase, recipes: knowledgeBase.recipes.map((item) => (item.id === itemId ? { ...item, reviewState, validationErrors: undefined, updatedAt } : item)) };
    return { ...knowledgeBase, prompts: knowledgeBase.prompts.map((item) => (item.id === itemId ? { ...item, reviewState, validationErrors: undefined, updatedAt } : item)) };
}

export function validateReviewable(knowledgeBase: PromptKnowledgeBase, kind: ReviewableKind, itemId: string) {
    if (kind === "term") {
        const item = knowledgeBase.terms.find((term) => term.id === itemId);
        if (!item) return ["词条不存在"];
        return [
            ...(item.validationErrors || []),
            !item.text.trim() ? "词条内容为空" : "",
            !item.sourceCaptureIds.length || item.sourceCaptureIds.some((captureId) => !knowledgeBase.captures.some((capture) => capture.id === captureId)) ? "原始收录引用缺失" : "",
        ].filter(Boolean);
    }
    if (kind === "recipe") {
        const item = knowledgeBase.recipes.find((recipe) => recipe.id === itemId);
        if (!item) return ["配方不存在"];
        return [
            ...(item.validationErrors || []),
            !item.title.trim() ? "配方标题为空" : "",
            item.termIds.length < 2 || item.termIds.some((termId) => !knowledgeBase.terms.some((term) => term.id === termId)) ? "词条引用不足或缺失" : "",
            !item.sourceCaptureIds.length || item.sourceCaptureIds.some((captureId) => !knowledgeBase.captures.some((capture) => capture.id === captureId)) ? "原始收录引用缺失" : "",
        ].filter(Boolean);
    }
    const item = knowledgeBase.prompts.find((prompt) => prompt.id === itemId);
    if (!item) return ["完整提示词不存在"];
    return [
        ...(item.validationErrors || []),
        !item.title.trim() || !item.content.trim() ? "标题或内容为空" : "",
        !item.sourceCaptureIds.length || item.sourceCaptureIds.some((captureId) => !knowledgeBase.captures.some((capture) => capture.id === captureId)) ? "原始收录引用缺失" : "",
        item.recipeId && !knowledgeBase.recipes.some((recipe) => recipe.id === item.recipeId) ? "配方引用缺失" : "",
    ].filter(Boolean);
}

export function compileRuntimeLibrary(knowledgeBase: PromptKnowledgeBase, generatedAt = now()): RuntimePromptLibrary {
    const terms = knowledgeBase.terms.filter((item) => item.reviewState === "human_approved" && !item.validationErrors?.length);
    const approvedTermIds = new Set(terms.map((item) => item.id));
    const recipes = knowledgeBase.recipes.filter((item) => item.reviewState === "human_approved" && !item.validationErrors?.length && item.termIds.length >= 2 && item.termIds.every((termId) => approvedTermIds.has(termId)));
    const recipeIds = new Set(recipes.map((item) => item.id));
    return { version: 1, generatedAt, terms, recipes, prompts: knowledgeBase.prompts.filter((item) => item.reviewState === "human_approved" && !item.validationErrors?.length && (!item.recipeId || recipeIds.has(item.recipeId))) };
}

export function recipeContent(recipe: PromptRecipe, terms: VisualTerm[]) {
    return (
        recipe.template ||
        recipe.termIds
            .map((termId) => terms.find((term) => term.id === termId)?.text)
            .filter(Boolean)
            .join(", ")
    );
}
