import localforage from "localforage";

import { createEmptyPromptKnowledgeBase, type PromptKnowledgeBase } from "./domain";
import { importMigrationSnapshot } from "./import-export";

const store = localforage.createInstance({ name: "infinite-canvas", storeName: "prompt_knowledge_base" });
export const PROMPT_KNOWLEDGE_BASE_KEY = "prompt-knowledge-base:v1";

export async function loadPromptKnowledgeBase(): Promise<PromptKnowledgeBase> {
    const value = await store.getItem<PromptKnowledgeBase>(PROMPT_KNOWLEDGE_BASE_KEY);
    return value ? importMigrationSnapshot(JSON.stringify({ knowledgeBase: value })).knowledgeBase : createEmptyPromptKnowledgeBase();
}

export async function savePromptKnowledgeBase(value: PromptKnowledgeBase) {
    await store.setItem(PROMPT_KNOWLEDGE_BASE_KEY, value);
}
