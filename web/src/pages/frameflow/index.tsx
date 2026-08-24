import { Archive, AlertTriangle, CheckCircle2, Clock3, ImageOff, RefreshCw, RotateCcw, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Checkbox, Empty, Image, Popconfirm, Spin, Tabs, Tag, Tooltip } from "antd";

import { cn } from "@/lib/utils";
import {
    cancelFrameFlowRun,
    frameFlowImageUrl,
    getFrameFlowBrief,
    getFrameFlowCurrentBrief,
    getFrameFlowPromptLineage,
    getFrameFlowRun,
    listFrameFlowRuns,
    listFrameFlowQuarantine,
    retryFrameFlowSlots,
    type FrameFlowGenerationSlot,
    type FrameFlowPromptLineage,
    type FrameFlowQuarantineRecord,
    type FrameFlowRun,
    type FrameFlowRunDetail,
    type FrameFlowRunStatus,
} from "@/services/api/frameflow";
import { useAgentStore } from "@/stores/use-agent-store";
import { FrameFlowCreateView } from "./create-view";
import { FrameFlowAutoRunView } from "./daily-view";
import { FrameFlowDecisionTrace } from "./decision-trace";
import { FrameFlowPreferenceView } from "./preference-view";
import { FrameFlowReviewView } from "./review-view";
import { FrameFlowTrajectoryView } from "./trajectory-view";

const views = [
    { key: "create", label: "创建" },
    { key: "auto-run", label: "自动跑风格" },
    { key: "trajectory", label: "演化轨迹" },
    { key: "review", label: "待审" },
    { key: "library", label: "资产库", disabled: true },
    { key: "prompt-lab", label: "Prompt Lab", disabled: true },
    { key: "preference", label: "需求内偏好" },
    { key: "lineage", label: "运行与血缘" },
];

