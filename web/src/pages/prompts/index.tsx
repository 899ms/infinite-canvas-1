import { FolderPlus, Search } from "lucide-react";
import { type KeyboardEvent, type ReactNode, type UIEvent, useEffect, useState } from "react";
import { App, Button, Empty, Input, Spin, Tabs } from "antd";

import { PromptCard } from "@/components/prompts/prompt-card";
import { usePromptList } from "@/components/prompts/use-prompt-list";
import { PromptDetailDialog } from "./components/prompt-detail-dialog";
import { useCopyText } from "@/hooks/use-copy-text";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/use-asset-store";
import { usePromptKnowledgeBaseStore } from "@/stores/use-prompt-knowledge-base-store";
import { usePromptFillStore } from "@/stores/use-prompt-fill-store";
import { ALL_PROMPTS_OPTION, type Prompt } from "@/services/api/prompts";
import { PromptDashboard } from "./dashboard";

export default function PromptsPage() {
    const [view, setView] = useState(() => (new URLSearchParams(window.location.search).get("view") === "mine" ? "mine" : "public"));
    const changeView = (next: string) => {
        setView(next);
        const url = new URL(window.location.href);
        url.searchParams.set("view", next);
        window.history.replaceState({}, "", url);
    };
    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
            <div className="shrink-0 border-b border-stone-200 bg-background px-4 dark:border-stone-800 sm:px-6">
                <Tabs
                    className="mx-auto max-w-7xl"
                    activeKey={view}
                    onChange={changeView}
                    items={[
                        { key: "public", label: "公开提示词库" },
                        { key: "mine", label: "我的仪表盘" },
                    ]}
                />
            </div>
            {view === "mine" ? <PromptDashboard /> : <PublicPromptLibrary />}
        </div>
    );
}

