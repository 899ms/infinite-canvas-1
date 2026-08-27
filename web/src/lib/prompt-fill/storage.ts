import localforage from "localforage";
import type { PromptFillTemplate } from "./templates";

const store = localforage.createInstance({ name: "infinite-canvas", storeName: "prompt_knowledge_base" });
export const PROMPT_FILL_TEMPLATES_KEY = "prompt-fill-templates:v1";

export async function loadCustomPromptFillTemplates() {
    const value = await store.getItem<unknown>(PROMPT_FILL_TEMPLATES_KEY);
    if (!Array.isArray(value)) return [] as PromptFillTemplate[];
    return value.filter((item): item is PromptFillTemplate => Boolean(item) && typeof item === "object" && typeof (item as PromptFillTemplate).id === "string" && typeof (item as PromptFillTemplate).title === "string" && typeof (item as PromptFillTemplate).content === "string").map((item) => ({ ...item, custom: true }));
}
export async function saveCustomPromptFillTemplates(value: PromptFillTemplate[]) { await store.setItem(PROMPT_FILL_TEMPLATES_KEY, value); }
