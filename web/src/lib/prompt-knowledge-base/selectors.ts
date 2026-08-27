import { compileRuntimeLibrary, type PromptKnowledgeBase, type ReviewableKind } from "./domain";

export function reviewQueue(knowledgeBase: PromptKnowledgeBase) {
    const toItem = (kind: ReviewableKind, item: { id: string; reviewState: string; title?: string; text?: string }) => ({ kind, ...item });
    return [...knowledgeBase.terms.map((item) => toItem("term", item)), ...knowledgeBase.recipes.map((item) => toItem("recipe", item)), ...knowledgeBase.prompts.map((item) => toItem("prompt", item))].filter((item) => item.reviewState !== "human_approved");
}

export function searchRuntime(knowledgeBase: PromptKnowledgeBase, query: string) {
    const value = query.trim().toLocaleLowerCase("zh-CN"); const runtime = compileRuntimeLibrary(knowledgeBase);
    if (!value) return runtime;
    return { ...runtime, terms: runtime.terms.filter((item) => [item.text, item.browseCategory, item.visualDuty].join(" ").toLocaleLowerCase("zh-CN").includes(value)), recipes: runtime.recipes.filter((item) => item.title.toLocaleLowerCase("zh-CN").includes(value)), prompts: runtime.prompts.filter((item) => [item.title, item.content].join(" ").toLocaleLowerCase("zh-CN").includes(value)) };
}
