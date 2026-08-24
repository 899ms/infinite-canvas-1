import { Archive, CircleStop, Pencil, Play, RefreshCw, Repeat2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Empty, Form, Input, InputNumber, Modal, Segmented, Select, Spin, Tag } from "antd";

import {
    createFrameFlowAutoRun,
    createFrameFlowBrief,
    extendFrameFlowAutoRun,
    getFrameFlowAutoRun,
    listFrameFlowAutoRuns,
    listFrameFlowBriefs,
    startFrameFlowAutoRun,
    stopFrameFlowAutoRun,
    updateFrameFlowAutoRun,
    type FrameFlowAutoRun,
    type FrameFlowAutoRunState,
    type FrameFlowBrief,
    type FrameFlowStrategy,
} from "@/services/api/frameflow";
import { canWriteRequirement, createLatestRequestGate, mergeRequestedAutoRun, type FrameFlowRequirementScope } from "./requirement-view-state";

type AutoRunCreateForm = { name?: string; direction: string; aspectRatio: string; strategy: FrameFlowStrategy; count: number; maxIterations: number };
type AutoRunEditForm = { name: string; count: number; maxIterations: number };
export function FrameFlowAutoRunView({ endpoint, token, onRunStarted, onReview, onTrajectory }: { endpoint: string; token: string; onRunStarted: (runId: string) => void; onReview: (autoRunId: string) => void; onTrajectory: (autoRunId: string) => void }) {
    const { message } = App.useApp();
    const [form] = Form.useForm<AutoRunCreateForm>();
    const [editForm] = Form.useForm<AutoRunEditForm>();
    const [briefs, setBriefs] = useState<FrameFlowBrief[]>([]);
    const [autoRuns, setAutoRuns] = useState<FrameFlowAutoRun[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState("");
    const [editing, setEditing] = useState<FrameFlowAutoRun | null>(null);
    const [error, setError] = useState("");
    const [scope, setScope] = useState<FrameFlowRequirementScope>(() => new URLSearchParams(window.location.search).get("scope") === "archived" ? "archived" : "active");
    const requestGate = useMemo(() => createLatestRequestGate(), []);
    const scopeRef = useRef(scope);

    const changeScope = useCallback((nextScope: FrameFlowRequirementScope) => {
        requestGate.invalidate();
        scopeRef.current = nextScope;
        setScope(nextScope);
        setAutoRuns([]);
        setEditing(null);
        const url = new URL(window.location.href);
        if (nextScope === "archived") url.searchParams.set("scope", "archived");
        else url.searchParams.delete("scope");
        url.searchParams.delete("autoRunId");
        window.history.replaceState({}, "", url);
    }, [requestGate]);

    const load = useCallback(async () => {
        if (!endpoint || !token) return;
        const request = requestGate.begin();
        setLoading(true);
        setError("");
        try {
            const requestedAutoRunId = new URLSearchParams(window.location.search).get("autoRunId");
            const [nextBriefs, listedAutoRuns, requestedAutoRun] = await Promise.all([
                listFrameFlowBriefs(endpoint, token, 200, true),
                listFrameFlowAutoRuns(endpoint, token, 200, scope === "archived" || Boolean(requestedAutoRunId)),
                requestedAutoRunId ? getFrameFlowAutoRun(endpoint, token, requestedAutoRunId).catch(() => undefined) : undefined,
            ]);
            if (!requestGate.isLatest(request)) return;
            const allAutoRuns = mergeRequestedAutoRun(listedAutoRuns, requestedAutoRun);
            const requested = allAutoRuns.find((item) => item.id === requestedAutoRunId);
            const resolvedScope = requested?.requirementArchived ? "archived" : requested ? "active" : scope;
            if (resolvedScope !== scope) {
                scopeRef.current = resolvedScope;
                setScope(resolvedScope);
            }
            setBriefs(nextBriefs);
            setAutoRuns(allAutoRuns.filter((item) => item.requirementArchived === (resolvedScope === "archived")));
        } catch (reason) {
            if (requestGate.isLatest(request)) setError(errorMessage(reason));
        } finally {
            if (requestGate.isLatest(request)) setLoading(false);
        }
    }, [endpoint, requestGate, scope, token]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        if (!autoRuns.some((item) => item.state === "generating" || item.state === "reviewing")) return;
        const timer = window.setInterval(() => void load(), 2_000);
        return () => window.clearInterval(timer);
    }, [autoRuns, load]);

    const briefById = useMemo(() => new Map(briefs.map((brief) => [brief.id, brief])), [briefs]);
    const create = async (values: AutoRunCreateForm) => {
        setSaving(true);
        try {
            const direction = values.direction.trim();
            const brief = await createFrameFlowBrief(endpoint, token, {
                subject: direction,
                aspectRatio: values.aspectRatio,
                constraints: { keep: [], avoid: [] },
                referenceImageIds: [],
                strategy: values.strategy,
            }, crypto.randomUUID());
            const autoRunId = await createFrameFlowAutoRun(endpoint, token, {
                name: values.name?.trim() || direction.slice(0, 36),
                briefId: brief.id,
                count: values.count,
                maxIterations: values.maxIterations,
            });
            const receipt = await startFrameFlowAutoRun(endpoint, token, autoRunId);
            form.resetFields();
            const returningToActive = scope === "archived";
            if (returningToActive) changeScope("active");
            message.success("自动跑已启动，正在生成首轮图片");
            if (!returningToActive) await load();
            if (receipt.resource?.type === "run") onRunStarted(receipt.resource.id);
        } catch (reason) {
            message.error(errorMessage(reason));
            await load();
        } finally {
            setSaving(false);
        }
    };

    const saveEdit = async () => {
        if (!editing || !canWriteRequirement(scope, editing.requirementArchived) || editing.briefSuperseded) return;
        const values = await editForm.validateFields();
        const actionScope = scope;
        setSaving(true);
        try {
            await updateFrameFlowAutoRun(endpoint, token, editing.id, { name: values.name, count: values.count, maxIterations: values.maxIterations });
            if (scopeRef.current !== actionScope) return;
            setEditing(null);
            message.success("自动跑设置已更新");
            await load();
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setSaving(false);
        }
    };

    const stop = async (autoRun: FrameFlowAutoRun) => {
        if (!canWriteRequirement(scope, autoRun.requirementArchived) || autoRun.briefSuperseded) return;
        const actionScope = scope;
        setBusyId(autoRun.id);
        try {
            await stopFrameFlowAutoRun(endpoint, token, autoRun.id);
            if (scopeRef.current !== actionScope) return;
            message.success("自动跑已停止；当前已生成记录和审核结果均已保留");
            await load();
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setBusyId("");
        }
    };

    const start = async (autoRun: FrameFlowAutoRun) => {
        if (!canWriteRequirement(scope, autoRun.requirementArchived) || autoRun.briefSuperseded) return;
        const actionScope = scope;
        setBusyId(autoRun.id);
        try {
            const receipt = await startFrameFlowAutoRun(endpoint, token, autoRun.id);
            if (scopeRef.current !== actionScope) return;
            message.success(receipt.resource?.type === "run" ? "自动跑已恢复，正在生成下一轮" : "自动跑已恢复，Codex 正在继续审图");
            await load();
            if (receipt.resource?.type === "run") onRunStarted(receipt.resource.id);
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setBusyId("");
        }
    };

    const continueExploration = async (autoRun: FrameFlowAutoRun) => {
        if (!canWriteRequirement(scope, autoRun.requirementArchived) || autoRun.briefSuperseded) return;
        const actionScope = scope;
        setBusyId(autoRun.id);
        try {
            await extendFrameFlowAutoRun(endpoint, token, autoRun.id, 1);
            if (scopeRef.current !== actionScope) return;
            message.success("已在原任务上追加 1 轮，Codex 正在根据机器审图继续探索");
            await load();
        } catch (reason) {
            message.error(errorMessage(reason));
            await load();
        } finally {
            setBusyId("");
        }
    };

    if (!endpoint || !token) return <Alert type="warning" showIcon title="请先连接 Canvas Agent" description="自动跑、审核证据和每轮血缘都由本地 Agent 持久化。" />;

    return (
        <section className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-xl bg-card p-5 shadow-card ring-1 ring-border">
                <div className="flex items-start gap-3">
                    <Repeat2 className="mt-0.5 size-5 text-primary" strokeWidth={1.8} />
                    <div>
                        <h2 className="font-semibold">启动自动跑</h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">给出方向后，Codex 自动规划、生图、逐张评分与写评语，再依据机器审图自动迭代。</p>
                    </div>
                </div>
                <Form form={form} layout="vertical" className="mt-5" initialValues={{ aspectRatio: "1:1", strategy: "balanced", count: 4, maxIterations: 5 }} onFinish={(values) => void create(values)}>
                    <Form.Item className="[&_.ant-input-data-count]:!bottom-2 [&_.ant-input-data-count]:!end-3 [&_.ant-input-data-count]:!top-auto [&_textarea.ant-input]:!pb-8" label="探索方向" name="direction" rules={[{ required: true, whitespace: true, message: "写下希望 Codex 探索的方向" }]} extra="这是探索起点，不是固定风格。Codex 会根据每轮机器审图持续演化。">
                        <Input.TextArea rows={4} placeholder="例如：雨夜便利店的电影感摄影，冷色霓虹、潮湿街道、克制构图，探索孤独但温暖的情绪" maxLength={500} showCount />
                    </Form.Item>
                    <Form.Item label="任务名称（选填）" name="name">
                        <Input placeholder="留空时使用探索方向作为名称" maxLength={500} />
                    </Form.Item>
                    <Form.Item label="画幅" name="aspectRatio" rules={[{ required: true }]}>
                        <Select options={["1:1", "4:5", "3:4", "16:9", "9:16"].map((value) => ({ value, label: value }))} />
                    </Form.Item>
                    <Form.Item label="探索方式" name="strategy" rules={[{ required: true }]}>
                        <Select options={[
                            { value: "stable", label: "稳定延展" },
                            { value: "balanced", label: "平衡探索" },
                            { value: "explore", label: "大胆探索" },
                        ]} />
                    </Form.Item>
                    <Form.Item label="每轮数量" name="count" rules={[{ required: true }]}>
                        <InputNumber min={1} max={8} precision={0} className="!w-full" />
                    </Form.Item>
                    <Form.Item label="最大轮数" name="maxIterations" rules={[{ required: true }]} extra="到达上限后自动完成，避免无限生图消耗。">
                        <InputNumber min={1} max={20} precision={0} className="!w-full" />
                    </Form.Item>
                    <Button htmlType="submit" type="primary" block loading={saving}>启动自动跑</Button>
                </Form>
                <p className="mt-3 text-center text-xs text-muted-foreground">不设时间 · 人工反馈可选 · 可随时停止</p>
                <p className="mt-1 text-center text-[11px] leading-4 text-muted-foreground">启动后，运行记录会显示“停止自动跑”；停止只阻止后续轮次，已完成结果与审图记录都会保留。</p>
            </div>

            <div className="min-h-[420px] rounded-xl bg-card p-5 shadow-card ring-1 ring-border sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold">{scope === "archived" ? "已归档自动跑" : "自动跑记录"}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{scope === "archived" ? "归档需求的运行与血缘完整保留，仅供查看。" : "Codex 的机器审图与人的偏好反馈分开记录，随时可停止并保留现场。"}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Segmented
                            aria-label="自动跑需求范围"
                            size="small"
                            value={scope}
                            onChange={(value) => changeScope(value as FrameFlowRequirementScope)}
                            options={[{ label: "活动需求", value: "active" }, { label: "查看已归档", value: "archived" }]}
                        />
                        <Button type="text" icon={<RefreshCw className="size-4" />} loading={loading} onClick={() => void load()}>刷新</Button>
                    </div>
                </div>
                {error ? <Alert className="mt-4" type="error" showIcon title="加载失败" description={error} /> : null}
                {loading && !autoRuns.length ? <div className="grid min-h-72 place-items-center"><Spin /></div> : null}
                {!loading && !autoRuns.length ? <Empty className="my-20" image={Empty.PRESENTED_IMAGE_SIMPLE} description={scope === "archived" ? "还没有已归档需求的自动跑记录" : "还没有自动跑。写下一个探索方向即可启动首轮。"} /> : null}
                <div className="mt-5 grid gap-3">
                    {autoRuns.map((autoRun) => {
                        const brief = briefById.get(autoRun.briefId);
                        const active = autoRun.state === "generating" || autoRun.state === "reviewing";
                        const inactiveBrief = !canWriteRequirement(scope, autoRun.requirementArchived) || autoRun.briefSuperseded;
                        return (
                            <article key={autoRun.id} className="rounded-xl bg-background p-4 ring-1 ring-border">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-medium">{autoRun.name}</h3>
                                            <AutoRunStatus state={autoRun.state} iteration={autoRun.iteration} maxIterations={autoRun.maxIterations} hasRun={Boolean(autoRun.currentRunId)} />
                                            {autoRun.requirementArchived ? <Tag icon={<Archive className="size-3" />}>需求已归档 · 只读</Tag> : autoRun.briefSuperseded ? <Tag>旧需求修订 · 只读</Tag> : null}
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">每轮 {autoRun.count} 张 · {autoRun.iteration}/{autoRun.maxIterations} 轮 · {brief?.aspectRatio || "—"}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{brief ? `${brief.subject} · ${[brief.style, brief.scene].filter(Boolean).join(" / ") || brief.purpose}` : `方向 ${autoRun.briefId.slice(0, 8)}`}</p>
                                        {autoRun.currentRunId ? <p className="mt-2 text-xs text-muted-foreground">当前批次：{autoRun.currentRunId.slice(0, 8)}</p> : <p className="mt-2 text-xs text-muted-foreground">尚未生成</p>}
                                        {autoRun.lastError ? <p className="mt-1 text-xs text-destructive">{autoRun.lastError}</p> : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {autoRun.iteration > 0 ? <Button type="text" onClick={() => onTrajectory(autoRun.id)}>查看演化</Button> : null}
                                        {autoRun.state === "reviewing" || autoRun.state === "completed" ? <Button type="text" onClick={() => onReview(autoRun.id)}>查看审图</Button> : null}
                                        {autoRun.state === "generating" && autoRun.currentRunId ? <Button type="text" onClick={() => onRunStarted(autoRun.currentRunId!)}>查看本轮</Button> : null}
                                        <Button type="text" aria-label={`编辑${autoRun.name}`} disabled={active || inactiveBrief} icon={<Pencil className="size-4" />} onClick={() => {
                                            setEditing(autoRun);
                                            editForm.setFieldsValue({ name: autoRun.name, count: autoRun.count, maxIterations: autoRun.maxIterations });
                                        }} />
                                        {inactiveBrief ? (
                                            <Tag>保留运行与血缘，不可继续生成</Tag>
                                        ) : active ? (
                                            <Button type="text" danger icon={<CircleStop className="size-4" />} loading={busyId === autoRun.id} onClick={() => void stop(autoRun)}>停止自动跑</Button>
                                        ) : autoRun.canContinueExploration ? (
                                            <Button type="text" icon={<Repeat2 className="size-4" />} loading={busyId === autoRun.id} onClick={() => void continueExploration(autoRun)}>继续探索 +1 轮</Button>
                                        ) : autoRun.state !== "completed" || autoRun.iteration < autoRun.maxIterations ? (
                                            <Button type="text" icon={<Play className="size-4" />} loading={busyId === autoRun.id} onClick={() => void start(autoRun)}>{autoRun.lastStartedAt ? "继续自动跑" : "启动"}</Button>
                                        ) : null}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            <Modal title="编辑自动跑" open={Boolean(editing)} okText="保存" cancelText="取消" confirmLoading={saving} onOk={() => void saveEdit()} onCancel={() => setEditing(null)} destroyOnHidden>
                <Form form={editForm} layout="vertical" className="mt-5">
                    <Form.Item label="自动跑名称" name="name" rules={[{ required: true }]}><Input maxLength={500} /></Form.Item>
                    <Form.Item label="每轮数量" name="count" rules={[{ required: true }]}><InputNumber min={1} max={8} precision={0} className="!w-full" /></Form.Item>
                    <Form.Item label="最大轮数" name="maxIterations" rules={[{ required: true }]}><InputNumber min={1} max={20} precision={0} className="!w-full" /></Form.Item>
                </Form>
            </Modal>
        </section>
    );
}

function AutoRunStatus({ state, iteration, maxIterations, hasRun }: { state: FrameFlowAutoRunState; iteration: number; maxIterations: number; hasRun: boolean }) {
    const meta = {
        paused: { label: "已停止", color: "default" },
        generating: { label: hasRun ? `第 ${iteration} 轮生成中` : `Codex 规划第 ${iteration + 1} 轮`, color: "processing" },
        reviewing: { label: `第 ${iteration} 轮 Codex 审图中`, color: "warning" },
        completed: { label: `已完成 ${iteration}/${maxIterations} 轮`, color: "success" },
        awaiting_review: { label: `第 ${iteration} 轮待恢复审图`, color: "warning" },
        failed: { label: "需要处理", color: "error" },
    } as const;
    return <Tag color={meta[state].color}>{meta[state].label}</Tag>;
}

function errorMessage(reason: unknown) {
    return reason instanceof Error ? reason.message : "自动跑操作失败，请重试";
}