function PublicPromptLibrary() {
    const { message } = App.useApp();
    const [titleKeyword, setTitleKeyword] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(ALL_PROMPTS_OPTION);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const addAsset = useAssetStore((state) => state.addAsset);
    const capture = usePromptKnowledgeBaseStore((state) => state.capture);
    const savePromptFillTemplate = usePromptFillStore((state) => state.save);
    const hydratePromptFill = usePromptFillStore((state) => state.hydrate);
    const promptFillHydrated = usePromptFillStore((state) => state.hydrated);
    const hydrateKnowledgeBase = usePromptKnowledgeBaseStore((state) => state.hydrate);
    const knowledgeBaseHydrated = usePromptKnowledgeBaseStore((state) => state.hydrated);
    const copyText = useCopyText();
    const { query, items: promptItems, tags: promptTags, categories: promptCategoryOptions, total: totalPrompts } = usePromptList({ keyword: titleKeyword, tags: selectedTags, category: selectedCategory });

    useEffect(() => {
        if (!knowledgeBaseHydrated) void hydrateKnowledgeBase();
    }, [hydrateKnowledgeBase, knowledgeBaseHydrated]);
    useEffect(() => {
        if (!promptFillHydrated) void hydratePromptFill();
    }, [hydratePromptFill, promptFillHydrated]);

    useEffect(() => {
        if (query.isError) message.error(query.error instanceof Error ? query.error.message : "获取提示词失败");
    }, [message, query.error, query.isError]);

    const toggleTag = (tag: string) => {
        if (tag === ALL_PROMPTS_OPTION) return setSelectedTags([]);
        setSelectedTags((items) => (items.includes(tag) ? items.filter((item) => item !== tag) : [...items, tag]));
    };

    const savePromptAsset = (item: Prompt) => {
        addAsset({ kind: "text", title: item.title, coverUrl: item.coverUrl, tags: item.tags, source: item.category, data: { content: item.prompt }, metadata: { source: "prompt-library", promptId: item.id, githubUrl: item.githubUrl } });
        message.success("已加入我的资产");
    };
    const capturePrompt = async (item: Prompt) => {
        if (!knowledgeBaseHydrated) await hydrateKnowledgeBase();
        await capture({ sourceType: "remote-prompt", content: item.prompt, sourceLabel: item.title, sourceRef: { sourceId: item.sourceId, promptId: item.id, sourceUrl: item.githubUrl }, metadata: { tags: item.tags } });
        message.success("已收录到我的提示词仪表盘");
    };
    const loadPromptFill = async (item: Prompt) => {
        if (!promptFillHydrated) await hydratePromptFill();
        await savePromptFillTemplate({ title: item.title, content: item.prompt, description: "从公开词库载入", category: "公开收录" });
        await capturePrompt(item);
        message.success("已保存为自定义 PromptFill 模板，请切换到我的仪表盘使用");
    };

    const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        if (query.hasNextPage && !query.isFetchingNextPage && target.scrollTop + target.clientHeight >= target.scrollHeight - 160) void query.fetchNextPage();
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-stone-800 dark:text-stone-100">
            <main
                className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] px-4 py-6 [background-size:16px_16px] sm:px-6 lg:py-8 dark:bg-[radial-gradient(rgba(245,245,244,.16)_1px,transparent_1px)]"
                onScroll={handleListScroll}
            >
                <div className="mx-auto min-w-0 max-w-7xl">
                    <div className="text-center">
                        <h1 className="page-title text-stone-950 dark:text-stone-100">提示词中心</h1>
                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">当前共 {totalPrompts} 条提示词</p>
                    </div>
                    <div className="mt-5 grid min-w-0 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
                        <aside className="thin-scrollbar min-w-0 max-w-full border-b border-stone-200 pb-5 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:pb-8 lg:pr-5 dark:border-stone-800">
                            <PromptFilter label="分类" options={promptCategoryOptions} selected={selectedCategory} onChange={setSelectedCategory} />
                            <div className="mt-4 lg:mt-6">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">标签</div>
                                <div className="thin-scrollbar flex max-w-full gap-1.5 overflow-x-auto lg:flex-wrap lg:overflow-visible">
                                    {promptTags.map((tag) => {
                                        const active = tag === ALL_PROMPTS_OPTION ? selectedTags.length === 0 : selectedTags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                aria-pressed={active}
                                                className={cn("prompt-filter-tag shrink-0", active && "is-active")}
                                                onClick={() => toggleTag(tag)}
                                                onKeyDown={(event) => activateWithKeyboard(event, () => toggleTag(tag))}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </aside>
                        <section className="min-w-0">
                            <Input size="large" prefix={<Search className="size-4 text-stone-400" />} value={titleKeyword} placeholder="搜索标题、内容或标签" onChange={(event) => setTitleKeyword(event.target.value)} />
                            {query.isLoading ? (
                                <div className="flex h-60 items-center justify-center">
                                    <Spin />
                                </div>
                            ) : null}
                            {!query.isLoading ? (
                                <div className="mt-5">
                                    <PromptGrid
                                        items={promptItems}
                                        onOpen={setSelectedPrompt}
                                        renderActions={(item) => <SpaceActions onSave={() => savePromptAsset(item)} onCapture={() => void capturePrompt(item)} />}
                                        onCopy={(item) => copyText(item.prompt, "提示词已复制")}
                                        emptyText="没有找到匹配的提示词"
                                    />
                                </div>
                            ) : null}
                            <div className="mt-6 text-center text-xs text-stone-500 dark:text-stone-400">{query.isFetchingNextPage ? "加载中..." : query.hasNextPage ? "继续向下滚动加载更多" : promptItems.length > 0 ? "已经到底了" : null}</div>
                        </section>
                    </div>
                </div>
            </main>

            <PromptDetailDialog
                prompt={selectedPrompt}
                onClose={() => setSelectedPrompt(null)}
                onCopy={(prompt) => copyText(prompt, "提示词已复制")}
                onSaveAsset={savePromptAsset}
                onCapture={(item) => void capturePrompt(item)}
                onLoadPromptFill={(item) => void loadPromptFill(item)}
            />
        </div>
    );
}

function PromptFilter({ label, options, selected, onChange }: { label: string; options: string[]; selected: string; onChange: (value: string) => void }) {
    return (
        <div className="min-w-0 max-w-full">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">{label}</div>
            <div className="thin-scrollbar flex max-w-full gap-1.5 overflow-x-auto lg:flex-wrap lg:overflow-visible">
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        aria-pressed={selected === option}
                        className={cn("prompt-filter-tag shrink-0", selected === option && "is-active")}
                        onClick={() => onChange(option)}
                        onKeyDown={(event) => activateWithKeyboard(event, () => onChange(option))}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
}

function activateWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, action: () => void) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
}

function PromptGrid({ items, onOpen, onCopy, renderActions, emptyText }: { items: Prompt[]; onOpen: (item: Prompt) => void; onCopy: (item: Prompt) => void; renderActions: (item: Prompt) => ReactNode; emptyText: string }) {
    return (
        <div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                    <PromptCard key={`${item.sourceId}:${item.id}`} item={item} onOpen={() => onOpen(item)} onCopy={() => onCopy(item)} extraAction={renderActions(item)} />
                ))}
            </div>
            {items.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} className="py-16" /> : null}
        </div>
    );
}

function SpaceActions({ onSave, onCapture }: { onSave: () => void; onCapture: () => void }) {
    return (
        <>
            <Button size="small" icon={<FolderPlus className="size-3.5" />} onClick={onSave}>
                加入资产
            </Button>
            <Button size="small" onClick={onCapture}>
                收录
            </Button>
        </>
    );
}
