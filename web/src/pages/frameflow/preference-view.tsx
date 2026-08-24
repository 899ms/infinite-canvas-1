import { Archive, ArchiveRestore, ArrowRight, BrainCircuit, MessageSquareText, Pencil, RefreshCw, ShieldAlert, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Empty, Form, Image, Input, Modal, Popconfirm, Segmented, Select, Spin, Tag } from "antd";

import { cn } from "@/lib/utils";
import {
    archiveFrameFlowBrief,
    frameFlowImageUrl,
    getFrameFlowAutoRun,
    getFrameFlowCurrentBrief,
    getFrameFlowPreferenceDna,
    listFrameFlowAutoRuns,
    listFrameFlowBriefs,
    listFrameFlowReviewQueue,
    listFrameFlowRuns,
    reviseFrameFlowBrief,
    restoreFrameFlowBrief,
    type FrameFlowAutoRun,
    type FrameFlowBrief,
    type FrameFlowBriefInput,
    type FrameFlowPreferenceDna,
    type FrameFlowPreferenceSignal,
    type FrameFlowReviewItem,
    type FrameFlowRun,
} from "@/services/api/frameflow";
import { useAgentStore } from "@/stores/use-agent-store";
import { canWriteRequirement, createLatestRequestGate, mergeRequestedAutoRun, requirementHasActiveWork, type FrameFlowRequirementScope } from "./requirement-view-state";

