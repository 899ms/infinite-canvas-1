import { Columns3, Copy, Download, Grid2X2, Images, PencilLine, Plus, Search, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Drawer, Empty, Form, Image, Input, Modal, Popconfirm, Segmented, Select, Space, Tag, Typography } from "antd";
import { saveAs } from "file-saver";

import { useCopyText } from "@/hooks/use-copy-text";
import { formatBytes, readFileAsDataUrl } from "@/lib/image-utils";
import { uploadImage } from "@/services/image-storage";
import { cn } from "@/lib/utils";
import { useAssetStore, type Asset, type AssetKind, type ImageAsset } from "@/stores/use-asset-store";
import { feedbackLabel, preferenceSignals, type ImageFeedback } from "@/lib/image-feedback";
import { useImageFeedbackStore } from "@/stores/use-image-feedback-store";
import { usePromptKnowledgeBaseStore } from "@/stores/use-prompt-knowledge-base-store";
import { ImageFeedbackRating } from "@/components/image-feedback-rating";
import { exportAssets, readAssetPackage, type AssetExportReceipt } from "./asset-transfer";

type AssetFormValues = {
    kind: AssetKind;
    title: string;
    coverUrl: string;
    tags: string[];
    source?: string;
    note?: string;
    content?: string;
};

type ImageDraft = ImageAsset["data"] | null;
type SortMode = "recommend" | "rating" | "latest";
type DensityMode = "comfortable" | "compact";

const kindOptions = [
    { label: "全部", value: "all" },
    { label: "文本", value: "text" },
    { label: "图片", value: "image" },
    { label: "视频", value: "video" },
];

