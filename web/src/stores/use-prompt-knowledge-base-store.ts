import { create } from "zustand";

import {
    addCapture,
    addPromptCandidate,
    addRecipeCandidate,
    addTermCandidate,
    createEmptyPromptKnowledgeBase,
    setReviewState,
    type Capture,
    type CompletePrompt,
    type PromptKnowledgeBase,
    type PromptRecipe,
    type ReviewState,
    type VisualTerm,
} from "@/lib/prompt-knowledge-base/domain";
import { loadPromptKnowledgeBase, savePromptKnowledgeBase } from "@/lib/prompt-knowledge-base/storage";
import { persistBeforeCommit } from "@/lib/persisted-state";

type Store = {
    hydrated: boolean;
    error?: string;
    data: PromptKnowledgeBase;
    hydrate: () => Promise<void>;
    replace: (data: PromptKnowledgeBase) => Promise<void>;
    capture: (value: Omit<Capture, "id" | "createdAt" | "status" | "derivedTermIds" | "derivedRecipeIds" | "derivedPromptIds">) => Promise<string>;
    addTerm: (value: { text: string; sourceCaptureIds: string[]; browseCategory?: VisualTerm["browseCategory"]; visualDuty?: string }) => Promise<void>;
    addRecipe: (value: { title: string; termIds: string[]; sourceCaptureIds: string[]; template?: string }) => Promise<void>;
    addPrompt: (value: { title: string; content: string; sourceCaptureIds: string[]; recipeId?: string }) => Promise<void>;
    review: (kind: "term" | "recipe" | "prompt", itemId: string, state: ReviewState) => Promise<void>;
};

async function persist(data: PromptKnowledgeBase, set: (next: Partial<Store>) => void) {
    try {
        await persistBeforeCommit(data, savePromptKnowledgeBase, (saved) => set({ data: saved, error: undefined }));
    } catch (reason) {
        set({ error: reason instanceof Error ? reason.message : "提示词知识库保存失败" });
        throw reason;
    }
}

export const usePromptKnowledgeBaseStore = create<Store>((set, get) => ({
    hydrated: false,
    data: createEmptyPromptKnowledgeBase(),
    hydrate: async () => {
        try { set({ data: await loadPromptKnowledgeBase(), hydrated: true, error: undefined }); }
        catch (reason) { set({ hydrated: true, error: reason instanceof Error ? reason.message : "提示词知识库读取失败；原数据未被覆盖" }); }
    },
    replace: async (data) => persist(data, set),
    capture: async (value) => { const data = addCapture(get().data, value); await persist(data, set); return data.captures.at(-1)!.id; },
    addTerm: async (value) => persist(addTermCandidate(get().data, value), set),
    addRecipe: async (value) => persist(addRecipeCandidate(get().data, value), set),
    addPrompt: async (value) => persist(addPromptCandidate(get().data, value), set),
    review: async (kind, itemId, state) => persist(setReviewState(get().data, kind, itemId, state), set),
}));

export type { CompletePrompt, PromptRecipe, VisualTerm };
