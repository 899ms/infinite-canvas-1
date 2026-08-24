import { Bot, Check, ChevronDown, ImagePlus, Info, Play, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, App, Button, Empty, Form, Input, InputNumber, Segmented, Select, Spin, Steps, Tag } from "antd";

import { frameFlowReferenceIdempotencyKey, imageAssetToFrameFlowPng } from "@/lib/frameflow-reference";
import { approveFrameFlowPrompt, createFrameFlowBrief, getFrameFlowBrief, getFrameFlowPrompt, importFrameFlowReference, planFrameFlowRound, startFrameFlowRun, translateFrameFlowPrompt, type FrameFlowBrief, type FrameFlowBriefInput, type FrameFlowPromptVersion, type FrameFlowStrategy } from "@/services/api/frameflow";
import { useAgentStore } from "@/stores/use-agent-store";
import type { ImageAsset } from "@/stores/use-asset-store";

import { ReferenceAssetPicker } from "./reference-asset-picker";
import { clearFrameFlowCreateWorkflow, readFrameFlowCreateWorkflow, writeFrameFlowCreateWorkflow } from "./create-workflow-session";

type BriefFormValues = {
    subject: string;
    purpose?: string;
    platform?: string;
    style?: string;
    scene?: string;
    aspectRatio: string;
    strategy: FrameFlowStrategy;
    keep: string[];
    avoid: string[];
    count: number;
};
type PromptLanguageMode = "zh-CN" | "en" | "bilingual";

const initialValues: BriefFormValues = {
    subject: "",
    purpose: "",
    platform: "",
    style: "",
    scene: "",
    aspectRatio: "4:5",
    strategy: "balanced",
    keep: [],
    avoid: [],
    count: 4,
};

const promptFieldLabels: Record<keyof FrameFlowPromptVersion["fields"], string> = {
    subject: "主体",
    composition: "构图",
    color: "色彩",
    lighting: "光线",
    material: "材质",
    layout: "布局",
    mood: "氛围",
    rendering: "呈现方式",
    technical: "技术参数",
    negative: "避免",
};

