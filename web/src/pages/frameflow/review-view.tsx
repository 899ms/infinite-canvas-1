import { Archive, Eye, EyeOff, MessageSquareText, RefreshCw, RotateCcw, ThumbsDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Empty, Image, Input, Popconfirm, Segmented, Select, Spin, Tag } from "antd";

import { ImageFeedbackRating } from "@/components/image-feedback-rating";
import { cn } from "@/lib/utils";
import { commentFrameFlowImage, deleteFrameFlowImage, frameFlowImageUrl, getFrameFlowAutoRun, getFrameFlowRun, hideFrameFlowImage, listFrameFlowAutoRuns, listFrameFlowReviewQueue, rateFrameFlowImage, restoreFrameFlowImage, type FrameFlowAutoRun, type FrameFlowImageStatus, type FrameFlowReviewItem, type FrameFlowRunDetail } from "@/services/api/frameflow";
import { useAgentStore } from "@/stores/use-agent-store";
import { canWriteRequirement, createLatestRequestGate, mergeRequestedAutoRun, resolveAutoRunSelection, type FrameFlowRequirementScope } from "./requirement-view-state";

type ReviewFilter = "all" | "pending" | "reviewed" | "hidden";
const ALL_REVIEW_SOURCES = "all";
export function FrameFlowReviewView() {
    const { message } = App.useApp();
    const endpoint = useAgentStore((state) => state.url)
        .trim()
        .replace(/\/$/, "");
    const token = useAgentStore((state) => state.token).trim();
    const [items, setItems] = useState<FrameFlowReviewItem[]>([]);
    const [autoRuns, setAutoRuns] = useState<FrameFlowAutoRun[]>([]);
    const [activeRun, setActiveRun] = useState<FrameFlowRunDetail | null>(null);
    const [selectedAutoRunId, setSelectedAutoRunId] = useState(() => new URLSearchParams(window.location.search).get("autoRunId") || "");
    const [selectedId, setSelectedId] = useState("");
    const [filter, setFilter] = useState<ReviewFilter>("all");
    const [commentDraft, setCommentDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [busyAction, setBusyAction] = useState("");
    const [error, setError] = useState("");
    const [scope, setScope] = useState<FrameFlowRequirementScope>(() => new URLSearchParams(window.location.search).get("scope") === "archived" ? "archived" : "active");
    const requestGate = useMemo(() => createLatestRequestGate(), []);
    const scopeRef = useRef(scope);

    const changeScope = useCallback((nextScope: FrameFlowRequirementScope) => {
        requestGate.invalidate();
        scopeRef.current = nextScope;
        setScope(nextScope);
        setItems([]);
        setAutoRuns([]);
        setActiveRun(null);
        setSelectedAutoRunId(ALL_REVIEW_SOURCES);
        setSelectedId("");
        setFilter("all");
        const url = new URL(window.location.href);
        if (nextScope === "archived") url.searchParams.set("scope", "archived");
        else url.searchParams.delete("scope");
        url.searchParams.delete("autoRunId");
        window.history.replaceState({}, "", url);
    }, [requestGate]);

    const loadQueue = useCallback(
        async (preferredId?: string) => {
            if (!endpoint || !token) return;
            const request = requestGate.begin();
            setLoading(true);
            setError("");
            try {
                const requestedAutoRunId = new URLSearchParams(window.location.search).get("autoRunId");
                const includeArchived = scope === "archived" || Boolean(requestedAutoRunId && requestedAutoRunId !== ALL_REVIEW_SOURCES);
                const [allItems, listedAutoRuns, requestedAutoRun] = await Promise.all([
                    listFrameFlowReviewQueue(endpoint, token, 200, includeArchived),
                    listFrameFlowAutoRuns(endpoint, token, 200, includeArchived),
                    requestedAutoRunId && requestedAutoRunId !== ALL_REVIEW_SOURCES ? getFrameFlowAutoRun(endpoint, token, requestedAutoRunId).catch(() => undefined) : undefined,
                ]);
                if (!requestGate.isLatest(request)) return;
                const allAutoRuns = mergeRequestedAutoRun(listedAutoRuns, requestedAutoRun);
                const requested = allAutoRuns.find((item) => item.id === requestedAutoRunId);
                const resolvedScope = requested?.requirementArchived ? "archived" : requested ? "active" : scope;
                if (resolvedScope !== scope) {
                    scopeRef.current = resolvedScope;
                    setScope(resolvedScope);
                }
                const next = allItems.filter((item) => item.requirementArchived === (resolvedScope === "archived"));
                const nextAutoRuns = allAutoRuns.filter((item) => item.requirementArchived === (resolvedScope === "archived"));
                const resolvedAutoRunId = resolveAutoRunSelection(requestedAutoRunId, nextAutoRuns, ALL_REVIEW_SOURCES);
                const activeAutoRun = nextAutoRuns.find((item) => item.id === resolvedAutoRunId && (item.state === "generating" || item.state === "reviewing"))
                    || (resolvedAutoRunId === ALL_REVIEW_SOURCES ? nextAutoRuns.find((item) => item.state === "generating" || item.state === "reviewing") : undefined);
                const nextActiveRun = activeAutoRun?.currentRunId ? await getFrameFlowRun(endpoint, token, activeAutoRun.currentRunId) : null;
                if (!requestGate.isLatest(request)) return;
                const requestedImageId = next.find((item) => reviewItemAutoRunId(item, nextAutoRuns) === resolvedAutoRunId)?.image.id;
                setItems(next);
                setAutoRuns(nextAutoRuns);
                setActiveRun(nextActiveRun);
                setSelectedAutoRunId(resolvedAutoRunId);
                const url = new URL(window.location.href);
                url.searchParams.set("autoRunId", resolvedAutoRunId);
                window.history.replaceState({}, "", url);
                setSelectedId((current) => {
                    const visible = resolvedAutoRunId === ALL_REVIEW_SOURCES ? next : next.filter((item) => reviewItemAutoRunId(item, nextAutoRuns) === resolvedAutoRunId);
                    const candidate = [preferredId, current, requestedImageId].find((id) => id && visible.some((item) => item.image.id === id));
                    return candidate || visible[0]?.image.id || "";
                });
            } catch (reason) {
                if (requestGate.isLatest(request)) setError(errorMessage(reason));
            } finally {
                if (requestGate.isLatest(request)) setLoading(false);
            }
        },
        [endpoint, requestGate, scope, token],
    );

    const selectAutoRun = useCallback((autoRunId: string) => {
        setSelectedAutoRunId(autoRunId);
        setSelectedId("");
        setFilter("all");
        const url = new URL(window.location.href);
        url.searchParams.set("autoRunId", autoRunId);
        window.history.replaceState({}, "", url);
        void loadQueue();
    }, [loadQueue]);

    useEffect(() => {
        void loadQueue();
    }, [loadQueue]);

    useEffect(() => {
        if (!autoRuns.some((item) => item.state === "generating" || item.state === "reviewing")) return;
        const timer = window.setInterval(() => void loadQueue(selectedId), 2_000);
        return () => window.clearInterval(timer);
    }, [autoRuns, loadQueue, selectedId]);

    const visibleItems = useMemo(
        () => selectedAutoRunId === ALL_REVIEW_SOURCES ? items : items.filter((item) => reviewItemAutoRunId(item, autoRuns) === selectedAutoRunId),
        [autoRuns, items, selectedAutoRunId],
    );
    const counts = useMemo(
        () => ({
            all: visibleItems.length,
            pending: visibleItems.filter((item) => item.image.status === "pending_review").length,
            reviewed: visibleItems.filter((item) => item.image.status === "reviewed" || item.image.status === "restored").length,
            hidden: visibleItems.filter((item) => item.image.status === "hidden").length,
        }),
        [visibleItems],
    );
    const filtered = useMemo(
        () =>
            visibleItems.filter((item) => {
                if (filter === "all") return true;
                if (filter === "pending") return item.image.status === "pending_review";
                if (filter === "hidden") return item.image.status === "hidden";
                return item.image.status === "reviewed" || item.image.status === "restored";
            }),
        [filter, visibleItems],
    );

    useEffect(() => {
        if (filtered.some((item) => item.image.id === selectedId)) return;
        setSelectedId(filtered[0]?.image.id || "");
    }, [filtered, selectedId]);

    const selected = visibleItems.find((item) => item.image.id === selectedId) || null;
    const selectedReadOnly = !canWriteRequirement(scope, Boolean(selected?.requirementArchived));
    const activeAutoRun = autoRuns.find((item) => item.id === selectedAutoRunId && (item.state === "generating" || item.state === "reviewing"))
        || (selectedAutoRunId === ALL_REVIEW_SOURCES ? autoRuns.find((item) => item.state === "generating" || item.state === "reviewing") : null);
    const selectedMachineReviewPending = Boolean(selected && activeAutoRun?.state === "reviewing" && activeAutoRun.currentRunId === selected.image.runId);
    const activeImageIds = activeRun?.run.imageIds || [];
    const machineReviewedCount = activeImageIds.filter((imageId) => items.some((item) => item.image.id === imageId && item.machineReview)).length;
    useEffect(() => setCommentDraft(selected?.feedback.comment || ""), [selected?.feedback.comment, selectedId]);

    const mutate = async (action: string, operation: () => Promise<unknown>, success: string) => {
        if (!selected || !canWriteRequirement(scope, selected.requirementArchived)) return;
        const actionScope = scope;
        setBusyAction(action);
        try {
            await operation();
            if (scopeRef.current !== actionScope) return;
            await loadQueue(selected.image.id);
            message.success(success);
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setBusyAction("");
        }
    };

    return (
        <div>
            <section className="mb-5 rounded-xl bg-card p-4 shadow-card ring-1 ring-border" aria-label="待审需求范围">
                <h2 className="text-sm font-semibold">{scope === "archived" ? "选择已归档自动跑任务" : "选择自动跑任务"}</h2>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <Select
                        aria-label="选择自动跑任务"
                        className="min-w-[min(100%,18rem)] w-full max-w-xl flex-1"
                        value={selectedAutoRunId}
                        options={[
                            { value: ALL_REVIEW_SOURCES, label: scope === "archived" ? "全部已归档任务与手动生成" : "全部任务与手动生成" },
                            ...autoRuns.map((autoRun) => ({ value: autoRun.id, label: `${autoRun.name} · ${autoRun.iteration}/${autoRun.maxIterations} 轮${autoRun.briefSuperseded ? " · 旧修订" : ""}` })),
                        ]}
                        onChange={selectAutoRun}
                    />
                    <div className="flex shrink-0 items-center gap-3">
                            <Segmented
                                aria-label="待审需求范围"
                                size="small"
                                value={scope}
                                onChange={(value) => changeScope(value as FrameFlowRequirementScope)}
                                options={[{ label: "活动需求", value: "active" }, { label: "查看已归档", value: "archived" }]}
                            />
                        <Button className="active:!scale-[.96] !transition-transform" icon={<RefreshCw className="size-4" strokeWidth={2} />} loading={loading} onClick={() => void loadQueue(selectedId)}>刷新待审</Button>
                    </div>
                </div>
            </section>
            {activeAutoRun ? (
                <Alert
                    className="mb-5"
                    type={activeAutoRun.state === "generating" ? "info" : "warning"}
                    showIcon
                    title={activeAutoRun.state === "generating" ? `自动跑第 ${activeAutoRun.iteration} 轮正在生成` : `Codex 正在审查第 ${activeAutoRun.iteration} 轮`}
                    description={activeAutoRun.state === "generating" ? "结果会自动进入机器审图，并保留 Prompt、决策与图片血缘。" : `机器审图 ${machineReviewedCount}/${activeImageIds.length} 张；完成后会自动规划并生成下一轮，不需要人工放行。你的评分和 Comment 只作为可选纠偏。`}
                />
            ) : null}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="审核概览">
                <ReviewMetric label="全部图片" value={counts.all} />
                <ReviewMetric label="待审核" value={counts.pending} tone="warning" />
                <ReviewMetric label="已反馈" value={counts.reviewed} tone="success" />
                <ReviewMetric label="已隐藏" value={counts.hidden} tone="danger" />
            </section>

            <div className="mt-5 flex flex-wrap items-center gap-3">
                <Segmented
                    aria-label="审核状态筛选"
                    value={filter}
                    onChange={(value) => setFilter(value as ReviewFilter)}
                    options={[
                        { label: `全部 ${counts.all}`, value: "all" },
                        { label: `待审核 ${counts.pending}`, value: "pending" },
                        { label: `已反馈 ${counts.reviewed}`, value: "reviewed" },
                        { label: `已隐藏 ${counts.hidden}`, value: "hidden" },
                    ]}
                />
            </div>

            {error ? <Alert className="mt-4" showIcon type="error" title="待审队列读取失败" description={error} action={<Button onClick={() => void loadQueue(selectedId)}>重试</Button>} /> : null}

            <section className="mt-4 grid min-h-[560px] gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 rounded-xl bg-card p-3 shadow-card ring-1 ring-border sm:p-4">
                    {loading && !items.length ? (
                        <div className="flex h-96 items-center justify-center">
                            <Spin />
                        </div>
                    ) : null}
                    {!loading && !filtered.length ? <Empty className="my-32" image={Empty.PRESENTED_IMAGE_SIMPLE} description={scope === "archived" && filter === "all" ? "已归档需求中没有可查看的审图记录" : emptyLabel(filter)} /> : null}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((item) => (
                            <ReviewCard key={item.image.id} item={item} endpoint={endpoint} token={token} selected={item.image.id === selectedId} machineReviewPending={activeAutoRun?.state === "reviewing" && activeAutoRun.currentRunId === item.image.runId} onSelect={() => setSelectedId(item.image.id)} />
                        ))}
                    </div>
                </div>

                <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start" aria-label="图片审核检查器">
                    <div className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-border">
                        {selected ? (
                            <>
                                <div className="relative aspect-[4/5] bg-muted">
                                    <Image
                                        src={frameFlowImageUrl(endpoint, token, selected.image.id)}
                                        alt="当前审核图片"
                                        rootClassName="!block !size-full cursor-zoom-in"
                                        className="!size-full object-contain outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                                        preview={{ mask: "点击放大" }}
                                    />
                                    <div className="absolute left-3 top-3">
                                        <ReviewStatus status={selected.image.status} />
                                    </div>
                                    {selected.requirementArchived || selected.briefSuperseded ? <Tag className="!absolute !right-3 !top-3 !m-0" icon={selected.requirementArchived ? <Archive className="size-3" /> : undefined}>{selected.requirementArchived ? "需求已归档" : "旧修订"}</Tag> : null}
                                </div>
                                <div className="space-y-5 p-5">
                                    {selectedReadOnly ? (
                                        <Alert
                                            showIcon
                                            type="info"
                                            title="需求已归档 · 只读历史"
                                            description="机器审图与既有人工反馈完整保留；评分、Comment、隐藏、恢复和删除均已停用。"
                                        />
                                    ) : null}
                                    <div className="rounded-lg bg-muted/60 p-4 ring-1 ring-border">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-semibold">Codex 机器审图</span>
                                            {selected.machineReview ? <Tag color={machineDecisionColor(selected.machineReview.decision)}>{machineDecisionLabel(selected.machineReview.decision)}</Tag> : selectedMachineReviewPending ? <Tag color="processing">Codex 审图中</Tag> : <Tag>无机器审图记录</Tag>}
                                        </div>
                                        {selected.machineReview ? (
                                            <>
                                                <p className="mt-2 text-sm font-medium">{selected.machineReview.rating} / 5</p>
                                                <p className="mt-2 text-xs leading-5 text-muted-foreground">{selected.machineReview.comment}</p>
                                                {selected.machineReview.strengths.length ? <p className="mt-2 text-xs leading-5 text-muted-foreground">保留：{selected.machineReview.strengths.join("；")}</p> : null}
                                                {selected.machineReview.issues.length ? <p className="mt-1 text-xs leading-5 text-muted-foreground">改进：{selected.machineReview.issues.join("；")}</p> : null}
                                            </>
                                        ) : selectedMachineReviewPending
                                            ? <p className="mt-2 text-xs leading-5 text-muted-foreground">Codex 正在对照探索方向、Prompt 与技术质量审查这张图片。</p>
                                            : <p className="mt-2 text-xs leading-5 text-muted-foreground">这张图片来自历史或手动生成，没有自动机器审图；你仍可提交人工评分和 Comment。</p>}
                                        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">机器判断独立保存，不会冒充你的“不喜欢并学习”。</p>
                                    </div>
                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="text-sm font-semibold">审美评分</span>
                                            <span className="text-xs text-muted-foreground">{selected.feedback.rating ? `${selected.feedback.rating} 星` : "尚未评分"}</span>
                                        </div>
                                        <ImageFeedbackRating disabled={selectedReadOnly} value={selected.feedback.rating} onChange={(rating) => void mutate("rating", () => rateFrameFlowImage(endpoint, token, selected.image.id, rating), `${rating} 星反馈已记录`)} />
                                        <p className="mt-2 text-xs leading-5 text-muted-foreground">5 星强化，4 星继续变体，1–2 星降权，3 星保持中性观察。</p>
                                    </div>

                                    <div>
                                        <label htmlFor="frameflow-review-comment" className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                            <MessageSquareText className="size-4" strokeWidth={2} />
                                            Comment
                                        </label>
                                        <Input.TextArea
                                            id="frameflow-review-comment"
                                            value={commentDraft}
                                            onChange={(event) => setCommentDraft(event.target.value)}
                                            rows={4}
                                            maxLength={500}
                                            showCount
                                            disabled={selectedReadOnly}
                                            placeholder="具体写下喜欢或不喜欢的原因，下一轮会把它作为偏好证据。"
                                        />
                                        <Button
                                            className="mt-3 active:!scale-[.96] !transition-transform"
                                            loading={busyAction === "comment"}
                                            disabled={selectedReadOnly || commentDraft === (selected.feedback.comment || "")}
                                            onClick={() => void mutate("comment", () => commentFrameFlowImage(endpoint, token, selected.image.id, commentDraft), "Comment 已保存")}
                                        >
                                            保存 Comment
                                        </Button>
                                    </div>

                                    <div className="border-t border-border pt-4">
                                        <div className="flex flex-wrap gap-2">
                                            {selected.image.status === "hidden" ? (
                                                <Button
                                                    icon={<RotateCcw aria-hidden="true" className="size-4" strokeWidth={2} />}
                                                    loading={busyAction === "restore"}
                                                    disabled={selectedReadOnly}
                                                    onClick={() => void mutate("restore", () => restoreFrameFlowImage(endpoint, token, selected.image.id), "图片已恢复到审核队列")}
                                                    className="active:!scale-[.96] !transition-transform"
                                                >
                                                    恢复图片
                                                </Button>
                                            ) : (
                                                <Popconfirm
                                                    title="确认标记为不喜欢？"
                                                    description="图片会隐藏并作为 -4 强负反馈进入 Preference DNA，可在“已隐藏”中恢复。"
                                                    okText="不喜欢并学习"
                                                    cancelText="取消"
                                                    onConfirm={() => void mutate("hide", () => hideFrameFlowImage(endpoint, token, selected.image.id), "已记录强负反馈并隐藏图片")}
                                                >
                                                    <Button icon={<ThumbsDown aria-hidden="true" className="size-4" strokeWidth={2} />} loading={busyAction === "hide"} disabled={selectedReadOnly} className="active:!scale-[.96] !transition-transform">
                                                        不喜欢并学习
                                                    </Button>
                                                </Popconfirm>
                                            )}
                                            <Popconfirm
                                                title="确认删除这张图片？"
                                                description="图片会移出审核队列，当前评分、Comment 和强负反馈都不会进入 Preference DNA。历史记录仍保留，此操作不可恢复。"
                                                okText="确认删除"
                                                cancelText="取消"
                                                okButtonProps={{ danger: true }}
                                                onConfirm={() => void mutate("delete", () => deleteFrameFlowImage(endpoint, token, selected.image.id), "图片已删除，未记录偏好反馈")}
                                            >
                                                <Button danger icon={<Trash2 aria-hidden="true" className="size-4" strokeWidth={2} />} loading={busyAction === "delete"} disabled={selectedReadOnly} className="active:!scale-[.96] !transition-transform">
                                                    删除（不参与学习）
                                                </Button>
                                            </Popconfirm>
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{selectedReadOnly ? "只读历史不可新增或撤销反馈；恢复 Requirement 后，反馈入口会重新开放。" : "“不喜欢并学习”可恢复并记为 -4；“删除”不进入偏好学习且不可恢复。"}</p>
                                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                                            批次 {shortId(selected.image.runId)} · Prompt {shortId(selected.image.promptVersionId)} · {selected.image.width}×{selected.image.height}
                                        </p>
                                        {selected.image.outputConstraint ? (
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                画幅 {selected.image.outputConstraint.aspectRatio}
                                                {selected.image.outputConstraint.normalization === "top_crop"
                                                    ? ` · 已顶部安全裁切 ${selected.image.outputConstraint.sourceWidth}×${selected.image.outputConstraint.sourceHeight} → ${selected.image.width}×${selected.image.height}`
                                                    : selected.image.outputConstraint.normalization === "attention_crop"
                                                      ? ` · 已智能裁切 ${selected.image.outputConstraint.sourceWidth}×${selected.image.outputConstraint.sourceHeight} → ${selected.image.width}×${selected.image.height}`
                                                      : selected.image.outputConstraint.normalization === "center_crop"
                                                        ? ` · 已居中裁切 ${selected.image.outputConstraint.sourceWidth}×${selected.image.outputConstraint.sourceHeight} → ${selected.image.width}×${selected.image.height}`
                                                        : " · 原生尺寸已符合"}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <Empty className="my-32" image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择一张图片开始审核" />
                        )}
                    </div>
                </aside>
            </section>
        </div>
    );
}

function ReviewCard({ item, endpoint, token, selected, machineReviewPending, onSelect }: { item: FrameFlowReviewItem; endpoint: string; token: string; selected: boolean; machineReviewPending: boolean; onSelect: () => void }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onSelect}
            className={cn("overflow-hidden rounded-lg bg-background text-left shadow-card ring-1 transition-[box-shadow,transform] active:scale-[.96]", selected ? "ring-2 ring-primary" : "ring-border hover:ring-primary/40")}
        >
            <div className="relative aspect-[4/5] bg-muted">
                <img src={frameFlowImageUrl(endpoint, token, item.image.id)} alt={`待审图片 ${shortId(item.image.id)}`} className="size-full object-contain outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" />
                <div className="absolute left-2 top-2">
                    <ReviewStatus status={item.image.status} />
                </div>
                {item.feedback.comment ? (
                    <span className="absolute right-2 top-2 rounded-md bg-background/90 p-1.5 text-foreground shadow-sm backdrop-blur" title="已有 Comment">
                        <MessageSquareText className="size-3.5" strokeWidth={2} />
                    </span>
                ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">批次 {shortId(item.image.runId)}{item.requirementArchived ? " · 已归档" : item.briefSuperseded ? " · 旧修订" : ""}</span>
                <span className="text-xs font-medium tabular-nums">{item.machineReview ? `Codex ${item.machineReview.rating}/5` : machineReviewPending ? "Codex 审图中" : item.feedback.rating ? `${item.feedback.rating} 星` : "无机器审图"}</span>
            </div>
        </button>
    );
}

function ReviewMetric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" | "danger" }) {
    return (
        <div className="rounded-lg bg-card px-4 py-3 shadow-card ring-1 ring-border">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "success" && "text-feedback-reinforce", tone === "warning" && "text-feedback-variant", tone === "danger" && "text-feedback-delete")}>{value}</div>
        </div>
    );
}

