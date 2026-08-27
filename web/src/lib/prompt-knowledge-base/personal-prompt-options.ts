import { preferenceSignals, type FeedbackMap } from "@/lib/image-feedback";
import { recipeContent, type RuntimePromptLibrary } from "./domain";
import type { Prompt } from "@/services/api/prompts";

type Candidate = { id: string; title: string; prompt: string; description: string; tags: string[]; category: string; createdAt: string; updatedAt: string };

export function personalPromptOptions(runtime: RuntimePromptLibrary, feedback: FeedbackMap): Prompt[] {
    const candidates: Candidate[] = [
        ...runtime.prompts.map((item) => ({ id: item.id, title: item.title, prompt: item.content, description: "人工审核通过的完整提示词", tags: ["完整提示词"], category: "我的完整提示词", createdAt: item.createdAt, updatedAt: item.updatedAt })),
        ...runtime.recipes.map((item) => ({ id: item.id, title: item.title, prompt: recipeContent(item, runtime.terms), description: "人工审核通过的视觉配方", tags: ["配方"], category: "我的配方", createdAt: item.createdAt, updatedAt: item.updatedAt })),
        ...runtime.terms.map((item) => ({
            id: item.id,
            title: item.text,
            prompt: item.text,
            description: item.visualDuty || "人工审核通过的视觉词条",
            tags: ["词条", item.browseCategory],
            category: "我的词条",
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        })),
    ];
    const signals = preferenceSignals(feedback);
    const score = (item: Candidate) =>
        [...signals.styles, ...signals.scenes].reduce(
            (total, signal) => (`${item.title} ${item.prompt} ${item.description} ${item.tags.join(" ")}`.toLocaleLowerCase("zh-CN").includes(signal.label.toLocaleLowerCase("zh-CN")) ? total + signal.score : total),
            0,
        );
    return candidates
        .sort((a, b) => score(b) - score(a) || b.updatedAt.localeCompare(a.updatedAt))
        .map((item) => ({ ...item, id: `personal-${item.id}`, coverUrl: "", referenceImageUrls: [], preview: "", sourceId: "personal-runtime", sourceUrl: "", githubUrl: "" }));
}