type BriefRevisionForm = Omit<FrameFlowBriefInput, "constraints" | "referenceImageIds"> & { keep: string[]; avoid: string[] };
export function FrameFlowPreferenceView() {
    const { message } = App.useApp();
    const [editForm] = Form.useForm<BriefRevisionForm>();
    const endpoint = useAgentStore((state) => state.url)
        .trim()
        .replace(/\/$/, "");
    const token = useAgentStore((state) => state.token).trim();
    const [dna, setDna] = useState<FrameFlowPreferenceDna | null>(null);
    const [briefs, setBriefs] = useState<FrameFlowBrief[]>([]);
    const [allBriefs, setAllBriefs] = useState<FrameFlowBrief[]>([]);
    const [autoRuns, setAutoRuns] = useState<FrameFlowAutoRun[]>([]);
    const [runs, setRuns] = useState<FrameFlowRun[]>([]);
    const [selectedBriefId, setSelectedBriefId] = useState("");
    const [reviewItems, setReviewItems] = useState<FrameFlowReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [editing, setEditing] = useState<FrameFlowBrief | null>(null);
    const [error, setError] = useState("");
    const [scope, setScope] = useState<FrameFlowRequirementScope>(() => new URLSearchParams(window.location.search).get("scope") === "archived" ? "archived" : "active");
    const requestGate = useMemo(() => createLatestRequestGate(), []);
    const scopeRef = useRef(scope);
    const selectedBriefIdRef = useRef(selectedBriefId);

    const changeScope = useCallback((nextScope: FrameFlowRequirementScope, briefId = "") => {
        requestGate.invalidate();
        scopeRef.current = nextScope;
        selectedBriefIdRef.current = briefId;
        setScope(nextScope);
        setBriefs([]);
        setEditing(null);
        setSelectedBriefId(briefId);
        setDna(null);
        const url = new URL(window.location.href);
        url.searchParams.set("view", "preference");
        if (nextScope === "archived") url.searchParams.set("scope", "archived");
        else url.searchParams.delete("scope");
        if (briefId) url.searchParams.set("briefId", briefId);
        else url.searchParams.delete("briefId");
        url.searchParams.delete("autoRunId");
        window.history.replaceState({}, "", url);
    }, [requestGate]);

    const load = useCallback(async () => {
        if (!endpoint || !token) return;
        const request = requestGate.begin();
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams(window.location.search);
            const requestedAutoRunId = params.get("autoRunId") || "";
            const [nextBriefs, listedAutoRuns, nextReviews, nextRuns, requestedAutoRun] = await Promise.all([
                listFrameFlowBriefs(endpoint, token, 200, true),
                listFrameFlowAutoRuns(endpoint, token, 200, true),
                listFrameFlowReviewQueue(endpoint, token, 200, true),
                listFrameFlowRuns(endpoint, token, 200, true),
                requestedAutoRunId ? getFrameFlowAutoRun(endpoint, token, requestedAutoRunId).catch(() => undefined) : undefined,
            ]);
            if (!requestGate.isLatest(request)) return;
            const nextAutoRuns = mergeRequestedAutoRun(listedAutoRuns, requestedAutoRun);
            const requestedBriefId = params.get("briefId") || requestedAutoRun?.briefId || selectedBriefId;
            const exactCurrentBrief = requestedBriefId ? await getFrameFlowCurrentBrief(endpoint, token, requestedBriefId).catch(() => undefined) : undefined;
            if (!requestGate.isLatest(request)) return;
            const allNextBriefs = exactCurrentBrief && !nextBriefs.some((brief) => brief.id === exactCurrentBrief.id) ? [exactCurrentBrief, ...nextBriefs] : nextBriefs;
            const currentBriefs = allNextBriefs.filter((brief) => !brief.supersededAt && !brief.supersededByBriefId);
            const requestedRequirementId = exactCurrentBrief?.requirementId || exactCurrentBrief?.id;
            const requestedCurrentBrief = exactCurrentBrief || currentBriefs.find((brief) => (brief.requirementId || brief.id) === requestedRequirementId);
            const resolvedScope = requestedCurrentBrief?.archivedAt ? "archived" : requestedCurrentBrief ? "active" : scope;
            const visibleBriefs = currentBriefs.filter((brief) => Boolean(brief.archivedAt) === (resolvedScope === "archived"));
            const visibleBriefIds = new Set(visibleBriefs.map((brief) => brief.id));
            const targetBriefId = requestedCurrentBrief && visibleBriefIds.has(requestedCurrentBrief.id)
                ? requestedCurrentBrief.id
                : nextAutoRuns.find((item) => item.requirementArchived === (resolvedScope === "archived") && visibleBriefIds.has(item.briefId))?.briefId || visibleBriefs[0]?.id || "";
            const nextDna = targetBriefId ? await getFrameFlowPreferenceDna(endpoint, token, targetBriefId) : null;
            if (!requestGate.isLatest(request)) return;
            if (resolvedScope !== scope) {
                scopeRef.current = resolvedScope;
                setScope(resolvedScope);
            }
            setBriefs(visibleBriefs);
            setAllBriefs(allNextBriefs);
            setAutoRuns(nextAutoRuns);
            setRuns(nextRuns);
            selectedBriefIdRef.current = targetBriefId;
            setSelectedBriefId(targetBriefId);
            setDna(nextDna);
            setReviewItems(nextReviews);
        } catch (reason) {
            if (requestGate.isLatest(request)) setError(errorMessage(reason));
        } finally {
            if (requestGate.isLatest(request)) setLoading(false);
        }
    }, [endpoint, requestGate, scope, selectedBriefId, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const selectedBrief = briefs.find((brief) => brief.id === selectedBriefId);
    const selectedReadOnly = !canWriteRequirement(scope, Boolean(selectedBrief?.archivedAt));
    const archivedBriefCount = useMemo(() => allBriefs.filter((brief) => brief.archivedAt && !brief.supersededAt && !brief.supersededByBriefId).length, [allBriefs]);
    const requirementByBrief = useMemo(() => new Map(allBriefs.map((brief) => [brief.id, brief.requirementId || brief.id])), [allBriefs]);
    const selectedRequirementId = selectedBrief?.requirementId || selectedBrief?.id;
    const scopedReviews = useMemo(() => reviewItems.filter((item) => requirementByBrief.get(item.briefId) === selectedRequirementId), [requirementByBrief, reviewItems, selectedRequirementId]);
    const reviewsByImage = useMemo(() => new Map(scopedReviews.map((item) => [item.image.id, item])), [scopedReviews]);
    const comments = useMemo(() => scopedReviews.filter((item) => item.feedback.comment?.trim()), [scopedReviews]);
    const autoRunByBrief = useMemo(() => {
        const result = new Map<string, FrameFlowAutoRun>();
        for (const item of autoRuns) if (!result.has(item.briefId)) result.set(item.briefId, item);
        return result;
    }, [autoRuns]);
    const selectedAutoRuns = useMemo(() => autoRuns.filter((item) => item.briefId === selectedBrief?.id), [autoRuns, selectedBrief?.id]);
    const requestedAutoRunId = new URLSearchParams(window.location.search).get("autoRunId");
    const selectedAutoRun = selectedAutoRuns.find((item) => item.id === requestedAutoRunId) || selectedAutoRuns[0];
    const selectedIsRunning = requirementHasActiveWork(selectedRequirementId, allBriefs, autoRuns, runs);

    const selectBrief = (briefId: string) => {
        requestGate.invalidate();
        selectedBriefIdRef.current = briefId;
        setSelectedBriefId(briefId);
        const url = new URL(window.location.href);
        const autoRun = autoRunByBrief.get(briefId);
        url.searchParams.set("view", "preference");
        if (scope === "archived") url.searchParams.set("scope", "archived");
        else url.searchParams.delete("scope");
        url.searchParams.set("briefId", briefId);
        if (autoRun) url.searchParams.set("autoRunId", autoRun.id);
        else url.searchParams.delete("autoRunId");
        window.history.replaceState({}, "", url);
    };

    const openEdit = () => {
        if (!selectedBrief || !canWriteRequirement(scope, Boolean(selectedBrief.archivedAt))) return;
        setEditing(selectedBrief);
    };

    useEffect(() => {
        if (!editing) return;
        editForm.setFieldsValue({
            subject: editing.subject,
            purpose: editing.purpose,
            platform: editing.platform,
            style: editing.style,
            scene: editing.scene,
            aspectRatio: editing.aspectRatio,
            strategy: editing.strategy,
            keep: editing.constraints.keep,
            avoid: editing.constraints.avoid,
        });
    }, [editForm, editing]);

    const saveRevision = async () => {
        if (!editing || !canWriteRequirement(scope, Boolean(editing.archivedAt))) return;
        const actionScope = scope;
        const actionBriefId = editing.id;
        const values = await editForm.validateFields();
        setSaving(true);
        try {
            const revised = await reviseFrameFlowBrief(endpoint, token, editing.id, {
                subject: values.subject.trim(),
                ...(values.purpose?.trim() ? { purpose: values.purpose.trim() } : {}),
                ...(values.platform?.trim() ? { platform: values.platform.trim() } : {}),
                ...(values.style?.trim() ? { style: values.style.trim() } : {}),
                ...(values.scene?.trim() ? { scene: values.scene.trim() } : {}),
                aspectRatio: values.aspectRatio,
                constraints: { keep: values.keep || [], avoid: values.avoid || [] },
                referenceImageIds: editing.referenceImageIds,
                strategy: values.strategy,
            }, selectedAutoRun?.id);
            if (scopeRef.current !== actionScope || selectedBriefIdRef.current !== actionBriefId) return;
            const replacementAutoRun = selectedAutoRun
                ? (await listFrameFlowAutoRuns(endpoint, token)).find((item) => item.briefId === revised.id)
                : undefined;
            const url = new URL(window.location.href);
            url.searchParams.set("view", "preference");
            url.searchParams.set("briefId", revised.id);
            if (replacementAutoRun) url.searchParams.set("autoRunId", replacementAutoRun.id);
            else url.searchParams.delete("autoRunId");
            window.history.replaceState({}, "", url);
            setSelectedBriefId(revised.id);
            setEditing(null);
            message.success(replacementAutoRun
                ? "需求已保存为新修订；新的自动跑已处于停止状态，确认后可启动"
                : "需求已保存为新修订，原有运行和偏好证据均已保留");
            await load();
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setSaving(false);
        }
    };

    const archiveSelected = async () => {
        if (!selectedBrief || !canWriteRequirement(scope, Boolean(selectedBrief.archivedAt)) || selectedIsRunning) return;
        const actionScope = scope;
        const actionBriefId = selectedBrief.id;
        setArchiving(true);
        try {
            await archiveFrameFlowBrief(endpoint, token, selectedBrief.id);
            if (scopeRef.current !== actionScope || selectedBriefIdRef.current !== actionBriefId) return;
            message.success("需求已归档，历史记录、图片和运行血缘均已保留");
            changeScope("active");
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setArchiving(false);
        }
    };

    const restoreSelected = async () => {
        if (scope !== "archived" || !selectedBrief?.archivedAt) return;
        const actionBriefId = selectedBrief.id;
        setRestoring(true);
        try {
            await restoreFrameFlowBrief(endpoint, token, selectedBrief.id);
            if (scopeRef.current !== "archived" || selectedBriefIdRef.current !== actionBriefId) return;
            message.success("需求已恢复到活动列表");
            changeScope("active", selectedBrief.id);
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setRestoring(false);
        }
    };

    if (loading && !dna) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Spin />
            </div>
        );
    }

    return (
        <Image.PreviewGroup>
            <div>
                {error ? <Alert className="mb-4" showIcon type="error" title="需求内偏好读取失败" description={error} action={<Button onClick={() => void load()}>重试</Button>} /> : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">{scope === "archived" ? "已归档需求的人工偏好" : "当前需求的人工偏好"}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{scope === "archived" ? "归档历史保持可追溯但不可修改；恢复需求后可继续使用当前修订。" : "只影响当前创作需求及其后续修订，不会进入其他需求。"}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Segmented
                            aria-label="需求内偏好范围"
                            value={scope}
                            onChange={(value) => changeScope(value as FrameFlowRequirementScope)}
                            options={[{ label: "活动需求", value: "active" }, { label: "查看已归档", value: "archived" }]}
                        />
                        <Button className="active:!scale-[.96] !transition-transform" icon={<RefreshCw className="size-4" strokeWidth={2} />} loading={loading} onClick={() => void load()}>
                            刷新证据
                        </Button>
                    </div>
                </div>

                {briefs.length ? (
                    <section className="mt-5 rounded-xl bg-card p-4 shadow-card ring-1 ring-border sm:p-5" aria-label="选择偏好所属需求">
                        <label className="text-sm font-semibold" htmlFor="frameflow-preference-brief">查看哪个需求</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Select
                                id="frameflow-preference-brief"
                                className="min-w-60 flex-1"
                                value={selectedBriefId}
                                onChange={selectBrief}
                                options={briefs.map((brief) => {
                                    const autoRunName = autoRunByBrief.get(brief.id)?.name;
                                    return { value: brief.id, label: autoRunName ? `${autoRunName} · ${brief.subject}` : brief.subject };
                                })}
                            />
                            {selectedReadOnly ? <Tag icon={<Archive className="size-3" />}>需求已归档 · 只读</Tag> : null}
                            <Button icon={<Pencil className="size-4" />} disabled={!selectedBrief || selectedReadOnly || selectedIsRunning} onClick={openEdit}>修改</Button>
                            {selectedReadOnly ? (
                                <Button type="primary" icon={<ArchiveRestore className="size-4" />} disabled={!selectedBrief} loading={restoring} onClick={() => void restoreSelected()}>恢复需求</Button>
                            ) : (
                                <Popconfirm
                                    title="确认归档这个需求？"
                                    description="它会从活动列表移除；图片、Prompt、评分、Comment、运行和历史血缘全部保留，可随时恢复。"
                                    okText="归档需求"
                                    cancelText="取消"
                                    onConfirm={() => void archiveSelected()}
                                >
                                    <Button icon={<Archive className="size-4" />} disabled={!selectedBrief || selectedIsRunning} loading={archiving}>归档需求</Button>
                                </Popconfirm>
                            )}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            当前范围：{selectedBrief?.subject || "未选择"}。{selectedReadOnly ? "归档历史只能查看；恢复后可继续修改当前修订。" : "修改会创建同一需求的新修订并保留偏好；归档不会删除任何资产。"}
                            {selectedIsRunning ? " 请先停止正在运行的自动跑，再修改或归档。" : ""}
                        </p>
                    </section>
                ) : (
                    <Empty
                        className="my-16"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={scope === "active" && archivedBriefCount ? `活动需求已清空，已有 ${archivedBriefCount} 个需求归档保存` : scope === "archived" ? "还没有已归档需求" : "还没有活动需求"}
                    >
                        {scope === "active" && archivedBriefCount ? <Button icon={<Archive className="size-4" />} onClick={() => changeScope("archived")}>查看已归档</Button> : null}
                    </Empty>
                )}

                {selectedReadOnly ? <Alert className="mt-5" showIcon type="info" title="只读归档历史" description="现有评分、Comment、图片与 Preference DNA 均保留；这里不会接受修改、重新分析、反馈或删除操作。" /> : null}

                {selectedBrief ? (
                    <>
                <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="当前需求偏好概览">
                    <DnaMetric label="净偏好权重" value={signed(dna?.totalWeight || 0)} tone={(dna?.totalWeight || 0) > 0 ? "success" : (dna?.totalWeight || 0) < 0 ? "danger" : "default"} />
                    <DnaMetric label="有效样本" value={String(dna?.sampleSize || 0)} />
                    <DnaMetric label="强化证据" value={String(dna?.boost.length || 0)} tone="success" />
                    <DnaMetric label="规避证据" value={String(dna?.avoid.length || 0)} tone="danger" />
                    <DnaMetric label="质量拒绝" value={String(dna?.qualityRejections || 0)} tone="warning" className="col-span-2 lg:col-span-1" />
                </section>

                <section className="mt-5 rounded-xl bg-card p-4 shadow-card ring-1 ring-border sm:p-5" aria-label="反馈进入下一轮 Prompt 的路径">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="size-5" strokeWidth={2} />
                        <h2 className="text-base font-semibold">反馈如何进入下一轮</h2>
                    </div>
                    <div className="mt-4 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
                        <FlowStep icon={<MessageSquareText className="size-5" strokeWidth={2} />} label="人工反馈" detail={`${dna?.sampleSize || 0} 条有效反馈 · ${comments.length} 条 Comment`} />
                        <ArrowRight className="mx-auto hidden size-5 self-center text-muted-foreground md:block" strokeWidth={1.5} />
                        <FlowStep icon={<BrainCircuit className="size-5" strokeWidth={2} />} label="需求内偏好证据" detail={`${dna?.boost.length || 0} 条强化 · ${dna?.avoid.length || 0} 条规避`} />
                        <ArrowRight className="mx-auto hidden size-5 self-center text-muted-foreground md:block" strokeWidth={1.5} />
                        <FlowStep icon={<Sparkles className="size-5" strokeWidth={2} />} label="下一轮 Codex Prompt" detail="携带权重、Comment 与原 Prompt 字段作为证据" />
                    </div>
                    <Alert className="mt-4" showIcon type="info" title="严格按需求隔离" description="这些证据可进入同一需求的新修订，但不能覆盖主体、用途、画幅等硬约束，也不会被其他需求使用。" />
                </section>

                <section className="mt-5 grid gap-5 lg:grid-cols-2">
                    <EvidenceColumn
                        title="强化方向"
                        description="5 星与 4 星会让 Codex 优先延续相近的构图、色彩、光线和材质。"
                        icon={<TrendingUp className="size-5" strokeWidth={2} />}
                        tone="success"
                        signals={dna?.boost || []}
                        reviewsByImage={reviewsByImage}
                        endpoint={endpoint}
                        token={token}
                    />
                    <EvidenceColumn
                        title="规避方向"
                        description="1–2 星会降权；审美型 soft delete 以 -4 覆盖为强规避证据。"
                        icon={<TrendingDown className="size-5" strokeWidth={2} />}
                        tone="danger"
                        signals={dna?.avoid || []}
                        reviewsByImage={reviewsByImage}
                        endpoint={endpoint}
                        token={token}
                    />
                </section>

                <section className="mt-5 rounded-xl bg-card p-4 shadow-card ring-1 ring-border sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <MessageSquareText className="size-5" strokeWidth={2} />
                            <h2 className="text-base font-semibold">Comment 证据</h2>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{comments.length} 条</span>
                    </div>
                    {!comments.length ? <Empty className="my-12" image={Empty.PRESENTED_IMAGE_SIMPLE} description="待审页写下 Comment 后会在这里成为可追溯证据" /> : null}
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {comments.map((item) => (
                            <div key={item.image.id} className="flex gap-3 rounded-lg bg-background p-3 shadow-card ring-1 ring-border">
                                <Image
                                    src={frameFlowImageUrl(endpoint, token, item.image.id)}
                                    alt={`Comment 证据 ${shortId(item.image.id)}`}
                                    rootClassName="!size-16 !shrink-0 cursor-zoom-in"
                                    className="!size-16 rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                                />
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Tag className="!m-0">{item.feedback.rating ? `${item.feedback.rating} 星` : "未评分"}</Tag>
                                        {item.feedback.hiddenReason ? (
                                            <Tag color="error" className="!m-0">
                                                强负反馈
                                            </Tag>
                                        ) : null}
                                    </div>
                                    <p className="mt-2 text-sm leading-6">{item.feedback.comment}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                    </>
                ) : null}

                <Modal title="修改需求" open={Boolean(editing)} okText="保存新修订" cancelText="取消" confirmLoading={saving} onOk={() => void saveRevision()} onCancel={() => setEditing(null)} destroyOnHidden>
                    <Form form={editForm} layout="vertical" className="mt-5">
                        <Form.Item label="探索方向 / 主体" name="subject" rules={[{ required: true, whitespace: true, message: "请输入探索方向或主体" }]}>
                            <Input.TextArea rows={3} maxLength={500} showCount />
                        </Form.Item>
                        <Form.Item label="用途（选填）" name="purpose"><Input maxLength={500} /></Form.Item>
                        <div className="grid grid-cols-2 gap-3">
                            <Form.Item label="风格" name="style"><Input maxLength={500} /></Form.Item>
                            <Form.Item label="场景" name="scene"><Input maxLength={500} /></Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Form.Item label="平台" name="platform"><Input maxLength={500} /></Form.Item>
                            <Form.Item label="画幅" name="aspectRatio" rules={[{ required: true }]}>
                                <Select options={["1:1", "4:5", "3:4", "16:9", "9:16"].map((value) => ({ value, label: value }))} />
                            </Form.Item>
                        </div>
                        <Form.Item label="探索方式" name="strategy" rules={[{ required: true }]}>
                            <Select options={[{ value: "stable", label: "稳定延展" }, { value: "balanced", label: "平衡探索" }, { value: "explore", label: "大胆探索" }]} />
                        </Form.Item>
                        <Form.Item label="必须保留" name="keep"><Select mode="tags" tokenSeparators={[",", "，"]} /></Form.Item>
                        <Form.Item label="必须避免" name="avoid"><Select mode="tags" tokenSeparators={[",", "，"]} /></Form.Item>
                        <Alert showIcon type="info" title="不会改写旧记录" description={selectedAutoRun
                            ? "保存后会创建同一需求的新 Brief 修订，并复制当前自动跑的数量与轮数为停止状态；旧 Prompt、图片、运行和人工偏好仍可追溯。"
                            : "保存后会创建同一需求的新 Brief 修订；旧 Prompt、图片、运行和人工偏好仍可追溯。"} />
                    </Form>
                </Modal>
            </div>
        </Image.PreviewGroup>
    );
}

function EvidenceColumn({
    title,
    description,
    icon,
    tone,
    signals,
    reviewsByImage,
    endpoint,
    token,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    tone: "success" | "danger";
    signals: FrameFlowPreferenceSignal[];
    reviewsByImage: Map<string, FrameFlowReviewItem>;
    endpoint: string;
    token: string;
}) {
    return (
        <div className="rounded-xl bg-card p-4 shadow-card ring-1 ring-border sm:p-5">
            <div className={cn("flex items-center gap-2", tone === "success" ? "text-feedback-reinforce" : "text-feedback-delete")}>
                {icon}
                <h2 className="text-base font-semibold">{title}</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            {!signals.length ? <Empty className="my-12" image={Empty.PRESENTED_IMAGE_SIMPLE} description={`还没有${title}证据`} /> : null}
            <div className="mt-4 space-y-3">
                {signals.map((signal) => {
                    const review = reviewsByImage.get(signal.imageId);
                    return (
                        <article key={signal.imageId} className="flex gap-3 rounded-lg bg-background p-3 shadow-card ring-1 ring-border">
                            {review ? (
                                <Image
                                    src={frameFlowImageUrl(endpoint, token, signal.imageId)}
                                    alt={`${title}图片 ${shortId(signal.imageId)}`}
                                    rootClassName="!size-20 !shrink-0 cursor-zoom-in"
                                    className="!size-20 rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                                />
                            ) : (
                                <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <ShieldAlert className="size-5" strokeWidth={1.5} />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs text-muted-foreground">图片 {shortId(signal.imageId)}</span>
                                    <span className={cn("text-sm font-semibold tabular-nums", signal.weight > 0 ? "text-feedback-reinforce" : "text-feedback-delete")}>{signed(signal.weight)}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {review?.feedback.rating ? <Tag className="!m-0">{review.feedback.rating} 星</Tag> : null}
                                    <Tag className="!m-0">{signal.sourceEventIds.length} 条事实事件</Tag>
                                </div>
                                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{review?.feedback.comment || "未写 Comment，将使用该图片对应的结构化 Prompt 字段作为证据。"}</p>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

function FlowStep({ icon, label, detail }: { icon: React.ReactNode; label: string; detail: string }) {
    return (
        <div className="rounded-lg bg-background p-4 shadow-card ring-1 ring-border">
            <div className="flex items-center gap-2 text-sm font-semibold">
                {icon}
                {label}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
    );
}

function DnaMetric({ label, value, tone = "default", className }: { label: string; value: string; tone?: "default" | "success" | "warning" | "danger"; className?: string }) {
    return (
        <div className={cn("rounded-lg bg-card px-4 py-3 shadow-card ring-1 ring-border", className)}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "success" && "text-feedback-reinforce", tone === "warning" && "text-feedback-variant", tone === "danger" && "text-feedback-delete")}>{value}</div>
        </div>
    );
}

function signed(value: number) {
    return value > 0 ? `+${value}` : String(value);
}
function shortId(value: string) {
    return value.slice(0, 8);
}
function errorMessage(reason: unknown) {
    return reason instanceof Error ? reason.message : "未知错误，请稍后重试";
}