export default function FrameFlowPage() {
    const { message } = App.useApp();
    const endpoint = useAgentStore((state) => state.url)
        .trim()
        .replace(/\/$/, "");
    const token = useAgentStore((state) => state.token).trim();
    const openAgent = useAgentStore((state) => state.openPanel);
    const [runs, setRuns] = useState<FrameFlowRun[]>([]);
    const [selectedRunId, setSelectedRunId] = useState(() => new URLSearchParams(window.location.search).get("runId") || "");
    const [detail, setDetail] = useState<FrameFlowRunDetail | null>(null);
    const [lineage, setLineage] = useState<FrameFlowPromptLineage | null>(null);
    const [quarantine, setQuarantine] = useState<FrameFlowQuarantineRecord[]>([]);
    const [selectedFailedSlots, setSelectedFailedSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState("");
    const [activeView, setActiveView] = useState<"create" | "auto-run" | "trajectory" | "review" | "preference" | "lineage">(() => {
        const view = new URLSearchParams(window.location.search).get("view");
        return view === "lineage" || view === "auto-run" || view === "trajectory" || view === "review" || view === "preference" ? view : "create";
    });

    const changeView = (view: string) => {
        if (view !== "create" && view !== "auto-run" && view !== "trajectory" && view !== "review" && view !== "preference" && view !== "lineage") return;
        setActiveView(view);
        const url = new URL(window.location.href);
        url.searchParams.set("view", view);
        window.history.replaceState({}, "", url);
    };

    const loadDetail = useCallback(
        async (runId: string, silent = false) => {
            if (!endpoint || !token || !runId) return;
            if (!silent) setDetailLoading(true);
            try {
                const next = await getFrameFlowRun(endpoint, token, runId);
                const nextLineage = await getFrameFlowPromptLineage(endpoint, token, next.run.promptVersionId);
                setDetail(next);
                setLineage(nextLineage);
                setSelectedFailedSlots(next.slots.filter((slot) => slot.status === "failed" && slot.error?.retryable).map((slot) => slot.id));
            } catch (reason) {
                setDetail(null);
                setLineage(null);
                setError(errorMessage(reason));
            } finally {
                if (!silent) setDetailLoading(false);
            }
        },
        [endpoint, token],
    );

    const loadRuns = useCallback(
        async (preferredRunId?: string, silent = false) => {
            if (!endpoint || !token) return;
            if (!silent) {
                setLoading(true);
                setError("");
            }
            try {
                const requestedRunId = preferredRunId || selectedRunId || new URLSearchParams(window.location.search).get("runId") || "";
                const [listedRuns, nextQuarantine, requestedDetail] = await Promise.all([
                    listFrameFlowRuns(endpoint, token, 100, true),
                    listFrameFlowQuarantine(endpoint, token),
                    requestedRunId ? getFrameFlowRun(endpoint, token, requestedRunId).catch(() => undefined) : undefined,
                ]);
                let next = listedRuns;
                if (requestedDetail && !listedRuns.some((run) => run.id === requestedDetail.run.id)) {
                    const [sourceBrief, currentBrief] = await Promise.all([
                        getFrameFlowBrief(endpoint, token, requestedDetail.run.briefId),
                        getFrameFlowCurrentBrief(endpoint, token, requestedDetail.run.briefId),
                    ]);
                    next = [{
                        ...requestedDetail.run,
                        requirementArchived: Boolean(currentBrief.archivedAt),
                        briefSuperseded: Boolean(sourceBrief.supersededAt || sourceBrief.supersededByBriefId),
                    }, ...listedRuns];
                }
                setRuns(next);
                setQuarantine(nextQuarantine);
                const nextId = requestedRunId && next.some((run) => run.id === requestedRunId) ? requestedRunId : next[0]?.id || "";
                setSelectedRunId(nextId);
                const url = new URL(window.location.href);
                if (nextId) url.searchParams.set("runId", nextId);
                else url.searchParams.delete("runId");
                window.history.replaceState({}, "", url);
                if (nextId) await loadDetail(nextId, silent);
                else {
                    setDetail(null);
                    setLineage(null);
                }
            } catch (reason) {
                setError(errorMessage(reason));
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [endpoint, loadDetail, selectedRunId, token],
    );

    useEffect(() => {
        if (activeView === "lineage") void loadRuns();
    }, [activeView, endpoint, token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (activeView !== "lineage" || !selectedRunId || !detail || !["queued", "running", "retrying"].includes(detail.run.status)) return;
        let inFlight = false;
        const timer = window.setInterval(() => {
            if (inFlight) return;
            inFlight = true;
            void loadRuns(selectedRunId, true).finally(() => {
                inFlight = false;
            });
        }, 1_500);
        return () => window.clearInterval(timer);
    }, [activeView, detail, loadRuns, selectedRunId]);

    const selectRun = (runId: string) => {
        setSelectedRunId(runId);
        const url = new URL(window.location.href);
        url.searchParams.set("view", "lineage");
        url.searchParams.set("runId", runId);
        window.history.replaceState({}, "", url);
        void loadDetail(runId);
    };
    const retryFailed = async () => {
        const listedRun = runs.find((run) => run.id === detail?.run.id);
        if (!detail || !selectedFailedSlots.length || listedRun?.requirementArchived || listedRun?.briefSuperseded) return;
        setRetrying(true);
        try {
            await retryFrameFlowSlots(endpoint, token, detail.run.id, selectedFailedSlots);
            message.success(`已提交 ${selectedFailedSlots.length} 个失败项的重试`);
            await loadRuns(detail.run.id);
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setRetrying(false);
        }
    };
    const cancelRun = async () => {
        const listedRun = runs.find((run) => run.id === detail?.run.id);
        if (!detail || listedRun?.requirementArchived || listedRun?.briefSuperseded) return;
        setCancelling(true);
        try {
            await cancelFrameFlowRun(endpoint, token, detail.run.id);
            message.success("取消请求已记录；迟到结果只会进入隔离区");
            await loadRuns(detail.run.id);
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setCancelling(false);
        }
    };
    const summary = useMemo(
        () => ({
            total: runs.length,
            succeeded: runs.filter((run) => run.status === "succeeded").length,
            partial: runs.filter((run) => run.status === "partially_succeeded").length,
            failed: runs.filter((run) => run.status === "failed").length,
        }),
        [runs],
    );
    const openRun = (runId: string) => {
        setActiveView("lineage");
        setSelectedRunId(runId);
        const url = new URL(window.location.href);
        url.searchParams.set("view", "lineage");
        url.searchParams.set("runId", runId);
        window.history.replaceState({}, "", url);
        void loadRuns(runId);
    };
    const openReview = (autoRunId: string) => {
        setActiveView("review");
        const url = new URL(window.location.href);
        url.searchParams.set("view", "review");
        url.searchParams.set("autoRunId", autoRunId);
        window.history.replaceState({}, "", url);
    };
    const openTrajectory = (autoRunId: string) => {
        setActiveView("trajectory");
        const url = new URL(window.location.href);
        url.searchParams.set("view", "trajectory");
        url.searchParams.set("autoRunId", autoRunId);
        window.history.replaceState({}, "", url);
    };

    return (
        <main className="h-full min-h-0 overflow-y-auto bg-background text-foreground">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Sparkles className="size-4" strokeWidth={2} />
                            FrameFlow
                        </div>
                        <h1 className="page-title">审美训练工作台</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {activeView === "create"
                                ? "从创作需求开始，先审 Prompt，再批准真实生成。"
                                : activeView === "auto-run"
                              ? "给定方向后由 Codex 自动规划、生图、审图、记录并持续迭代。"
                              : activeView === "trajectory"
                                ? "按轮次比较图片、机器审图和 Prompt Diff，查看自动探索如何演化。"
                              : activeView === "review"
                                    ? "查看 Codex 机器审图；也可打星、写 Comment 或用人工偏好纠偏。"
                                    : activeView === "preference"
                                      ? "按当前需求查看人工偏好证据；不同 Creative Brief 之间严格隔离。"
                                      : "追踪每轮 Agent Decision、Prompt Diff 与真实生成结果。"}
                        </p>
                    </div>
                    {activeView === "lineage" ? (
                        <Tooltip title="重新读取 Canvas Agent 中的运行记录">
                            <Button className="active:!scale-[.96] !transition-transform" icon={<RefreshCw className="size-4" strokeWidth={2} />} loading={loading} onClick={() => void loadRuns(selectedRunId)}>
                                刷新
                            </Button>
                        </Tooltip>
                    ) : null}
                </header>

                <Tabs className="mt-5" activeKey={activeView} onChange={changeView} items={views} />

                {!token ? (
                    <Alert
                        showIcon
                        type="info"
                        title="先连接 Canvas Agent"
                        description="FrameFlow 的运行、图片和血缘保存在本地 Canvas Agent。连接后即可读取真实记录。"
                        action={
                            <Button type="primary" onClick={openAgent}>
                                连接 Agent
                            </Button>
                        }
                    />
                ) : null}
                {token && activeView === "lineage" && error ? <Alert className="mb-4" showIcon type="error" title="FrameFlow 暂时无法读取" description={error} action={<Button onClick={() => void loadRuns(selectedRunId)}>重试</Button>} /> : null}

                {token && activeView === "create" ? <FrameFlowCreateView onRunStarted={openRun} /> : null}
                {token && activeView === "auto-run" ? <FrameFlowAutoRunView endpoint={endpoint} token={token} onRunStarted={openRun} onReview={openReview} onTrajectory={openTrajectory} /> : null}
                {token && activeView === "trajectory" ? <FrameFlowTrajectoryView endpoint={endpoint} token={token} onOpenRun={openRun} /> : null}
                {token && activeView === "review" ? <FrameFlowReviewView /> : null}
                {token && activeView === "preference" ? <FrameFlowPreferenceView /> : null}
                {token && activeView === "lineage" ? (
                    <>
                        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="运行概览">
                            <Metric label="全部运行" value={summary.total} />
                            <Metric label="全部成功" value={summary.succeeded} tone="success" />
                            <Metric label="部分成功" value={summary.partial} tone="warning" />
                            <Metric label="失败" value={summary.failed} tone="danger" />
                            <Metric label="隔离文件" value={quarantine.length} tone="warning" />
                        </section>

                        {quarantine.length ? (
                            <Alert
                                className="mt-4"
                                showIcon
                                icon={<ShieldAlert className="size-4" strokeWidth={2} />}
                                type="warning"
                                title={`隔离区保留 ${quarantine.length} 个未登记文件`}
                                description="取消后的迟到结果、校验失败或重启发现的孤儿文件不会进入资产库，可按记录追溯恢复。"
                            />
                        ) : null}

                        <section className="mt-5 grid min-h-[480px] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
                            <div className="min-w-0 rounded-xl bg-card p-2 shadow-card ring-1 ring-border">
                                <div className="flex items-center justify-between px-2 pb-2 pt-1">
                                    <h2 className="text-sm font-semibold">生成批次</h2>
                                    <span className="text-xs tabular-nums text-muted-foreground">{runs.length} 条</span>
                                </div>
                                {loading && !runs.length ? (
                                    <div className="flex h-72 items-center justify-center">
                                        <Spin />
                                    </div>
                                ) : null}
                                {!loading && !runs.length ? <Empty className="my-20" image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有 FrameFlow 运行记录" /> : null}
                                <div className="thin-scrollbar max-h-[620px] space-y-1 overflow-y-auto">
                                    {runs.map((run) => (
                                        <RunRow key={run.id} run={run} active={run.id === selectedRunId} onClick={() => selectRun(run.id)} />
                                    ))}
                                </div>
                            </div>

                            <div className="min-w-0 rounded-xl bg-card p-4 shadow-card ring-1 ring-border sm:p-5">
                                {detailLoading ? (
                                    <div className="flex h-80 items-center justify-center">
                                        <Spin />
                                    </div>
                                ) : null}
                                {!detailLoading && detail ? (
                                    <RunDetail
                                        detail={detail}
                                        lineage={lineage}
                                        endpoint={endpoint}
                                        token={token}
                                        selectedFailedSlots={selectedFailedSlots}
                                        onSelectedFailedSlotsChange={setSelectedFailedSlots}
                                        onRetry={() => void retryFailed()}
                                        onCancel={() => void cancelRun()}
                                        retrying={retrying}
                                        cancelling={cancelling}
                                        readOnly={Boolean(runs.find((run) => run.id === detail.run.id)?.requirementArchived || runs.find((run) => run.id === detail.run.id)?.briefSuperseded)}
                                        archived={Boolean(runs.find((run) => run.id === detail.run.id)?.requirementArchived)}
                                    />
                                ) : null}
                                {!detailLoading && !detail ? <Empty className="my-28" image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择一个生成批次查看血缘" /> : null}
                            </div>
                        </section>
                    </>
                ) : null}
            </div>
        </main>
    );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" | "danger" }) {
    return (
        <div className="rounded-lg bg-card px-4 py-3 shadow-card ring-1 ring-border">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "success" && "text-feedback-reinforce", tone === "warning" && "text-feedback-variant", tone === "danger" && "text-feedback-delete")}>{value}</div>
        </div>
    );
}

function RunRow({ run, active, onClick }: { run: FrameFlowRun; active: boolean; onClick: () => void }) {
    return (
        <button type="button" aria-pressed={active} onClick={onClick} className={cn("w-full rounded-lg px-3 py-3 text-left transition-[background-color,transform] active:scale-[.96]", active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60")}>
            <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium">批次 {shortId(run.id)}</span>
                <RunStatus status={run.status} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{formatDate(run.createdAt)}</span>
                <span className="tabular-nums">
                    {run.imageIds.length}/{run.requestedCount} 张
                </span>
            </div>
            {run.requirementArchived ? <Tag className="!mt-2 !mb-0" icon={<Archive className="size-3" />}>需求已归档 · 只读</Tag> : run.briefSuperseded ? <Tag className="!mt-2 !mb-0">旧需求修订 · 只读</Tag> : null}
        </button>
    );
}

function RunDetail({
    detail,
    lineage,
    endpoint,
    token,
    selectedFailedSlots,
    onSelectedFailedSlotsChange,
    onRetry,
    onCancel,
    retrying,
    cancelling,
    readOnly,
    archived,
}: {
    detail: FrameFlowRunDetail;
    lineage: FrameFlowPromptLineage | null;
    endpoint: string;
    token: string;
    selectedFailedSlots: string[];
    onSelectedFailedSlotsChange: (ids: string[]) => void;
    onRetry: () => void;
    onCancel: () => void;
    retrying: boolean;
    cancelling: boolean;
    readOnly: boolean;
    archived: boolean;
}) {
    const failed = detail.slots.filter((slot) => slot.status === "failed");
    const active = ["queued", "running", "retrying"].includes(detail.run.status);
    const toggleSlot = (slotId: string, checked: boolean) => onSelectedFailedSlotsChange(checked ? [...selectedFailedSlots, slotId] : selectedFailedSlots.filter((id) => id !== slotId));
    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">生成批次 {shortId(detail.run.id)}</h2>
                        <RunStatus status={detail.run.status} />
                        {readOnly ? <Tag icon={archived ? <Archive className="size-3" /> : undefined}>{archived ? "需求已归档 · 只读" : "旧需求修订 · 只读"}</Tag> : null}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Prompt Version · {shortId(detail.run.promptVersionId)}</p>
                        <p>
                            Brief · {shortId(detail.run.briefId)} · {formatDate(detail.run.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {active && !readOnly ? (
                        <Popconfirm title="取消这个生成批次？" description="已生成但尚未登记的迟到文件会进入隔离区。" okText="确认取消" cancelText="继续生成" onConfirm={onCancel}>
                            <Button danger icon={<XCircle className="size-4" strokeWidth={2} />} loading={cancelling} className="active:!scale-[.96] !transition-transform">
                                取消生成
                            </Button>
                        </Popconfirm>
                    ) : null}
                    {failed.length ? (
                        <Button type="primary" danger icon={<RotateCcw className="size-4" strokeWidth={2} />} disabled={readOnly || !selectedFailedSlots.length} title={readOnly ? "只读历史不能重试失败项" : undefined} loading={retrying} onClick={onRetry} className="active:!scale-[.96] !transition-transform">
                            {readOnly ? "只读历史不可重试" : `重试 ${selectedFailedSlots.length} 个失败项`}
                        </Button>
                    ) : null}
                </div>
            </div>

            <section className="mt-5" aria-labelledby="frameflow-run-results">
                <div className="flex items-center justify-between gap-3">
                    <h3 id="frameflow-run-results" className="text-base font-semibold">
                        生成结果
                    </h3>
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {detail.slots.filter((slot) => slot.status === "succeeded").length}/{detail.slots.length} 张已生成
                    </span>
                </div>
                <Image.PreviewGroup>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {detail.slots.map((slot) => (
                            <SlotCard key={slot.id} slot={slot} endpoint={endpoint} token={token} checked={!readOnly && selectedFailedSlots.includes(slot.id)} disabled={readOnly} onCheckedChange={(checked) => toggleSlot(slot.id, checked)} />
                        ))}
                    </div>
                </Image.PreviewGroup>
            </section>

            <FrameFlowDecisionTrace lineage={lineage} />
        </div>
    );
}

function SlotCard({ slot, endpoint, token, checked, disabled, onCheckedChange }: { slot: FrameFlowGenerationSlot; endpoint: string; token: string; checked: boolean; disabled: boolean; onCheckedChange: (checked: boolean) => void }) {
    const succeeded = slot.status === "succeeded" && slot.imageId;
    return (
        <article className="overflow-hidden rounded-lg bg-background shadow-card ring-1 ring-border">
            <div className="relative aspect-[4/3] bg-muted">
                {succeeded ? (
                    <Image
                        src={frameFlowImageUrl(endpoint, token, slot.imageId!)}
                        alt={`生成结果 ${slot.index + 1}`}
                        rootClassName="!block !size-full cursor-zoom-in"
                        className="!size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                        preview={{ mask: "点击放大" }}
                    />
                ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 px-5 text-center text-muted-foreground">
                        {slot.status === "failed" ? <ImageOff className="size-6" strokeWidth={1.5} /> : slot.status === "cancelled" ? <XCircle className="size-6" strokeWidth={1.5} /> : <Clock3 className="size-6" strokeWidth={1.5} />}
                        <span className="text-xs">{slot.error?.message || (slot.status === "cancelled" ? "该生成项已取消" : "等待生成结果")}</span>
                    </div>
                )}
                <div className="absolute left-2 top-2">
                    <Tag className="!m-0">#{slot.index + 1}</Tag>
                </div>
                {slot.status === "failed" && slot.error?.retryable ? (
                    <Checkbox className="absolute right-2 top-2 rounded bg-background/90 px-2 py-1" checked={checked} disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)}>
                        重试
                    </Checkbox>
                ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span className={cn("flex items-center gap-1.5", slot.status === "succeeded" ? "text-feedback-reinforce" : slot.status === "failed" ? "text-feedback-delete" : "text-muted-foreground")}>
                    {slot.status === "succeeded" ? (
                        <CheckCircle2 className="size-3.5" strokeWidth={2} />
                    ) : slot.status === "failed" ? (
                        <AlertTriangle className="size-3.5" strokeWidth={2} />
                    ) : slot.status === "cancelled" ? (
                        <XCircle className="size-3.5" strokeWidth={2} />
                    ) : (
                        <Clock3 className="size-3.5" strokeWidth={2} />
                    )}
                    {slotLabel(slot.status)}
                </span>
                <span className="tabular-nums text-muted-foreground">尝试 {slot.attempts} 次</span>
            </div>
        </article>
    );
}

function RunStatus({ status }: { status: FrameFlowRunStatus }) {
    const value = statusMeta[status];
    return (
        <Tag color={value.color} className="!m-0">
            {value.label}
        </Tag>
    );
}

const statusMeta: Record<FrameFlowRunStatus, { label: string; color?: string }> = {
    queued: { label: "排队中", color: "default" },
    running: { label: "生成中", color: "processing" },
    succeeded: { label: "成功", color: "success" },
    partially_succeeded: { label: "部分成功", color: "warning" },
    failed: { label: "失败", color: "error" },
    retrying: { label: "重试中", color: "processing" },
    cancelled: { label: "已取消", color: "default" },
};

function slotLabel(status: FrameFlowGenerationSlot["status"]) {
    return ({ queued: "排队中", running: "生成中", succeeded: "已生成", failed: "生成失败", cancelled: "已取消" } as const)[status];
}

function shortId(value: string) {
    return value.slice(0, 8);
}
function formatDate(value: string) {
    return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function errorMessage(reason: unknown) {
    return reason instanceof Error ? reason.message : "未知错误，请稍后重试";
}
