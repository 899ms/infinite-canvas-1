import { useEffect, useMemo, useState, type ReactNode } from "react";
import { App, Button, Input, Modal, Popconfirm, Segmented, Tag, Tooltip } from "antd";
import { Download, Ellipsis, FolderPlus, Image as ImageIcon, Info, MessageSquare, Minus, Music2, Pencil, Plus, RefreshCw, Settings2, Sparkles, Trash2, Upload, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

import { canvasThemes } from "@/lib/canvas-theme";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import { formatBytes, getDataUrlByteSize } from "@/lib/image-utils";
import { useCopyText } from "@/hooks/use-copy-text";
import { useThemeStore } from "@/stores/use-theme-store";
import { feedbackLabel, type ImageFeedback } from "@/lib/image-feedback";
import { useImageFeedbackStore } from "@/stores/use-image-feedback-store";
import { usePromptKnowledgeBaseStore } from "@/stores/use-prompt-knowledge-base-store";
import { ImageFeedbackRating } from "@/components/image-feedback-rating";
import { CanvasNodeType, type CanvasNodeData, type ViewportTransform } from "@/types/canvas";
import type { CanvasNodeToolbarItem } from "@/types/canvas-plugin";
import { ImageToolSettingsModal, type ImageToolbarSettingsTool } from "./canvas-image-toolbar-settings-modal";
import { IMAGE_QUICK_TOOLS_STORAGE_KEY, buildImageToolbarTools, defaultImageQuickToolIds, readImageQuickToolsConfig, type ImageQuickToolId } from "./canvas-image-toolbar-tools";

type CanvasNodeHoverToolbarProps = {
    node: CanvasNodeData | null;
    viewport: ViewportTransform;
    onKeep: (nodeId: string) => void;
    onLeave: () => void;
    onInfo: (node: CanvasNodeData) => void;
    onEditText: (node: CanvasNodeData) => void;
    onDecreaseFont: (node: CanvasNodeData) => void;
    onIncreaseFont: (node: CanvasNodeData) => void;
    onToggleDialog: (node: CanvasNodeData) => void;
    onGenerateImage: (node: CanvasNodeData) => void;
    onUpload: (node: CanvasNodeData) => void;
    onDownload: (node: CanvasNodeData) => void;
    onSaveAsset: (node: CanvasNodeData) => void;
    onMaskEdit: (node: CanvasNodeData) => void;
    onCrop: (node: CanvasNodeData) => void;
    onSplit: (node: CanvasNodeData) => void;
    onUpscale: (node: CanvasNodeData) => void;
    onSuperResolve: (node: CanvasNodeData) => void;
    onAngle: (node: CanvasNodeData) => void;
    onViewImage: (node: CanvasNodeData) => void;
    onReversePrompt: (node: CanvasNodeData) => void;
    onRetry: (node: CanvasNodeData) => void;
    onToggleFreeResize: (node: CanvasNodeData) => void;
    onDelete: (node: CanvasNodeData) => void;
    extraTools?: CanvasNodeToolbarItem[];
};

type ToolbarTool = {
    id: string;
    title: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
};

export function CanvasNodeHoverToolbar({
    node,
    viewport,
    onKeep,
    onLeave,
    onInfo,
    onEditText,
    onDecreaseFont,
    onIncreaseFont,
    onToggleDialog,
    onGenerateImage,
    onUpload,
    onDownload,
    onSaveAsset,
    onMaskEdit,
    onCrop,
    onSplit,
    onUpscale,
    onSuperResolve,
    onAngle,
    onViewImage,
    onReversePrompt,
    onRetry,
    onToggleFreeResize,
    onDelete,
    extraTools = [],
}: CanvasNodeHoverToolbarProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [quickImageToolIds, setQuickImageToolIds] = useState<ImageQuickToolId[]>(defaultImageQuickToolIds);
    const [showImageToolLabels, setShowImageToolLabels] = useState(true);
    const [draftImageToolIds, setDraftImageToolIds] = useState<ImageQuickToolId[]>(defaultImageQuickToolIds);
    const [draftShowImageToolLabels, setDraftShowImageToolLabels] = useState(true);
    const [imageToolSettingsOpen, setImageToolSettingsOpen] = useState(false);
    const { message } = App.useApp();
    const { t } = useTranslation();
    const copyText = useCopyText();

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(IMAGE_QUICK_TOOLS_STORAGE_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored) as unknown;
            const config = readImageQuickToolsConfig(parsed);
            setQuickImageToolIds(config.ids);
            setShowImageToolLabels(config.showLabels);
        } catch {
            window.localStorage.removeItem(IMAGE_QUICK_TOOLS_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        setImageToolSettingsOpen(false);
    }, [node?.id]);

    if (!node) return null;

    const activeNode = node;
    const left = viewport.x + (node.position.x + node.width / 2) * viewport.k;
    const top = viewport.y + node.position.y * viewport.k - 14;
    const isImage = node.type === CanvasNodeType.Image;
    const isVideo = node.type === CanvasNodeType.Video;
    const isAudio = node.type === CanvasNodeType.Audio;
    const hasImage = isImage && Boolean(node.metadata?.content);
    const hasVideo = isVideo && Boolean(node.metadata?.content);
    const hasAudio = isAudio && Boolean(node.metadata?.content);
    const isText = node.type === CanvasNodeType.Text;
    const isConfig = node.type === CanvasNodeType.Config;
    const isInteriorPrompt = Boolean(node.metadata?.interiorWorkflow?.promptStage);
    const canOpenDialog = isText || hasImage || isVideo;
    const canRetry = node.metadata?.status === "error";
    const quickImageToolIdSet = new Set(quickImageToolIds);
    const copyImagePrompt = (target: CanvasNodeData) => {
        const prompt = target.metadata?.prompt?.trim();
        if (!prompt) {
            message.warning(t("canvas.nodeToolbar.noPrompt"));
            return;
        }
        copyText(prompt, t("common.promptCopied"));
    };
    const imageTools = buildImageToolbarTools(node, { onUpload, onToggleFreeResize, onMaskEdit, onCrop, onSplit, onUpscale, onSuperResolve, onAngle, onViewImage, onCopyPrompt: copyImagePrompt, onReversePrompt });

    function openImageToolSettings() {
        onKeep(activeNode.id);
        setDraftImageToolIds(quickImageToolIds);
        setDraftShowImageToolLabels(showImageToolLabels);
        setImageToolSettingsOpen(true);
    }

    const baseToolbarTools: ToolbarTool[] = [
        { id: "info", title: t("canvas.nodeToolbar.infoTitle"), label: t("canvas.nodeToolbar.info"), icon: <Info className="size-4" />, onClick: () => onInfo(node) },
        { id: "delete", title: t("canvas.nodeToolbar.removeTitle"), label: t("common.delete"), icon: <Trash2 className="size-4" />, onClick: () => onDelete(node), danger: true },
    ];
    const nodeToolbarTools: ToolbarTool[] = [
        ...(canRetry ? [{ id: "retry", title: t("canvas.nodeToolbar.retryTitle"), label: t("canvas.node.retry"), icon: <RefreshCw className="size-4" />, onClick: () => onRetry(node) }] : []),
        ...(hasImage || hasVideo || isText ? [{ id: "saveAsset", title: t("common.addToAssets"), label: t("canvas.nodeToolbar.saveAsset"), icon: <FolderPlus className="size-4" />, onClick: () => onSaveAsset(node) }] : []),
        ...(hasImage || hasVideo || hasAudio
            ? [
                  {
                      id: "download",
                      title: t(hasAudio ? "canvas.nodeToolbar.downloadAudio" : hasVideo ? "canvas.nodeToolbar.downloadVideo" : "canvas.nodeToolbar.downloadImage"),
                      label: t("common.download"),
                      icon: <Download className="size-4" />,
                      onClick: () => onDownload(node),
                  },
              ]
            : []),
        ...(canOpenDialog ? [{ id: "edit", title: t("common.edit"), label: t("common.edit"), icon: <MessageSquare className="size-4" />, onClick: () => onToggleDialog(node) }] : []),
        ...(isText ? [{ id: "editText", title: t("canvas.nodeToolbar.editTextTitle"), label: t("canvas.nodeToolbar.editText"), icon: <Pencil className="size-4" />, onClick: () => onEditText(node) }] : []),
        ...(isText
            ? [
                  {
                      id: "generateImage",
                      title: isInteriorPrompt ? "使用 Codex 生成提示词" : t("canvas.node.generateImage"),
                      label: isInteriorPrompt ? "Codex" : t("canvas.node.generate"),
                      icon: isInteriorPrompt ? <Sparkles className="size-4" /> : <ImageIcon className="size-4" />,
                      onClick: () => onGenerateImage(node),
                  },
              ]
            : []),
        ...(isConfig ? [{ id: "config", title: t("canvas.configNode.title"), label: t("canvas.configNode.title"), icon: <Settings2 className="size-4" />, onClick: () => onToggleDialog(node) }] : []),
        ...(isText ? [{ id: "decreaseFont", title: t("canvas.nodeToolbar.decreaseFont"), label: t("canvas.nodeToolbar.zoomOut"), icon: <Minus className="size-4" />, onClick: () => onDecreaseFont(node) }] : []),
        ...(isText ? [{ id: "increaseFont", title: t("canvas.nodeToolbar.increaseFont"), label: t("canvas.nodeToolbar.zoomIn"), icon: <Plus className="size-4" />, onClick: () => onIncreaseFont(node) }] : []),
        ...(isImage && !hasImage ? [{ id: "uploadImage", title: t("canvas.nodeToolbar.uploadImage"), label: t("canvas.nodeToolbar.uploadImage"), icon: <Upload className="size-4" />, onClick: () => onUpload(node) }] : []),
        ...(isVideo
            ? [
                  {
                      id: "uploadVideo",
                      title: t(hasVideo ? "canvas.nodeToolbar.replaceVideo" : "canvas.nodeToolbar.uploadVideo"),
                      label: t(hasVideo ? "canvas.nodeToolbar.replaceVideo" : "canvas.nodeToolbar.uploadVideo"),
                      icon: <Video className="size-4" />,
                      onClick: () => onUpload(node),
                  },
              ]
            : []),
        ...(isAudio
            ? [
                  {
                      id: "uploadAudio",
                      title: t(hasAudio ? "canvas.nodeToolbar.replaceAudio" : "canvas.nodeToolbar.uploadAudio"),
                      label: t(hasAudio ? "canvas.nodeToolbar.replaceAudio" : "canvas.nodeToolbar.uploadAudio"),
                      icon: <Music2 className="size-4" />,
                      onClick: () => onUpload(node),
                  },
              ]
            : []),
        ...(hasImage ? imageTools.map((tool) => ({ id: tool.id, title: tool.title, label: tool.label, icon: tool.icon, active: tool.active, onClick: tool.onClick })) : []),
    ];
    const toolbarTools = hasImage ? [...baseToolbarTools, ...nodeToolbarTools].filter((tool) => quickImageToolIdSet.has(tool.id as ImageQuickToolId)) : [...baseToolbarTools, ...nodeToolbarTools, ...extraTools];
    const selectableImageToolbarTools = [...baseToolbarTools, ...nodeToolbarTools].filter((tool) => tool.id !== "retry") as ImageToolbarSettingsTool[];

    const closeImageToolSettings = () => {
        setImageToolSettingsOpen(false);
        onLeave();
    };

    const setDraftImageToolVisible = (id: ImageQuickToolId, visible: boolean) => {
        setDraftImageToolIds((current) => {
            const selected = new Set(current);
            if (visible) selected.add(id);
            else selected.delete(id);
            return selectableImageToolbarTools.filter((tool) => selected.has(tool.id)).map((tool) => tool.id);
        });
    };

    const saveImageToolSettings = () => {
        const config = { ids: draftImageToolIds, showLabels: draftShowImageToolLabels };
        setQuickImageToolIds(config.ids);
        setShowImageToolLabels(config.showLabels);
        window.localStorage.setItem(IMAGE_QUICK_TOOLS_STORAGE_KEY, JSON.stringify(config));
        closeImageToolSettings();
    };

    return (
        <>
            <div
                className="thin-scrollbar absolute z-[70] flex h-12 max-w-[calc(100%_-_2rem)] -translate-x-1/2 -translate-y-full items-center overflow-x-auto overflow-y-hidden rounded-[18px] border text-[15px]"
                style={{ left, top, borderColor: theme.toolbar.border, background: theme.toolbar.panel, color: theme.node.text, boxShadow: theme.toolbar.shadow }}
                onMouseEnter={() => onKeep(node.id)}
                onMouseLeave={() => {
                    if (!imageToolSettingsOpen) onLeave();
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
            >
                {toolbarTools.map((tool) => (
                    <ToolbarAction key={tool.id} {...tool} showLabel={showImageToolLabels} />
                ))}
                {hasImage ? (
                    <ToolbarAction
                        id="more"
                        title={t("canvas.imageTools.configure")}
                        label={t("canvas.imageTools.more")}
                        icon={<Ellipsis className="size-4" />}
                        active={imageToolSettingsOpen}
                        onClick={openImageToolSettings}
                        showLabel={showImageToolLabels}
                    />
                ) : null}
            </div>
            {hasImage ? (
                <ImageToolSettingsModal
                    open={imageToolSettingsOpen}
                    tools={selectableImageToolbarTools}
                    selectedIds={draftImageToolIds}
                    showLabels={draftShowImageToolLabels}
                    onToggle={setDraftImageToolVisible}
                    onShowLabelsChange={setDraftShowImageToolLabels}
                    onCancel={closeImageToolSettings}
                    onSave={saveImageToolSettings}
                />
            ) : null}
        </>
    );
}

export function CanvasNodeInfoModal({ node, open, onClose, canvasId }: { node: CanvasNodeData | null; open: boolean; onClose: () => void; canvasId?: string }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { t } = useTranslation();
    const [view, setView] = useState<"info" | "json">("info");
    const { message } = App.useApp();
    const feedback = useImageFeedbackStore((state) => (node ? state.feedback[node.id] : undefined));
    const setFeedback = useImageFeedbackStore((state) => state.setFeedback);
    const hydrateFeedback = useImageFeedbackStore((state) => state.hydrate);
    const feedbackHydrated = useImageFeedbackStore((state) => state.hydrated);
    const capture = usePromptKnowledgeBaseStore((state) => state.capture);
    const addPrompt = usePromptKnowledgeBaseStore((state) => state.addPrompt);
    const hydrateKnowledgeBase = usePromptKnowledgeBaseStore((state) => state.hydrate);
    const knowledgeBaseHydrated = usePromptKnowledgeBaseStore((state) => state.hydrated);
    const imageBytes = node?.type === CanvasNodeType.Image && node.metadata?.content ? getDataUrlByteSize(node.metadata.content) : 0;
    const batchCount = node?.type === CanvasNodeType.Image ? node.metadata?.images?.length || 0 : 0;
    const json = useMemo(() => {
        if (!node) return "";
        return JSON.stringify(
            node,
            (key, value) => {
                if (key === "content" && typeof value === "string" && value.startsWith("data:image/")) {
                    return "[base64 image]";
                }
                return value;
            },
            2,
        );
    }, [node]);

    useEffect(() => {
        if (open) setView("info");
    }, [node?.id, open]);
    useEffect(() => {
        if (open && !feedbackHydrated) void hydrateFeedback();
    }, [feedbackHydrated, hydrateFeedback, open]);
    useEffect(() => {
        if (open && !knowledgeBaseHydrated) void hydrateKnowledgeBase();
    }, [hydrateKnowledgeBase, knowledgeBaseHydrated, open]);
    const saveCanvasText = async (asPrompt: boolean) => {
        if (!node || node.type !== CanvasNodeType.Text) return;
        const content = (node.metadata?.content || node.metadata?.prompt || "").trim();
        if (!content) return message.warning("该文本节点没有可收录内容");
        const captureId = await capture({ sourceType: "canvas-text-node", content, sourceLabel: node.title, sourceRef: { canvasId, nodeId: node.id } });
        if (asPrompt) await addPrompt({ title: node.title || "画布提示词", content, sourceCaptureIds: [captureId] });
        message.success(asPrompt ? "已收录为待审核完整 Prompt" : "已收录画布原文");
    };
    const updateNodeFeedback = (patch: Partial<Omit<ImageFeedback, "id" | "canvasId" | "canvasNodeId" | "createdAt" | "updatedAt">>) => {
        if (!node) return;
        void setFeedback(node.id, { ...patch, canvasId, canvasNodeId: node.id, promptSnapshot: node.metadata?.prompt || node.metadata?.content, style: node.metadata?.interiorWorkflow?.style, scene: node.metadata?.interiorWorkflow?.roomType });
    };

    const title = (
        <div className="flex items-center justify-between gap-4 pr-12">
            <span>{t("canvas.nodeToolbar.nodeInfo")}</span>
            <Segmented
                size="small"
                value={view}
                onChange={(value) => setView(value as "info" | "json")}
                options={[
                    { label: t("canvas.nodeToolbar.info"), value: "info" },
                    { label: "JSON", value: "json" },
                ]}
            />
        </div>
    );

    return (
        <Modal className="canvas-node-info-modal" title={title} open={open && Boolean(node)} centered footer={null} onCancel={onClose}>
            {node ? (
                <div className="h-[56vh] min-h-[360px] select-text text-sm" data-canvas-shortcuts-ignore>
                    {view === "info" ? (
                        <div className="thin-scrollbar h-full space-y-3 overflow-auto pr-1">
                            <InfoRow label="ID" value={node.id} />
                            <InfoRow label={t("canvas.nodeToolbar.name")} value={node.title || t("canvas.node.untitled")} />
                            <InfoRow
                                label={t("canvas.nodeToolbar.type")}
                                value={
                                    node.type === CanvasNodeType.Group
                                        ? t("canvas.node.group")
                                        : node.type === CanvasNodeType.Config
                                          ? t("canvas.configNode.title")
                                          : [CanvasNodeType.Image, CanvasNodeType.Video, CanvasNodeType.Audio, CanvasNodeType.Text].includes(node.type as CanvasNodeType)
                                            ? t(`assets.kinds.${node.type}`)
                                            : getNodeDefinition(node.type)?.title || node.type
                                }
                            />
                            <InfoRow label={t("canvas.nodeToolbar.size")} value={`${Math.round(node.width)} x ${Math.round(node.height)}`} />
                            <InfoRow label={t("canvas.nodeToolbar.position")} value={`${Math.round(node.position.x)}, ${Math.round(node.position.y)}`} />
                            <InfoRow label={t("canvas.nodeToolbar.status")} value={node.metadata?.status || "idle"} />
                            {batchCount > 1 ? <InfoRow label={t("canvas.nodeToolbar.imageGroup")} value={t("canvas.configNode.images", { count: batchCount })} /> : null}
                            {node.metadata?.prompt ? <InfoRow label={t("canvas.configNode.prompt")} value={node.metadata.prompt} /> : null}
                            {imageBytes ? <InfoRow label={t("canvas.nodeToolbar.imageSize")} value={formatBytes(imageBytes)} /> : null}
                            {node.metadata?.errorDetails ? (
                                <div className="rounded-lg border p-3 text-red-400" style={{ borderColor: theme.node.stroke }}>
                                    {node.metadata.errorDetails}
                                </div>
                            ) : null}
                            {node.type === CanvasNodeType.Text ? (
                                <div className="flex flex-wrap gap-2">
                                    <Button size="small" onClick={() => void saveCanvasText(false)}>
                                        保存为原始收录
                                    </Button>
                                    <Button size="small" type="primary" onClick={() => void saveCanvasText(true)}>
                                        保存为完整 Prompt
                                    </Button>
                                </div>
                            ) : null}
                            {node.type === CanvasNodeType.Image ? <NodeFeedback feedback={feedback} onChange={updateNodeFeedback} /> : null}
                        </div>
                    ) : (
                        <pre className="thin-scrollbar h-full overflow-auto rounded-lg border p-3 text-xs leading-5" style={{ background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text }}>
                            {json}
                        </pre>
                    )}
                </div>
            ) : null}
        </Modal>
    );
}

function NodeFeedback({ feedback, onChange }: { feedback?: ImageFeedback; onChange: (patch: Partial<Omit<ImageFeedback, "id" | "canvasId" | "canvasNodeId" | "createdAt" | "updatedAt">>) => void }) {
    return (
        <div className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                    审美反馈 <Tag>{feedbackLabel(feedback)}</Tag>
                </span>
                <ImageFeedbackRating value={feedback?.rating} onChange={(rating) => onChange({ rating, hidden: false })} />
            </div>
            <Input.TextArea className="mt-3" rows={2} value={feedback?.comment || ""} placeholder="写下喜欢或不喜欢的原因" onChange={(event) => onChange({ comment: event.target.value })} />
            {feedback?.hidden ? (
                <Button className="mt-3" onClick={() => onChange({ hidden: false })}>
                    恢复节点反馈
                </Button>
            ) : (
                <Popconfirm title="确认将此节点 soft delete 吗？" description="不会删除画布节点，只会记录强负反馈。" okText="确认隐藏" cancelText="取消" onConfirm={() => onChange({ hidden: true })}>
                    <Button className="mt-3" danger>
                        Soft delete：强负反馈
                    </Button>
                </Popconfirm>
            )}
        </div>
    );
}

function ToolbarAction({ title, label, icon, onClick, showLabel, active = false, danger = false }: ToolbarTool & { showLabel: boolean }) {
    const hasText = showLabel && Boolean(label);
    return (
        <Tooltip title={title} placement="top" mouseEnterDelay={0.2} color="var(--ds-color-background-surface)" styles={{ root: { color: "var(--ds-color-text-primary)", boxShadow: "var(--ds-shadow-floating)", fontSize: 13, fontWeight: 500 } }}>
            <button
                type="button"
                className="group relative flex h-12 items-center whitespace-nowrap px-1.5 focus-visible:outline-2 focus-visible:outline-[var(--ds-color-focus)] focus-visible:outline-offset-2"
                style={danger ? { color: "var(--ds-color-text-danger)" } : undefined}
                onClick={onClick}
                aria-label={title}
            >
                <span className={`flex h-9 items-center ${hasText ? "gap-2 px-2.5" : "justify-center px-2"} rounded-lg transition hover:bg-[var(--ds-color-background-subtle)] ${active ? "bg-[var(--ds-color-background-subtle)]" : ""}`}>
                    {icon}
                    {hasText ? <span>{label}</span> : null}
                </span>
            </button>
        </Tooltip>
    );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
            <span className="opacity-50">{label}</span>
            <span className="min-w-0 whitespace-pre-wrap break-words">{value}</span>
        </div>
    );
}