export function FrameFlowCreateView({ onRunStarted }: { onRunStarted: (runId: string) => void }) {
    const { message } = App.useApp();
    const [form] = Form.useForm<BriefFormValues>();
    const endpoint = useAgentStore((state) => state.url)
        .trim()
        .replace(/\/$/, "");
    const token = useAgentStore((state) => state.token).trim();
    const [workflowKey, setWorkflowKey] = useState<string>(() => crypto.randomUUID());
    const [restoring, setRestoring] = useState(true);
    const [brief, setBrief] = useState<FrameFlowBrief | null>(null);
    const [prompt, setPrompt] = useState<FrameFlowPromptVersion | null>(null);
    const [planning, setPlanning] = useState(false);
    const [planningStage, setPlanningStage] = useState("Codex 正在规划结构化 Prompt…");
    const [approving, setApproving] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [promptLanguage, setPromptLanguage] = useState<PromptLanguageMode>("zh-CN");
    const [generating, setGenerating] = useState(false);
    const [referencePickerOpen, setReferencePickerOpen] = useState(false);
    const [referenceAssets, setReferenceAssets] = useState<ImageAsset[]>([]);
    const count = Form.useWatch("count", form) || 4;
    const referenceCount = referenceAssets.length || brief?.referenceImageIds.length || 0;
    const promptTranslation = prompt?.translations?.["zh-CN"];
    const briefReadOnly = Boolean(brief?.archivedAt || brief?.supersededAt || brief?.supersededByBriefId);

    useEffect(() => {
        let cancelled = false;
        if (!endpoint || !token) {
            setRestoring(false);
            return;
        }
        const saved = readFrameFlowCreateWorkflow(sessionStorage, endpoint);
        if (!saved) {
            setRestoring(false);
            return;
        }
        void (async () => {
            try {
                const restoredBrief = await getFrameFlowBrief(endpoint, token, saved.briefId);
                const restoredPrompt = saved.promptVersionId ? await getFrameFlowPrompt(endpoint, token, saved.promptVersionId) : null;
                if (cancelled) return;
                setWorkflowKey(saved.workflowKey);
                setBrief(restoredBrief);
                setPrompt(restoredPrompt);
                form.setFieldsValue({
                    subject: restoredBrief.subject,
                    purpose: restoredBrief.purpose,
                    platform: restoredBrief.platform || "",
                    style: restoredBrief.style || "",
                    scene: restoredBrief.scene || "",
                    aspectRatio: restoredBrief.aspectRatio,
                    strategy: restoredBrief.strategy,
                    keep: restoredBrief.constraints.keep,
                    avoid: restoredBrief.constraints.avoid,
                    count: saved.count,
                });
                message.success("已恢复未完成的 FrameFlow 工作流");
            } catch {
                clearFrameFlowCreateWorkflow(sessionStorage);
            } finally {
                if (!cancelled) setRestoring(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [endpoint, form, message, token]);

    const createPrompt = async (values: BriefFormValues) => {
        if (briefReadOnly) return;
        setPlanning(true);
        try {
            let persistedBrief = brief;
            if (!persistedBrief) {
                setPlanningStage(referenceAssets.length ? `正在验证并导入 ${referenceAssets.length} 张参考图…` : "Codex 正在规划结构化 Prompt…");
                const importedReferenceIds: string[] = [];
                for (const asset of referenceAssets) {
                    const reference = await importFrameFlowReference(endpoint, token, {
                        sourceId: asset.id,
                        sourceName: `${asset.title || asset.id}.png`,
                        idempotencyKey: frameFlowReferenceIdempotencyKey(asset),
                        png: await imageAssetToFrameFlowPng(asset),
                    });
                    importedReferenceIds.push(reference.id);
                }
                const input: FrameFlowBriefInput = {
                    subject: values.subject.trim(),
                    ...(values.purpose?.trim() ? { purpose: values.purpose.trim() } : {}),
                    ...(values.platform?.trim() ? { platform: values.platform.trim() } : {}),
                    ...(values.style?.trim() ? { style: values.style.trim() } : {}),
                    ...(values.scene?.trim() ? { scene: values.scene.trim() } : {}),
                    aspectRatio: values.aspectRatio,
                    constraints: { keep: values.keep || [], avoid: values.avoid || [] },
                    referenceImageIds: importedReferenceIds,
                    strategy: values.strategy,
                };
                persistedBrief = await createFrameFlowBrief(endpoint, token, input, `${workflowKey}-brief`);
                setBrief(persistedBrief);
                writeFrameFlowCreateWorkflow(sessionStorage, { endpoint, workflowKey, briefId: persistedBrief.id, count: values.count });
            }
            setPlanningStage("Codex 正在规划结构化 Prompt…");
            const planned = await planFrameFlowRound(endpoint, token, persistedBrief.id, persistedBrief.strategy, `${workflowKey}-plan`);
            setPrompt(planned);
            writeFrameFlowCreateWorkflow(sessionStorage, { endpoint, workflowKey, briefId: persistedBrief.id, promptVersionId: planned.id, count: values.count });
            message.success("Codex Prompt 已生成，请确认后批准");
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setPlanning(false);
        }
    };

    const approvePrompt = async () => {
        if (!prompt || briefReadOnly) return;
        setApproving(true);
        try {
            setPrompt(await approveFrameFlowPrompt(endpoint, token, prompt.id, `${workflowKey}-approve`));
            message.success("Prompt 已批准，尚未开始生图");
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setApproving(false);
        }
    };

    const translatePrompt = async () => {
        if (!prompt || briefReadOnly) return;
        setTranslating(true);
        try {
            setPrompt(await translateFrameFlowPrompt(endpoint, token, prompt.id, `${workflowKey}-translate-${prompt.id}`));
            message.success("中文展示稿已生成，英文执行 Prompt 保持不变");
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setTranslating(false);
        }
    };

    const startGeneration = async () => {
        if (!prompt || prompt.status !== "approved" || briefReadOnly) return;
        setGenerating(true);
        try {
            const runId = await startFrameFlowRun(endpoint, token, prompt.id, count, `${workflowKey}-run`);
            clearFrameFlowCreateWorkflow(sessionStorage);
            message.success("真实生成任务已提交，正在打开运行详情");
            onRunStarted(runId);
        } catch (reason) {
            message.error(errorMessage(reason));
        } finally {
            setGenerating(false);
        }
    };

    const reset = () => {
        form.resetFields();
        setWorkflowKey(crypto.randomUUID());
        setBrief(null);
        setPrompt(null);
        setPromptLanguage("zh-CN");
        setReferenceAssets([]);
        clearFrameFlowCreateWorkflow(sessionStorage);
    };

    return (
        <section className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="rounded-xl bg-card p-5 shadow-card ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold">创作需求</h2>
                        <p className="mt-1 text-xs text-muted-foreground">先生成 Prompt，批准后才会调用 ImageGen。</p>
                    </div>
                    {brief ? (
                        <Button type="text" size="small" icon={<RotateCcw className="size-3.5" strokeWidth={2} />} onClick={reset}>
                            重新填写
                        </Button>
                    ) : null}
                </div>

                <Form form={form} layout="vertical" initialValues={initialValues} onFinish={(values) => void createPrompt(values)} className="mt-5">
                    {briefReadOnly ? <Alert className="mb-4" showIcon type="info" title={brief?.archivedAt ? "需求已归档 · 只读" : "这是旧需求修订 · 只读"} description="这份未完成工作流只保留历史信息，不能更新 Prompt 或开始生成。请重新填写一个活动需求。" /> : null}
                    <Form.Item label="主体" name="subject" rules={[{ required: true, message: "请输入要创作的主体" }]}>
                        <Input disabled={Boolean(brief)} placeholder="例如：一把现代休闲椅" maxLength={500} />
                    </Form.Item>
                    <Form.Item label="用途（选填）" name="purpose" extra="留空时自动使用“审美训练与灵感采集”">
                        <Input disabled={Boolean(brief)} placeholder="例如：小红书新品封面" maxLength={500} />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-3">
                        <Form.Item label="风格" name="style">
                            <Input disabled={Boolean(brief)} placeholder="极简、侘寂…" maxLength={500} />
                        </Form.Item>
                        <Form.Item label="场景" name="scene">
                            <Input disabled={Boolean(brief)} placeholder="晨间窗边…" maxLength={500} />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Form.Item label="平台" name="platform">
                            <Input disabled={Boolean(brief)} placeholder="小红书" maxLength={500} />
                        </Form.Item>
                        <Form.Item label="画幅" name="aspectRatio">
                            <Select disabled={Boolean(brief)} options={["1:1", "4:5", "3:4", "16:9", "9:16"].map((value) => ({ label: value, value }))} />
                        </Form.Item>
                    </div>
                    <Form.Item label="必须保留" name="keep">
                        <Select disabled={Boolean(brief)} mode="tags" tokenSeparators={[",", "，"]} placeholder="输入后回车，可添加多项" />
                    </Form.Item>
                    <Form.Item label="必须避免" name="avoid">
                        <Select disabled={Boolean(brief)} mode="tags" tokenSeparators={[",", "，"]} placeholder="例如：文字、水印、人物" />
                    </Form.Item>
                    <div className="mb-6 rounded-xl bg-background p-3 shadow-card ring-1 ring-border">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-medium">参考图</div>
                                <div className="mt-1 text-xs text-muted-foreground">从“我的资产”选择，提交时会复制并校验到 Agent 工作区。</div>
                            </div>
                            <Button
                                size="small"
                                disabled={Boolean(brief)}
                                icon={<ImagePlus className="size-3.5" strokeWidth={1.5} />}
                                onClick={() => setReferencePickerOpen(true)}
                                className="active:!scale-[.96] !transition-transform"
                            >
                                {referenceCount ? "调整" : "选择"}
                            </Button>
                        </div>
                        {referenceAssets.length ? (
                            <div className="mt-3 grid grid-cols-4 gap-2">
                                {referenceAssets.map((asset) => (
                                    <div key={asset.id} className="group relative overflow-hidden rounded-lg ring-1 ring-black/10 dark:ring-white/10">
                                        <img src={asset.coverUrl || asset.data.dataUrl} alt={asset.title} className="aspect-square w-full object-cover" />
                                        {!brief ? (
                                            <button
                                                type="button"
                                                aria-label={`移除参考图 ${asset.title}`}
                                                onClick={() => setReferenceAssets((current) => current.filter((item) => item.id !== asset.id))}
                                                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-foreground shadow-card opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 active:scale-[.96]"
                                            >
                                                <X className="size-3.5" strokeWidth={2} />
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : brief?.referenceImageIds.length ? (
                            <div className="mt-3 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">已恢复 {brief.referenceImageIds.length} 张受控参考图</div>
                        ) : (
                            <div className="mt-3 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">未选择参考图，可直接使用文字 Brief</div>
                        )}
                    </div>
                    <Form.Item label="探索策略" name="strategy">
                        <Segmented
                            disabled={Boolean(brief)}
                            block
                            options={[
                                { label: "稳定", value: "stable" },
                                { label: "平衡", value: "balanced" },
                                { label: "探索", value: "explore" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="生成数量" name="count">
                        <InputNumber min={1} max={8} precision={0} className="!w-full" />
                    </Form.Item>
                    {!prompt ? (
                        <Button htmlType="submit" type="primary" block size="large" loading={planning || restoring} disabled={restoring || briefReadOnly} icon={<Bot className="size-4" strokeWidth={2} />} className="active:!scale-[.96] !transition-transform">
                            {brief ? "重试生成 Prompt" : "让 Codex 生成 Prompt"}
                        </Button>
                    ) : null}
                </Form>
            </div>

            <div className="min-h-[620px] min-w-0 rounded-xl bg-card p-5 shadow-card ring-1 ring-border sm:p-6">
                <Steps size="small" current={!prompt ? 0 : prompt.status === "draft" ? 1 : 2} items={[{ title: "填写需求" }, { title: "确认 Prompt" }, { title: "批准并生成" }]} />
                {planning ? (
                    <div className="flex min-h-[460px] flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Spin size="large" />
                        <span className="text-sm">{planningStage}</span>
                    </div>
                ) : null}
                {!planning && !prompt ? <Empty className="my-36" image={Empty.PRESENTED_IMAGE_SIMPLE} description="填写左侧需求，先生成一版可审查的 Prompt" /> : null}
                {!planning && prompt ? (
                    <div className="mt-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-semibold">Prompt Version {prompt.revision}</h2>
                                    <Tag color={prompt.status === "draft" ? "default" : "success"}>{prompt.status === "draft" ? "待批准" : "已批准"}</Tag>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Brief · {brief?.id.slice(0, 8)} · Prompt · {prompt.id.slice(0, 8)}
                                </p>
                                {prompt.referenceImageIds.length ? <p className="mt-1 text-xs text-muted-foreground">已绑定 {prompt.referenceImageIds.length} 张受控参考图</p> : null}
                            </div>
                            <div className="flex flex-wrap items-start justify-end gap-3">
                                <div className="text-right">
                                    <Segmented
                                        aria-label="Prompt 展示语言"
                                        value={promptLanguage}
                                        onChange={(value) => setPromptLanguage(value as PromptLanguageMode)}
                                        options={[{ label: "中文", value: "zh-CN" }, { label: "English", value: "en" }, { label: "中英对照", value: "bilingual" }]}
                                    />
                                    <div className="mt-1 text-[11px] text-muted-foreground">仅切换审核语言，生图始终使用英文原文</div>
                                </div>
                                {prompt.status === "draft" ? (
                                    <Button type="primary" icon={<Check className="size-4" strokeWidth={2} />} loading={approving} disabled={briefReadOnly} onClick={() => void approvePrompt()} className="active:!scale-[.96] !transition-transform">
                                        批准 Prompt
                                    </Button>
                                ) : (
                                    <Button type="primary" icon={<Play className="size-4" strokeWidth={2} />} loading={generating} disabled={briefReadOnly} onClick={() => void startGeneration()} className="active:!scale-[.96] !transition-transform">
                                        开始生成 {count} 张
                                    </Button>
                                )}
                            </div>
                        </div>

                        <details className="group mt-5 rounded-lg bg-background shadow-card ring-1 ring-border">
                            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                                <Info className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                                <span className="text-sm font-medium">Codex 决策说明</span>
                                <span className="ms-auto text-xs text-muted-foreground">点击展开</span>
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180" strokeWidth={2} />
                            </summary>
                            <div className="border-t border-border px-4 pb-4 pt-3">
                                <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{prompt.reason}</p>
                            </div>
                        </details>
                        {promptLanguage !== "en" && !promptTranslation ? (
                            <Alert
                                className="mt-3"
                                type="warning"
                                showIcon
                                title={<div><div>旧版本尚无中文展示稿</div><div className="mt-0.5 text-xs font-normal opacity-75">补译只增加审核语言，不改变英文生图输入。</div></div>}
                                action={<Button size="small" loading={translating} disabled={briefReadOnly} onClick={() => void translatePrompt()} className="active:!scale-[.96] !transition-transform">生成中文版本</Button>}
                            />
                        ) : null}
                        <div className="mt-5 grid min-w-0 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {(Object.keys(prompt.fields) as Array<keyof typeof prompt.fields>).map((field) => (
                                <div key={field} className="min-w-0 rounded-lg bg-background p-3 shadow-card ring-1 ring-border">
                                    <div className="text-xs font-semibold text-muted-foreground">{promptFieldLabels[field]}</div>
                                    {promptLanguage !== "en" && promptTranslation ? <PromptValues language="中文" values={promptTranslation.fields[field]} negative={field === "negative"} showLanguage={promptLanguage === "bilingual"} /> : null}
                                    {promptLanguage !== "zh-CN" ? <PromptValues language="English" values={prompt.fields[field]} negative={field === "negative"} showLanguage={promptLanguage === "bilingual"} separated={promptLanguage === "bilingual" && Boolean(promptTranslation)} /> : null}
                                    {promptLanguage === "zh-CN" && !promptTranslation ? <span className="mt-2 block text-xs text-muted-foreground">等待生成中文版本</span> : null}
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 rounded-lg bg-background p-4 shadow-card ring-1 ring-border">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                <Sparkles className="size-3.5" strokeWidth={2} />
                                完整 Prompt
                            </div>
                            {promptLanguage !== "en" && promptTranslation ? <PromptText language="中文" text={promptTranslation.compiledPrompt} showLanguage={promptLanguage === "bilingual"} /> : null}
                            {promptLanguage !== "zh-CN" ? <PromptText language="English" text={prompt.compiledPrompt} showLanguage={promptLanguage === "bilingual"} separated={promptLanguage === "bilingual" && Boolean(promptTranslation)} /> : null}
                            {promptLanguage === "zh-CN" && !promptTranslation ? <p className="text-sm text-muted-foreground">生成中文版本后在这里显示，英文执行 Prompt 未受影响。</p> : null}
                        </div>
                    </div>
                ) : null}
            </div>
            <ReferenceAssetPicker
                open={referencePickerOpen}
                selectedIds={referenceAssets.map((asset) => asset.id)}
                onClose={() => setReferencePickerOpen(false)}
                onConfirm={(assets) => {
                    setReferenceAssets(assets);
                    setReferencePickerOpen(false);
                }}
            />
        </section>
    );
}

function PromptValues({ language, values, negative, showLanguage, separated = false }: { language: string; values: string[]; negative: boolean; showLanguage: boolean; separated?: boolean }) {
    return (
        <div className={separated ? "mt-3 border-t border-border pt-3" : "mt-2"}>
            {showLanguage ? <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">{language}</div> : null}
            <div className="flex flex-wrap gap-1.5">
                {values.length ? values.map((value) => (
                    <Tag key={value} color={negative ? "error" : undefined} className="!m-0 !max-w-full !whitespace-normal !leading-5 [overflow-wrap:anywhere]">{value}</Tag>
                )) : <span className="text-xs text-muted-foreground">未设置</span>}
            </div>
        </div>
    );
}

function PromptText({ language, text, showLanguage, separated = false }: { language: string; text: string; showLanguage: boolean; separated?: boolean }) {
    return (
        <div className={separated ? "mt-4 border-t border-border pt-4" : ""}>
            {showLanguage ? <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">{language}</div> : null}
            <p className="whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">{text}</p>
        </div>
    );
}

function errorMessage(reason: unknown) {
    return reason instanceof Error ? reason.message : "FrameFlow 操作失败，请重试";
}
