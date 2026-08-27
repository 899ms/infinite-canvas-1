import { create } from "zustand";
import type { PromptFillTemplate } from "@/lib/prompt-fill/templates";
import { loadCustomPromptFillTemplates, saveCustomPromptFillTemplates } from "@/lib/prompt-fill/storage";
import { persistBeforeCommit } from "@/lib/persisted-state";

type Store = { hydrated: boolean; templates: PromptFillTemplate[]; error?: string; hydrate: () => Promise<void>; replace: (value: PromptFillTemplate[]) => Promise<void>; save: (value: Omit<PromptFillTemplate, "id" | "custom" | "createdAt">) => Promise<void>; remove: (id: string) => Promise<void> };
export const usePromptFillStore = create<Store>((set, get) => ({
    hydrated: false, templates: [],
    hydrate: async () => { try { set({ templates: await loadCustomPromptFillTemplates(), hydrated: true, error: undefined }); } catch (reason) { set({ hydrated: true, error: reason instanceof Error ? reason.message : "自定义模板读取失败；原数据未被覆盖" }); } },
    replace: async (templates) => persist(templates, set),
    save: async (value) => { const template = { ...value, id: `custom_${crypto.randomUUID()}`, custom: true, createdAt: new Date().toISOString() }; await persist([...get().templates, template], set); },
    remove: async (id) => persist(get().templates.filter((item) => item.id !== id), set),
}));

async function persist(templates: PromptFillTemplate[], set: (next: Partial<Store>) => void) {
    try { await persistBeforeCommit(templates, saveCustomPromptFillTemplates, (saved) => set({ templates: saved, error: undefined })); }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : "自定义模板保存失败" }); throw reason; }
}
