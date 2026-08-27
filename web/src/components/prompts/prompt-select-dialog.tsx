import { Search } from "lucide-react";
import { type UIEvent, useEffect, useMemo, useState } from "react";
import { App, Empty, Input, Modal, Segmented, Spin } from "antd";
import { useTranslation } from "react-i18next";

import { ALL_PROMPTS_OPTION } from "@/services/api/prompts";
import { cn } from "@/lib/utils";
import { PromptCard } from "./prompt-card";
import { usePromptList } from "./use-prompt-list";
import { compileRuntimeLibrary } from "@/lib/prompt-knowledge-base/domain";
import { personalPromptOptions } from "@/lib/prompt-knowledge-base/personal-prompt-options";
import { usePromptKnowledgeBaseStore } from "@/stores/use-prompt-knowledge-base-store";
import { useImageFeedbackStore } from "@/stores/use-image-feedback-store";

export function PromptSelectDialog({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (prompt: string) => void }) {
    const { message } = App.useApp();
    const { t } = useTranslation();
    const [library, setLibrary] = useState<"public" | "personal">("public");
    const [keyword, setKeyword] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(ALL_PROMPTS_OPTION);
    const { query, items, tags: publicTags, categories: publicCategories } = usePromptList({ keyword, tags: selectedTags, category: selectedCategory, enabled: open && library === "public" });
    const knowledgeBase = usePromptKnowledgeBaseStore((state) => state.data);
    const knowledgeBaseHydrated = usePromptKnowledgeBaseStore((state) => state.hydrated);
    const hydrateKnowledgeBase = usePromptKnowledgeBaseStore((state) => state.hydrate);
    const feedback = useImageFeedbackStore((state) => state.feedback);
    const feedbackHydrated = useImageFeedbackStore((state) => state.hydrated);
    const hydrateFeedback = useImageFeedbackStore((state) => state.hydrate);
    const personalItems = useMemo(() => personalPromptOptions(compileRuntimeLibrary(knowledgeBase), feedback), [feedback, knowledgeBase]);
    const personalCategories = useMemo(() => [ALL_PROMPTS_OPTION, ...new Set(personalItems.map((item) => item.category))], [personalItems]);
    const personalTags = useMemo(() => [ALL_PROMPTS_OPTION, ...new Set(personalItems.flatMap((item) => item.tags))], [personalItems]);
    const visibleItems = useMemo(
        () =>
            library === "public"
                ? items
                : personalItems.filter((item) => {
                      if (selectedCategory !== ALL_PROMPTS_OPTION && item.category !== selectedCategory) return false;
                      if (selectedTags.length && !selectedTags.some((tag) => item.tags.includes(tag))) return false;
                      const value = keyword.trim().toLocaleLowerCase("zh-CN");
                      return !value || [item.title, item.prompt, item.description, ...item.tags].join(" ").toLocaleLowerCase("zh-CN").includes(value);
                  }),
        [items, keyword, library, personalItems, selectedCategory, selectedTags],
    );
    const promptTags = library === "public" ? publicTags : personalTags;
    const promptCategories = library === "public" ? publicCategories : personalCategories;
    const toggleTag = (tag: string) => {
        if (tag === ALL_PROMPTS_OPTION) return setSelectedTags([]);
        setSelectedTags((items) => (items.includes(tag) ? items.filter((item) => item !== tag) : [...items, tag]));
    };
    const selectPrompt = (prompt: string) => {
        onSelect(prompt);
        onOpenChange(false);
    };

    useEffect(() => {
        if (library === "public" && query.isError) message.error(query.error instanceof Error ? query.error.message : t("prompts.loadFailed"));
    }, [library, message, query.error, query.isError, t]);
    useEffect(() => {
        if (!open || library !== "personal") return;
        if (!knowledgeBaseHydrated) void hydrateKnowledgeBase();
        if (!feedbackHydrated) void hydrateFeedback();
    }, [feedbackHydrated, hydrateFeedback, hydrateKnowledgeBase, knowledgeBaseHydrated, library, open]);
    useEffect(() => {
        setSelectedCategory(ALL_PROMPTS_OPTION);
        setSelectedTags([]);
    }, [library]);

    const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        if (library === "public" && query.hasNextPage && !query.isFetchingNextPage && target.scrollTop + target.clientHeight >= target.scrollHeight - 160) void query.fetchNextPage();
    };

    return (
        <Modal title={t("prompts.library")} open={open} onCancel={() => onOpenChange(false)} footer={null} width={880} centered>
            <Segmented
                block
                value={library}
                options={[
                    { label: "公开提示词库", value: "public" },
                    { label: `我的可用库 (${personalItems.length})`, value: "personal" },
                ]}
                onChange={(value) => setLibrary(value as "public" | "personal")}
            />
            <div className="mt-4 grid h-[58dvh] min-h-0 gap-5 sm:grid-cols-[200px_minmax(0,1fr)]" data-canvas-no-zoom onWheelCapture={(event) => event.stopPropagation()}>
                <aside className="thin-scrollbar min-h-0 overflow-y-auto border-r border-stone-200 pr-4 dark:border-stone-800">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">{t("prompts.category")}</div>
                    <div className="flex flex-wrap gap-1.5">
                        {promptCategories.map((category) => (
                            <button type="button" key={category} aria-pressed={selectedCategory === category} className={cn("prompt-filter-tag", selectedCategory === category && "is-active")} onClick={() => setSelectedCategory(category)}>
                                {category === ALL_PROMPTS_OPTION ? t("common.all") : category}
                            </button>
                        ))}
                    </div>
                    <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">{t("prompts.tags")}</div>
                    <div className="flex flex-wrap gap-1.5">
                        {promptTags.map((tag) => {
                            const active = tag === ALL_PROMPTS_OPTION ? selectedTags.length === 0 : selectedTags.includes(tag);
                            return (
                                <button type="button" key={tag} aria-pressed={active} className={cn("prompt-filter-tag", active && "is-active")} onClick={() => toggleTag(tag)}>
                                    {tag === ALL_PROMPTS_OPTION ? t("common.all") : tag}
                                </button>
                            );
                        })}
                    </div>
                </aside>
                <section className="flex min-h-0 min-w-0 flex-col">
                    <Input size="large" prefix={<Search className="size-4 text-stone-400" />} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={t("prompts.searchTitle")} />
                    <div className="thin-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto pr-2" data-canvas-no-zoom onScroll={handleListScroll} onWheelCapture={(event) => event.stopPropagation()}>
                        {library === "public" && query.isLoading ? (
                            <div className="flex h-40 items-center justify-center">
                                <Spin />
                            </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            {visibleItems.map((item) => (
                                <PromptCard key={item.id} item={item} onOpen={() => selectPrompt(item.prompt)} onCopy={() => selectPrompt(item.prompt)} compact />
                            ))}
                        </div>
                        {!(library === "public" && query.isLoading) && visibleItems.length === 0 ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={library === "personal" ? "还没有人工审核通过的个人提示词" : t("prompts.empty")} className="py-8" />
                        ) : null}
                        {library === "public" && query.isFetchingNextPage ? (
                            <div className="py-4 text-center">
                                <Spin size="small" />
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>
        </Modal>
    );
}