export default function AssetsPage() {
    const { message } = App.useApp();
    const copyText = useCopyText();
    const [form] = Form.useForm<AssetFormValues>();
    const coverInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const assetInputRef = useRef<HTMLInputElement>(null);
    const assets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const removeAsset = useAssetStore((state) => state.removeAsset);
    const feedback = useImageFeedbackStore((state) => state.feedback);
    const feedbackHydrated = useImageFeedbackStore((state) => state.hydrated);
    const hydrateFeedback = useImageFeedbackStore((state) => state.hydrate);
    const setFeedback = useImageFeedbackStore((state) => state.setFeedback);
    const removeFeedback = useImageFeedbackStore((state) => state.removeFeedback);
    const captureKnowledge = usePromptKnowledgeBaseStore((state) => state.capture);
    const hydrateKnowledge = usePromptKnowledgeBaseStore((state) => state.hydrate);
    const knowledgeHydrated = usePromptKnowledgeBaseStore((state) => state.hydrated);
    const [keyword, setKeyword] = useState("");
    const [kindFilter, setKindFilter] = useState<AssetKind | "all">("all");
    const [tagFilter, setTagFilter] = useState("");
    const [feedbackView, setFeedbackView] = useState<"visible" | "hidden">("visible");
    const [sortMode, setSortMode] = useState<SortMode>("recommend");
    const [density, setDensity] = useState<DensityMode>("comfortable");
    const [visibleCount, setVisibleCount] = useState(40);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [isAssetOpen, setIsAssetOpen] = useState(false);
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
    const [formKind, setFormKind] = useState<AssetKind>("text");
    const [imageDraft, setImageDraft] = useState<ImageDraft>(null);
    const [exportReceipt, setExportReceipt] = useState<AssetExportReceipt | null>(null);
    const coverUrl = Form.useWatch("coverUrl", form) || "";
    const title = Form.useWatch("title", form) || "";
    const tags = Form.useWatch("tags", form) || [];
    const content = Form.useWatch("content", form) || "";
    const validAssets = useMemo(() => assets.filter((asset) => asset.kind === "text" || asset.kind === "image" || asset.kind === "video"), [assets]);
    const hasActiveFilters = Boolean(keyword) || kindFilter !== "all" || Boolean(tagFilter) || feedbackView !== "visible";
    const popularTags = useMemo(() => {
        const counts = new Map<string, number>();
        validAssets.forEach((asset) => asset.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
        return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN")).slice(0, 12).map(([tag]) => tag);
    }, [validAssets]);

    const filteredAssets = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return validAssets.filter((asset) => {
            if (kindFilter !== "all" && asset.kind !== kindFilter) return false;
            if (tagFilter && !asset.tags.includes(tagFilter)) return false;
            if (feedbackView === "hidden" ? !feedback[asset.id]?.hidden : feedback[asset.id]?.hidden) return false;
            if (!query) return true;
            return assetSearchText(asset).includes(query);
        });
    }, [validAssets, keyword, kindFilter, tagFilter, feedback, feedbackView]);

    const sortedAssets = useMemo(() => [...filteredAssets].sort((left, right) => assetSortScore(right, sortMode, feedback[right.id]) - assetSortScore(left, sortMode, feedback[left.id])), [filteredAssets, sortMode, feedback]);
    const visibleAssets = useMemo(() => sortedAssets.slice(0, visibleCount), [sortedAssets, visibleCount]);

    useEffect(() => {
        setVisibleCount(40);
    }, [keyword, kindFilter, tagFilter, feedbackView, sortMode]);
    useEffect(() => { if (!feedbackHydrated) void hydrateFeedback(); }, [feedbackHydrated, hydrateFeedback]);
    useEffect(() => { if (!knowledgeHydrated) void hydrateKnowledge(); }, [hydrateKnowledge, knowledgeHydrated]);
    const preference = useMemo(() => preferenceSignals(feedback), [feedback]);

    const openCreate = () => {
        setEditingAsset(null);
        setImageDraft(null);
        setFormKind("text");
        form.setFieldsValue({ kind: "text", title: "", coverUrl: "", tags: [], source: "手动添加", note: "", content: "" });
        setIsAssetOpen(true);
    };

    const openEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setFormKind(asset.kind);
        setImageDraft(asset.kind === "image" ? asset.data : null);
        form.setFieldsValue({
            kind: asset.kind,
            title: asset.title,
            coverUrl: asset.coverUrl,
            tags: asset.tags || [],
            source: asset.source,
            note: asset.note,
            content: asset.kind === "text" ? asset.data.content : "",
        });
        setIsAssetOpen(true);
    };

    const saveAsset = async () => {
        const values = await form.validateFields();
        const base = {
            title: values.title.trim(),
            coverUrl: values.coverUrl?.trim() || (values.kind === "image" && imageDraft ? imageDraft.dataUrl : ""),
            tags: values.tags || [],
            source: values.source?.trim(),
            note: values.note?.trim(),
            metadata: editingAsset?.metadata || { source: "manual" },
        };

        if (values.kind === "text") {
            const asset = { ...base, kind: "text" as const, data: { content: (values.content || "").trim() } };
            editingAsset ? updateAsset(editingAsset.id, asset) : addAsset(asset);
        } else {
            if (!imageDraft) {
                message.error("请选择图片文件");
                return;
            }
            const asset = { ...base, kind: "image" as const, data: imageDraft };
            editingAsset ? updateAsset(editingAsset.id, asset) : addAsset(asset);
        }

        message.success(editingAsset ? "资产已更新" : "资产已保存");
        setIsAssetOpen(false);
    };

    const readCoverFile = async (file?: File) => {
        if (!file) return;
        const dataUrl = await readFileAsDataUrl(file);
        form.setFieldValue("coverUrl", dataUrl);
    };

    const readImageFile = async (file?: File) => {
        if (!file || !file.type.startsWith("image/")) return;
        const image = await uploadImage(file);
        const draft = { dataUrl: image.url, storageKey: image.storageKey, width: image.width, height: image.height, bytes: image.bytes, mimeType: image.mimeType };
        setImageDraft(draft);
        if (!form.getFieldValue("coverUrl")) form.setFieldValue("coverUrl", draft.dataUrl);
        if (!form.getFieldValue("title")) form.setFieldValue("title", file.name);
    };

    const copyAssetText = async (asset: Asset) => {
        if (asset.kind !== "text") return;
        copyText(asset.data.content, "文本已复制");
    };

    const downloadImage = (asset: Asset) => {
        if (asset.kind !== "image" && asset.kind !== "video") return;
        saveAs(asset.kind === "video" ? asset.data.url : asset.data.dataUrl, `${asset.title || "asset"}.${asset.data.mimeType.split("/")[1] || "png"}`);
    };

    const exportAllAssets = async () => {
        if (!validAssets.length) {
            message.warning("暂无资产可导出");
            return;
        }
        try {
            const receipt = await exportAssets(validAssets);
            setExportReceipt(receipt);
            message.success(`资产包已校验，可安全导入（${receipt.assetCount} 个资产，${receipt.mediaFileCount} 个媒体文件）`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "资产导出校验失败");
        }
    };

    const importAssetZip = async (file?: File) => {
        if (!file) return;
        try {
            const importedAssets = await readAssetPackage(file);
            importedAssets.forEach((asset) => {
                const payload = { ...asset } as Record<string, unknown>;
                delete payload.id;
                delete payload.createdAt;
                delete payload.updatedAt;
                addAsset(payload as Parameters<typeof addAsset>[0]);
            });
            message.success(`已导入 ${importedAssets.length} 个资产`);
        } catch {
            message.error("导入失败，请选择有效的资产压缩包");
        } finally {
            if (assetInputRef.current) assetInputRef.current.value = "";
        }
    };

    const confirmDelete = async () => {
        if (!deletingAsset) return;
        await removeFeedback(deletingAsset.id);
        removeAsset(deletingAsset.id);
        message.success("资产已删除");
        setDeletingAsset(null);
    };
    const captureAsset = async (asset: Asset) => {
        if (!knowledgeHydrated) await hydrateKnowledge();
        const content = asset.kind === "text" ? asset.data.content : typeof asset.metadata?.prompt === "string" ? asset.metadata.prompt : asset.note || asset.title;
        try { await captureKnowledge({ sourceType: "asset", content, sourceLabel: asset.title, sourceRef: { assetId: asset.id } }); message.success("已收录资产来源到我的提示词仪表盘"); } catch (error) { message.error(error instanceof Error ? error.message : "收录失败"); }
    };
    const clearFilters = () => {
        setKeyword("");
        setKindFilter("all");
        setTagFilter("");
        setFeedbackView("visible");
        setSortMode("recommend");
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-stone-900 dark:text-stone-100">
            <main className="min-h-0 flex-1 overflow-y-auto bg-background">
                <div className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur">
                    <div className="flex min-w-max items-center gap-1 overflow-x-auto px-4 pt-2 sm:px-6">
                        {kindOptions.map((option) => {
                            const active = !tagFilter && kindFilter === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={cn("relative cursor-pointer whitespace-nowrap px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active && "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-foreground")}
                                    onClick={() => {
                                        setKindFilter(option.value as AssetKind | "all");
                                        setTagFilter("");
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                        {popularTags.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                className={cn("relative cursor-pointer whitespace-nowrap px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tagFilter === tag && "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-foreground")}
                                onClick={() => {
                                    setKindFilter("all");
                                    setTagFilter(tag);
                                }}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:px-6 lg:flex-row lg:items-center">
                        <Input
                            allowClear
                            prefix={<Search className="size-4 text-muted-foreground" />}
                            value={keyword}
                            placeholder="搜索风格、主题、标题、标签或来源"
                            className="min-w-0 flex-1"
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
                            <span className="mr-1 text-xs text-muted-foreground">共 {sortedAssets.length} 个资产</span>
                            <Segmented<SortMode>
                                size="small"
                                value={sortMode}
                                options={[
                                    { label: "推荐", value: "recommend" },
                                    { label: "高评分", value: "rating" },
                                    { label: "最新", value: "latest" },
                                ]}
                                onChange={setSortMode}
                            />
                            <Button type={feedbackView === "hidden" ? "primary" : "default"} size="small" onClick={() => setFeedbackView((value) => (value === "visible" ? "hidden" : "visible"))}>
                                {feedbackView === "hidden" ? "返回资产库" : "已隐藏"}
                            </Button>
                            <Button size="small" icon={density === "comfortable" ? <Columns3 className="size-4" /> : <Grid2X2 className="size-4" />} aria-label="切换卡片密度" onClick={() => setDensity((value) => (value === "comfortable" ? "compact" : "comfortable"))} />
                            <Button size="small" icon={<Upload className="size-4" />} aria-label="导入资产" onClick={() => assetInputRef.current?.click()} />
                            <Button size="small" aria-label="导出资产" onClick={() => void exportAllAssets()}>导出</Button>
                            <Button type="primary" size="small" icon={<Plus className="size-4" />} onClick={openCreate}>新增</Button>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-5 sm:px-6">
                    {exportReceipt ? <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" role="status" aria-label="资产导出校验结果">已校验 {exportReceipt.fileName}：{exportReceipt.assetCount} 个资产、{exportReceipt.mediaFileCount} 个媒体文件、{formatBytes(exportReceipt.bytes)}；该压缩包可重新导入。</div> : null}
                    {preference.styles.length || preference.scenes.length ? <div className="mb-3 flex flex-wrap items-center gap-1.5 px-1 text-xs"><span className="mr-1 text-muted-foreground">审美偏好</span>{preference.styles.map((item) => <Tag key={`style-${item.label}`} color={item.score > 0 ? "green" : "red"}>{item.score > 0 ? "+" : ""}{item.score} {item.label}</Tag>)}{preference.scenes.map((item) => <Tag key={`scene-${item.label}`} color={item.score > 0 ? "green" : "red"}>{item.score > 0 ? "+" : ""}{item.score} {item.label}</Tag>)}</div> : null}

                    <div className={cn("[column-gap:16px]", density === "comfortable" ? "[column-width:292px]" : "[column-width:232px]")}>
                        {visibleAssets.map((asset) => (
                            <AssetCard key={asset.id} asset={asset} compact={density === "compact"} onOpen={() => setPreviewAsset(asset)} onEdit={() => openEdit(asset)} onCopy={copyAssetText} onDownload={downloadImage} onDelete={() => setDeletingAsset(asset)} />
                        ))}
                    </div>

                    {!visibleAssets.length ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-24" description={hasActiveFilters ? "没有匹配条件的资产" : "还没有资产，先收集第一张灵感图"}>
                            <Button type="primary" icon={hasActiveFilters ? undefined : <Plus className="size-4" />} onClick={hasActiveFilters ? clearFilters : openCreate}>{hasActiveFilters ? "清除筛选" : "新增资产"}</Button>
                        </Empty>
                    ) : null}

                    {visibleAssets.length < sortedAssets.length ? <div className="flex justify-center py-8"><Button onClick={() => setVisibleCount((value) => value + 40)}>加载更多</Button></div> : null}
                </div>
            </main>

            <Modal title={editingAsset ? "编辑资产" : "新增资产"} open={isAssetOpen} width={980} onCancel={() => setIsAssetOpen(false)} onOk={() => void saveAsset()} okText="保存" cancelText="取消" destroyOnHidden>
                <div className="grid gap-6 pt-1 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <Form form={form} layout="vertical" requiredMark={false} initialValues={{ kind: "text", tags: [] }}>
                        <Form.Item name="kind" label="类型">
                            <Select
                                options={[
                                    { label: "文本", value: "text" },
                                    { label: "图片", value: "image" },
                                ]}
                                onChange={(value) => setFormKind(value)}
                            />
                        </Form.Item>
                        <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
                            <Input size="large" placeholder="给资产起一个容易检索的名字" />
                        </Form.Item>
                        <Form.Item name="coverUrl" label="封面 URL">
                            <Space.Compact className="w-full">
                                <Input placeholder="可粘贴图片 URL，也可以上传本地封面" />
                                <Button icon={<Upload className="size-3.5" />} onClick={() => coverInputRef.current?.click()}>
                                    上传
                                </Button>
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item name="tags" label="标签">
                            <Select mode="tags" tokenSeparators={[",", "，"]} placeholder="输入标签后回车" />
                        </Form.Item>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Form.Item name="source" label="来源">
                                <Input placeholder="手动添加 / 画布 / 提示词库" />
                            </Form.Item>
                            <Form.Item name="note" label="备注">
                                <Input placeholder="可选" />
                            </Form.Item>
                        </div>
                        {formKind === "text" ? (
                            <Form.Item name="content" label="文本内容" rules={[{ required: true, message: "请输入文本内容" }]}>
                                <Input.TextArea rows={8} placeholder="保存提示词、说明文案、参考描述等文本资产" />
                            </Form.Item>
                        ) : (
                            <Form.Item label="图片内容" required>
                                <div className="rounded-lg border border-dashed border-stone-300 p-4 dark:border-stone-700">
                                    <Button icon={<Upload className="size-4" />} onClick={() => imageInputRef.current?.click()}>
                                        选择图片文件
                                    </Button>
                                    {imageDraft ? (
                                        <Typography.Text type="secondary" className="ml-3 text-xs">
                                            {imageDraft.width}x{imageDraft.height} · {formatBytes(imageDraft.bytes)}
                                        </Typography.Text>
                                    ) : (
                                        <Typography.Text type="secondary" className="ml-3 text-xs">
                                            未选择图片
                                        </Typography.Text>
                                    )}
                                </div>
                            </Form.Item>
                        )}
                    </Form>
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950">
                        <Typography.Text strong>预览</Typography.Text>
                        <div className="mt-3 overflow-hidden rounded-lg border border-stone-200 bg-background dark:border-stone-800">
                            {coverUrl || imageDraft?.dataUrl ? (
                                <img src={coverUrl || imageDraft?.dataUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                            ) : (
                                <div className="flex aspect-[4/3] items-center justify-center bg-stone-100 p-5 text-center text-sm text-stone-500 dark:bg-stone-900">{content || "暂无封面"}</div>
                            )}
                            <div className="p-4">
                                <Typography.Text strong ellipsis className="block">
                                    {title || "未命名资产"}
                                </Typography.Text>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {tags.length ? (
                                        tags.map((tag) => (
                                            <Tag key={tag} className="m-0">
                                                {tag}
                                            </Tag>
                                        ))
                                    ) : (
                                        <Tag className="m-0">未打标签</Tag>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                        void readCoverFile(event.target.files?.[0]);
                        event.target.value = "";
                    }}
                />
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                        void readImageFile(event.target.files?.[0]);
                        event.target.value = "";
                    }}
                />
            </Modal>

            <AssetDrawer asset={previewAsset} feedback={previewAsset ? feedback[previewAsset.id] : undefined} onClose={() => setPreviewAsset(null)} onCopy={copyAssetText} onDownload={downloadImage} onCapture={(asset) => void captureAsset(asset)} onFeedback={(patch) => previewAsset && void setFeedback(previewAsset.id, { ...patch, promptSnapshot: previewAsset.kind === "text" ? previewAsset.data.content : typeof previewAsset.metadata?.prompt === "string" ? previewAsset.metadata.prompt : undefined, style: typeof previewAsset.metadata?.style === "string" ? previewAsset.metadata.style : previewAsset.tags[0], scene: typeof previewAsset.metadata?.scene === "string" ? previewAsset.metadata.scene : previewAsset.tags[1] })} />

            <input ref={assetInputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importAssetZip(event.target.files?.[0])} />

            <Modal title="删除资产" open={Boolean(deletingAsset)} onCancel={() => setDeletingAsset(null)} onOk={() => void confirmDelete()} okText="删除" okButtonProps={{ danger: true }} cancelText="取消">
                确定删除「{deletingAsset?.title}」吗？删除后会从我的资产中移除。
            </Modal>
        </div>
    );
}

function AssetCard({ asset, compact, onOpen, onEdit, onCopy, onDownload, onDelete }: { asset: Asset; compact: boolean; onOpen: () => void; onEdit: () => void; onCopy: (asset: Asset) => void; onDownload: (asset: Asset) => void; onDelete: () => void }) {
    const cover = asset.coverUrl || (asset.kind === "image" ? asset.data.dataUrl : "");
    const summary = assetSummary(asset);
    const feedback = useImageFeedbackStore((state) => state.feedback[asset.id]);
    const count = assetMediaCount(asset);
    const kind = asset.kind === "image" ? "图片" : asset.kind === "video" ? "视频" : "文本";
    return (
        <article className="group mb-4 inline-block w-full break-inside-avoid overflow-hidden rounded-sm border border-border bg-card align-top transition-colors hover:border-foreground/30">
            <div className="relative overflow-hidden bg-muted/50">
                <button type="button" className="block w-full cursor-zoom-in text-left" onClick={onOpen}>
                    {cover ? <img src={cover} alt={asset.title} loading="lazy" className="h-auto w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]" /> : asset.kind === "video" ? <video src={asset.data.url} muted preload="metadata" className="h-auto min-h-36 w-full bg-black object-contain" /> : <div className={cn("flex items-center justify-center bg-muted px-5 text-center text-muted-foreground", compact ? "min-h-36 py-8 text-xs leading-5" : "min-h-56 py-12 text-sm leading-7")}><span className={compact ? "line-clamp-6" : "line-clamp-10"}>{asset.kind === "text" ? asset.data.content : "暂无封面"}</span></div>}
                </button>
                {feedback?.rating ? <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-1.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur"><Star className="size-3 fill-rose-500 text-rose-500" />{feedback.rating}</span> : null}
                <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    {asset.kind !== "video" ? <Button size="small" shape="circle" icon={<PencilLine className="size-3.5" />} aria-label={`编辑${asset.title}`} onClick={onEdit} /> : null}
                    {asset.kind === "text" ? <Button size="small" shape="circle" icon={<Copy className="size-3.5" />} aria-label={`复制${asset.title}`} onClick={() => void onCopy(asset)} /> : <Button size="small" shape="circle" icon={<Download className="size-3.5" />} aria-label={`下载${asset.title}`} onClick={() => onDownload(asset)} />}
                    <Button size="small" shape="circle" danger icon={<Trash2 className="size-3.5" />} aria-label={`删除${asset.title}`} onClick={onDelete} />
                </div>
            </div>
            <button type="button" className={cn("block w-full cursor-pointer text-left", compact ? "p-2.5" : "p-3.5")} onClick={onOpen}>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">{asset.tags[0] || kind}</span>
                    <span className="flex shrink-0 items-center gap-1"><Images className="size-3" />{count} {count > 1 ? "张" : "项"}</span>
                </div>
                <h2 className={cn("mt-1.5 font-semibold leading-5 text-foreground", compact ? "line-clamp-2 text-xs" : "line-clamp-2 text-sm")}>{asset.title}</h2>
                {!compact ? <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{summary}</p> : null}
            </button>
        </article>
    );
}

function assetMediaCount(asset: Asset) {
    const value = Number(asset.metadata?.candidateCount || asset.metadata?.imageCount || asset.metadata?.count || 1);
    return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

function assetSortScore(asset: Asset, mode: SortMode, feedback?: ImageFeedback) {
    const updated = Date.parse(asset.updatedAt) || 0;
    const rating = feedback?.rating || 0;
    if (mode === "latest") return updated;
    if (mode === "rating") return rating * 10 ** 15 + updated;
    return rating * 10 ** 15 + (feedback?.comment ? 5 * 10 ** 13 : 0) + updated;
}

function AssetDrawer({ asset, feedback, onClose, onCopy, onDownload, onCapture, onFeedback }: { asset: Asset | null; feedback?: ImageFeedback; onClose: () => void; onCopy: (asset: Asset) => void; onDownload: (asset: Asset) => void; onCapture: (asset: Asset) => void; onFeedback: (patch: { rating?: 1 | 2 | 3 | 4 | 5; comment?: string; hidden?: boolean }) => void }) {
    const cover = asset ? asset.coverUrl || (asset.kind === "image" ? asset.data.dataUrl : "") : "";
    return (
        <Drawer title="资产详情" open={Boolean(asset)} size="large" onClose={onClose}>
            {asset ? (
                <div className="space-y-5">
                    {cover ? (
                        <Image src={cover} alt={asset.title} className="rounded-lg" />
                    ) : (
                        <div className="rounded-lg border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">{asset.kind === "text" ? asset.data.content : "暂无封面"}</div>
                    )}
                    <div>
                        <Typography.Title level={4} className="!mb-2">
                            {asset.title}
                        </Typography.Title>
                        <Space size={[4, 4]} wrap>
                            <Tag>{asset.kind === "image" ? "图片" : asset.kind === "video" ? "视频" : "文本"}</Tag>
                            {(asset.tags || []).map((tag) => (
                                <Tag key={tag}>{tag}</Tag>
                            ))}
                        </Space>
                    </div>
                    <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
                        <Typography.Text type="secondary" className="block text-xs">
                            内容
                        </Typography.Text>
                        {asset.kind === "text" ? (
                            <Typography.Paragraph className="mt-2 whitespace-pre-wrap">{asset.data.content}</Typography.Paragraph>
                        ) : asset.kind === "video" ? (
                            <video src={asset.data.url} controls className="mt-2 aspect-video w-full rounded-lg bg-black" />
                        ) : (
                            <Typography.Text className="mt-2 block">
                                {asset.data.width}x{asset.data.height} · {formatBytes(asset.data.bytes)} · {asset.data.mimeType}
                            </Typography.Text>
                        )}
                    </div>
                    {(asset.kind === "image" || asset.kind === "video") ? <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800"><div className="flex flex-wrap items-center justify-between gap-3"><div><Typography.Text strong>审美反馈</Typography.Text><Typography.Text type="secondary" className="ml-2 text-xs">{feedbackLabel(feedback)}</Typography.Text></div><ImageFeedbackRating value={feedback?.rating} onChange={(rating) => onFeedback({ rating, hidden: false })} /></div><Input.TextArea className="mt-3" rows={2} value={feedback?.comment || ""} placeholder="写下你喜欢或不喜欢的原因" onChange={(event) => onFeedback({ comment: event.target.value })} />{feedback?.hidden ? <Button className="mt-3" onClick={() => onFeedback({ hidden: false })}>恢复到库中</Button> : <Popconfirm title="确认将此资产 soft delete 吗？" description="不会物理删除图片，会记录强负反馈并移入已隐藏。" okText="确认隐藏" cancelText="取消" onConfirm={() => onFeedback({ hidden: true })}><Button className="mt-3" danger>Soft delete：强负反馈</Button></Popconfirm>}<Typography.Text type="secondary" className="mt-2 block text-xs">5 星强化，4 星继续变体，1–2 星降权；soft delete 低于一星，作为强负反馈。</Typography.Text></div> : null}
                    {asset.note ? (
                        <div>
                            <Typography.Text type="secondary">备注</Typography.Text>
                            <Typography.Paragraph className="mt-1">{asset.note}</Typography.Paragraph>
                        </div>
                    ) : null}
                    <Space>
                        <Button onClick={() => onCapture(asset)}>收录到提示词仪表盘</Button>
                        {asset.kind === "text" ? (
                            <Button type="primary" icon={<Copy className="size-4" />} onClick={() => onCopy(asset)}>
                                复制文本
                            </Button>
                        ) : null}
                        {asset.kind === "image" || asset.kind === "video" ? (
                            <Button type="primary" icon={<Download className="size-4" />} onClick={() => onDownload(asset)}>
                                {asset.kind === "video" ? "下载视频" : "下载图片"}
                            </Button>
                        ) : null}
                    </Space>
                </div>
            ) : null}
        </Drawer>
    );
}

function assetSummary(asset: Asset) {
    if (asset.kind === "text") return asset.data.content;
    return `${asset.data.width}x${asset.data.height} · ${formatBytes(asset.data.bytes)} · ${asset.data.mimeType}`;
}

function assetSearchText(asset: Asset) {
    return [asset.title, asset.source || "", asset.note || "", (asset.tags || []).join(" "), asset.kind === "text" ? asset.data.content : asset.data.mimeType].join(" ").toLowerCase();
}
