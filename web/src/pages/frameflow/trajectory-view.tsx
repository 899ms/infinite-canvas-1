import { Archive, ArrowUpRight, Award, Check, ChevronDown, RefreshCw, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Button, Empty, Image, Segmented, Select, Spin, Tag } from "antd";

import {
    frameFlowImageUrl,
    getFrameFlowAutoRunTrajectory,
    listFrameFlowAutoRuns,
    summarizeFrameFlowAutoRunTrajectory,
    type FrameFlowAutoRun,
    type FrameFlowAutoRunTrajectory,
    type FrameFlowMachineReview,
    type FrameFlowPromptFieldChange,
    type FrameFlowPromptFieldKey,
} from "@/services/api/frameflow";
import { canWriteRequirement, createLatestRequestGate, mergeRequestedAutoRun, type FrameFlowRequirementScope } from "./requirement-view-state";

export function FrameFlowTrajectoryView({ endpoint, token, onOpenRun }: { endpoint: string; token: string; onOpenRun: (runId: string) => void }) {
    const initialId = useMemo(() => new URLSearchParams(window.location.search).get("autoRunId") || "", []);
    const [autoRuns, setAutoRuns] = useState<FrameFlowAutoRun[]>([]);
    const [selectedId, setSelectedId] = useState(initialId);
    const [trajectory, setTrajectory] = useState<FrameFlowAutoRunTrajectory | null>(null);
    const [loading, setLoading] = useState(false);
    const [summarizing, setSummarizing] = useState(false);
    const [error, setError] = useState("");
    const [scope, setScope] = useState<FrameFlowRequirementScope>(() => new URLSearchParams(window.location.search).get("scope") === "archived" ? "archived" : "active");
    const requestGate = useMemo(() => createLatestRequestGate(), []);
    const scopeRef = useRef(scope);

    const changeScope = useCallback((nextScope: FrameFlowRequirementScope) => {
        requestGate.invalidate();
        scopeRef.current = nextScope;
        setScope(nextScope);
        setAutoRuns([]);
        setSelectedId("");
        setTrajectory(null);
        const url = new URL(window.location.href);
        if (nextScope === "archived") url.searchParams.set("scope", "archived");
        else url.searchParams.delete("scope");
        url.searchParams.delete("autoRunId");
        window.history.replaceState({}, "", url);
    }, [requestGate]);

    const selectAutoRun = useCallback((autoRunId: string) => {
        requestGate.invalidate();
        setSelectedId(autoRunId);
        const url = new URL(window.location.href);
        url.searchParams.set("view", "trajectory");
        url.searchParams.set("autoRunId", autoRunId);
        window.history.replaceState({}, "", url);
    }, [requestGate]);

    const load = useCallback(async (silent = false) => {
        const request = requestGate.begin();
        if (!silent) setLoading(true);
        setError("");
        try {
            const requestedId = selectedId || new URLSearchParams(window.location.search).get("autoRunId") || "";
            const [listedAutoRuns, requestedTrajectory] = await Promise.all([
                listFrameFlowAutoRuns(endpoint, token, 200, scope === "archived" || Boolean(requestedId)),
                requestedId ? getFrameFlowAutoRunTrajectory(endpoint, token, requestedId).catch(() => undefined) : undefined,
            ]);
            if (!requestGate.isLatest(request)) return;
            const allAutoRuns = mergeRequestedAutoRun(listedAutoRuns, requestedTrajectory?.autoRun);
            const requested = allAutoRuns.find((autoRun) => autoRun.id === requestedId);
            const resolvedScope = requested?.requirementArchived ? "archived" : requested ? "active" : scope;
            const candidates = allAutoRuns.filter((autoRun) => autoRun.iteration > 0 && autoRun.requirementArchived === (resolvedScope === "archived"));
            const nextId = candidates.some((autoRun) => autoRun.id === selectedId) ? selectedId : candidates[0]?.id || "";
            const nextTrajectory = nextId
                ? requestedTrajectory?.autoRun.id === nextId ? requestedTrajectory : await getFrameFlowAutoRunTrajectory(endpoint, token, nextId)
                : null;
            if (!requestGate.isLatest(request)) return;
            if (resolvedScope !== scope) {
                scopeRef.current = resolvedScope;
                setScope(resolvedScope);
            }
            setAutoRuns(candidates);
            setSelectedId(nextId);
            if (nextId !== selectedId) {
                const url = new URL(window.location.href);
                if (nextId) url.searchParams.set("autoRunId", nextId);
                else url.searchParams.delete("autoRunId");
                window.history.replaceState({}, "", url);
            }
            setTrajectory(nextTrajectory);
        } catch (reason) {
            if (requestGate.isLatest(request)) setError(errorMessage(reason));
        } finally {
            if (!silent && requestGate.isLatest(request)) setLoading(false);
        }
    }, [endpoint, requestGate, scope, selectedId, token]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        if (!trajectory || (trajectory.autoRun.state !== "generating" && trajectory.autoRun.state !== "reviewing")) return;
        const timer = window.setInterval(() => void load(true), 2_000);
        return () => window.clearInterval(timer);
    }, [load, trajectory]);

    const summarize = useCallback(async (force: boolean) => {
        if (!trajectory || !canWriteRequirement(scope, trajectory.autoRun.requirementArchived) || trajectory.autoRun.briefSuperseded) return;
        const actionScope = scope;
        const autoRunId = trajectory.autoRun.id;
        setSummarizing(true);
        setError("");
        try {
            const summary = await summarizeFrameFlowAutoRunTrajectory(endpoint, token, autoRunId, force);
            if (scopeRef.current !== actionScope) return;
            setTrajectory((current) => current?.autoRun.id === autoRunId ? { ...current, summary } : current);
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setSummarizing(false);
        }
    }, [endpoint, scope, token, trajectory]);

    return (
        <section aria-label="Auto Run 演化轨迹">
            <div className="rounded-xl bg-card p-5 shadow-card ring-1 ring-border">
                <p className="text-sm font-medium">选择自动跑任务</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <Select
                        className="min-w-[min(100%,18rem)] w-full max-w-xl flex-1"
                        value={selectedId || undefined}
                        placeholder={scope === "archived" ? "选择已归档自动跑" : "选择已有自动跑"}
                        options={autoRuns.map((autoRun) => ({ value: autoRun.id, label: `${autoRun.name} · ${autoRun.iteration}/${autoRun.maxIterations} 轮${autoRun.briefSuperseded ? " · 旧修订" : ""}` }))}
                        onChange={selectAutoRun}
                    />
                    <div className="flex shrink-0 items-center gap-3">
                        <Segmented
                            aria-label="演化轨迹需求范围"
                            size="small"
                            value={scope}
                            onChange={(value) => changeScope(value as FrameFlowRequirementScope)}
                            options={[{ label: "活动需求", value: "active" }, { label: "查看已归档", value: "archived" }]}
                        />
                        <Button icon={<RefreshCw className="size-4" />} loading={loading} onClick={() => void load()}>刷新轨迹</Button>
                    </div>
                </div>
            </div>

            {error ? <Alert className="mt-4" showIcon type="error" title="演化轨迹暂时无法读取" description={error} /> : null}
            {loading && !trajectory ? <div className="grid min-h-72 place-items-center"><Spin /></div> : null}
            {!loading && !trajectory ? <Empty className="my-20" image={Empty.PRESENTED_IMAGE_SIMPLE} description={scope === "archived" ? "还没有已归档需求的演化轨迹" : "还没有可展示的自动跑轮次"} /> : null}

            {trajectory ? (
                <div className="mt-6">
                    <header className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-semibold tracking-tight">{trajectory.autoRun.name}</h2>
                            <Tag color={trajectory.autoRun.state === "completed" ? "success" : "processing"}>{trajectory.autoRun.iteration}/{trajectory.autoRun.maxIterations} 轮</Tag>
                            {trajectory.autoRun.requirementArchived ? <Tag icon={<Archive className="size-3" />}>需求已归档 · 只读</Tag> : trajectory.autoRun.briefSuperseded ? <Tag>旧需求修订 · 只读</Tag> : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{trajectory.brief.subject}</p>
                        <p className="mt-1 text-xs text-muted-foreground">从左到右按真实轮次排列；每张卡均来自不可变 Prompt、Run、图片和 Machine Review 血缘。</p>
                    </header>

                    {trajectory.autoRun.requirementArchived || trajectory.autoRun.briefSuperseded ? (
                        <Alert className="mt-4" showIcon type="info" title={trajectory.autoRun.requirementArchived ? "该需求已归档，演化轨迹为只读历史" : "这是旧需求修订的只读轨迹"} description="图片、机器审图、Prompt Diff 与运行血缘均已保留；只读状态下不能生成或重新分析跨轮总结。" />
                    ) : null}

                    <TrajectorySummary trajectory={trajectory} summarizing={summarizing} readOnly={!canWriteRequirement(scope, trajectory.autoRun.requirementArchived) || trajectory.autoRun.briefSuperseded} onSummarize={summarize} />

                    <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-4 [scroll-padding-inline:1rem] sm:-mx-6 sm:px-6 sm:[scroll-padding-inline:1.5rem]">
                        <ol className="flex w-max snap-x snap-mandatory gap-4" aria-label={`${trajectory.autoRun.name} 的轮次轨迹`}>
                            {trajectory.rounds.map((round) => (
                                <li key={round.run.id} className="w-[min(84vw,22rem)] shrink-0 snap-start">
                                    <article className="flex h-full flex-col rounded-xl bg-card p-4 shadow-card ring-1 ring-border">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">ITERATION {round.iteration}</p>
                                                <h3 className="mt-1 text-lg font-semibold">第 {round.iteration} 轮</h3>
                                            </div>
                                            <div className="flex flex-wrap justify-end gap-1">
                                                <Tag>Prompt r{round.prompt.revision}</Tag>
                                                <Tag color={runTone(round.run.status)}>{runLabel(round.run.status)}</Tag>
                                            </div>
                                        </div>

                                        <Image.PreviewGroup>
                                            <div className={`mt-4 grid gap-2 ${round.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                                                {round.images.map(({ image, machineReview }, imageIndex) => (
                                                    <div key={image.id} className="min-w-0">
                                                        <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                                                            <Image
                                                                className="!size-full !object-cover"
                                                                rootClassName="!block !size-full cursor-zoom-in"
                                                                src={frameFlowImageUrl(endpoint, token, image.id)}
                                                                alt={`第 ${round.iteration} 轮图片 ${imageIndex + 1}`}
                                                                preview={{ mask: "点击放大" }}
                                                            />
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {machineReview ? <Tag color={decisionTone(machineReview.decision)}>Codex {machineReview.rating}/5 · {decisionLabel(machineReview.decision)}</Tag> : <Tag>等待机器审图</Tag>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Image.PreviewGroup>

                                        <ReviewSummary reviews={round.images.flatMap((item) => item.machineReview ? [item.machineReview] : [])} />

                                        <div className="mt-5 space-y-2">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <Sparkles className="size-4 text-primary" />
                                                本轮 Prompt 变化
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {changedFields(round.prompt.diff).map((field) => <Tag key={field}>{fieldLabel[field]}</Tag>)}
                                                {!changedFields(round.prompt.diff).length ? <span className="text-xs text-muted-foreground">首轮建立方向基线</span> : null}
                                            </div>
                                            <details className="group rounded-lg bg-muted/60 px-3 py-2 text-sm">
                                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                                                    查看 Prompt Diff 与规划依据
                                                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                                                </summary>
                                                <p className="mt-3 leading-6 text-muted-foreground">{round.prompt.reason}</p>
                                                <PromptDiff changes={allChanges(round.prompt.diff)} />
                                            </details>
                                        </div>

                                        <Button className="mt-5" type="text" icon={<ArrowUpRight className="size-4" />} onClick={() => onOpenRun(round.run.id)}>打开本轮完整血缘</Button>
                                    </article>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function TrajectorySummary({ trajectory, summarizing, readOnly, onSummarize }: { trajectory: FrameFlowAutoRunTrajectory; summarizing: boolean; readOnly: boolean; onSummarize: (force: boolean) => void }) {
    const reviewedIterations = trajectory.rounds.filter((round) => round.images.length > 0 && round.images.every((item) => item.machineReview)).map((round) => round.iteration);
    if (reviewedIterations.length < 2) return null;
    const latestReviewed = reviewedIterations.at(-1)!;
    const stale = Boolean(trajectory.summary && trajectory.summary.throughIteration < latestReviewed);

    if (!trajectory.summary) return (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-muted/35 p-5">
            <div className="max-w-2xl">
                <p className="flex items-center gap-2 font-medium"><Sparkles className="size-4 text-primary" />跨轮 Machine Review 总结</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Codex 将语义比较各轮审图与 Prompt 调整，指出改善项、持续问题，并推荐当前最佳轮次；不会写入人工 Preference DNA。</p>
            </div>
            <Button type="primary" icon={<Sparkles className="size-4" />} loading={summarizing} disabled={readOnly} title={readOnly ? "只读历史不能生成新总结" : undefined} onClick={() => onSummarize(false)}>生成跨轮总结</Button>
        </div>
    );

    const summary = trajectory.summary;
    return (
        <section className="mt-5 rounded-xl bg-card p-5 shadow-card ring-1 ring-border" aria-label="跨轮 Machine Review 总结">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">MACHINE REVIEW · 覆盖至第 {summary.throughIteration} 轮</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">跨轮总结</h3>
                        <Tag color="gold" icon={<Award className="size-3" />}>推荐第 {summary.bestIteration} 轮</Tag>
                        {stale ? <Tag color="warning">有新轮次待分析</Tag> : null}
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{summary.bestReason}</p>
                </div>
                <Button icon={<RefreshCw className="size-4" />} loading={summarizing} disabled={readOnly} title={readOnly ? "只读历史不能重新分析" : undefined} onClick={() => onSummarize(true)}>{stale ? "更新到最新轮" : "重新分析"}</Button>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <SummaryGroup
                    icon={<TrendingUp className="size-4 text-emerald-500" />}
                    title="持续改善"
                    empty="暂未找到有明确跨轮证据的改善项"
                    items={summary.improved.map((item) => ({ title: item.issue, rounds: item.evidenceIterations, detail: item.explanation }))}
                />
                <SummaryGroup
                    icon={<TriangleAlert className="size-4 text-amber-500" />}
                    title="连续未解决"
                    empty="最新轮没有识别到持续问题"
                    items={summary.recurring.map((item) => ({ title: item.issue, rounds: item.evidenceIterations, detail: item.recommendation }))}
                />
            </div>
        </section>
    );
}

function SummaryGroup({ icon, title, empty, items }: { icon: ReactNode; title: string; empty: string; items: Array<{ title: string; rounds: number[]; detail: string }> }) {
    return (
        <div className="rounded-lg bg-muted/45 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">{icon}{title}</p>
            {items.length ? (
                <ul className="mt-3 space-y-3">
                    {items.map((item, index) => (
                        <li key={`${item.title}-${index}`} className="border-s-2 border-border ps-3">
                            <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{item.title}</span><Tag>第 {item.rounds.join("、")} 轮</Tag></div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                        </li>
                    ))}
                </ul>
            ) : <p className="mt-3 text-xs leading-5 text-muted-foreground">{empty}</p>}
        </div>
    );
}

function ReviewSummary({ reviews }: { reviews: FrameFlowMachineReview[] }) {
    if (!reviews.length) return <p className="mt-4 text-sm text-muted-foreground">图片返回后由 Codex 自动记录机器审图。</p>;
    const review = reviews[0]!;
    return (
        <div className="mt-4 space-y-3">
            <p className="text-sm leading-6">{review.comment}</p>
            <div className="space-y-2 text-xs leading-5 text-muted-foreground">
                <p className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /><span>保留：{review.strengths.join("；") || "暂无"}</span></p>
                <p className="flex gap-2"><TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" /><span>改进：{review.issues.join("；") || "暂无"}</span></p>
            </div>
        </div>
    );
}

function PromptDiff({ changes }: { changes: FrameFlowPromptFieldChange[] }) {
    if (!changes.length) return null;
    return (
        <div className="mt-3 space-y-3">
            {changes.map((change, index) => (
                <div key={`${change.field}-${index}`} className="space-y-1 border-s-2 border-border ps-3">
                    <p className="font-medium">{fieldLabel[change.field]}</p>
                    {change.before.length ? <p className="text-xs text-muted-foreground">之前：{change.before.join("；")}</p> : null}
                    {change.after.length ? <p className="text-xs text-muted-foreground">本轮：{change.after.join("；")}</p> : null}
                </div>
            ))}
        </div>
    );
}

function allChanges(diff: FrameFlowAutoRunTrajectory["rounds"][number]["prompt"]["diff"]) {
    return [...diff.add, ...diff.change, ...diff.remove, ...diff.avoid];
}

function changedFields(diff: FrameFlowAutoRunTrajectory["rounds"][number]["prompt"]["diff"]) {
    return [...new Set(allChanges(diff).map((change) => change.field))];
}

const fieldLabel: Record<FrameFlowPromptFieldKey, string> = {
    subject: "主体", composition: "构图", color: "色彩", lighting: "光线", material: "材质",
    layout: "布局", mood: "氛围", rendering: "呈现", technical: "技术", negative: "规避",
};

function decisionTone(decision: FrameFlowMachineReview["decision"]) {
    return decision === "keep" ? "success" : decision === "vary" ? "processing" : "error";
}

function decisionLabel(decision: FrameFlowMachineReview["decision"]) {
    return decision === "keep" ? "保留" : decision === "vary" ? "继续变体" : "拒绝";
}

function runTone(status: FrameFlowAutoRunTrajectory["rounds"][number]["run"]["status"]) {
    return status === "succeeded" ? "success" : status === "failed" || status === "cancelled" ? "error" : "processing";
}

function runLabel(status: FrameFlowAutoRunTrajectory["rounds"][number]["run"]["status"]) {
    const labels = { queued: "排队中", running: "生成中", succeeded: "已成功", partially_succeeded: "部分成功", failed: "失败", retrying: "重试中", cancelled: "已取消" } as const;
    return labels[status];
}

function errorMessage(reason: unknown) {
    return reason instanceof Error ? reason.message : "演化轨迹加载失败，请重试";
}