function ReviewStatus({ status }: { status: FrameFlowImageStatus }) {
    const meta = {
        pending_review: { label: "待审核", color: "warning", icon: <Eye className="size-3" /> },
        reviewed: { label: "已反馈", color: "success", icon: <Eye className="size-3" /> },
        restored: { label: "已恢复", color: "processing", icon: <RotateCcw className="size-3" /> },
        hidden: { label: "已隐藏", color: "error", icon: <EyeOff className="size-3" /> },
        permanently_deleted: { label: "已删除", color: "default", icon: <Trash2 className="size-3" /> },
    } as const;
    return (
        <Tag color={meta[status].color} icon={meta[status].icon} className="!m-0">
            {meta[status].label}
        </Tag>
    );
}

function reviewItemAutoRunId(item: FrameFlowReviewItem, autoRuns: FrameFlowAutoRun[]) {
    return item.machineReview?.autoRunId || autoRuns.find((autoRun) => autoRun.currentRunId === item.image.runId || autoRun.lastRunId === item.image.runId)?.id;
}

function emptyLabel(filter: ReviewFilter) {
    return ({ all: "还没有可审核的 FrameFlow 图片", pending: "没有待审核图片", reviewed: "还没有已反馈图片", hidden: "没有已隐藏图片" } as const)[filter];
}
function machineDecisionLabel(decision: "keep" | "vary" | "reject") {
    return ({ keep: "保留方向", vary: "继续变体", reject: "下一轮规避" } as const)[decision];
}
function machineDecisionColor(decision: "keep" | "vary" | "reject") {
    return ({ keep: "success", vary: "processing", reject: "error" } as const)[decision];
}
function shortId(value: string) {
    return value.slice(0, 8);
}
function errorMessage(reason: unknown) {
    return reason instanceof Error ? reason.message : "未知错误，请稍后重试";
}
