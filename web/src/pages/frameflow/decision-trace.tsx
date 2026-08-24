import { Ban, BrainCircuit, CheckCircle2, ChevronDown, CircleSlash2, GitCompareArrows } from "lucide-react";
import { Empty, Tag } from "antd";

import { cn } from "@/lib/utils";
import type { FrameFlowAgentDecisionEvidence, FrameFlowPromptFieldChange, FrameFlowPromptFieldKey, FrameFlowPromptLineage } from "@/services/api/frameflow";

export function FrameFlowDecisionTrace({ lineage }: { lineage: FrameFlowPromptLineage | null }) {
    const prompt = lineage?.versions.find((version) => version.id === lineage.promptVersionId);
    const decision = prompt?.decisionId ? lineage?.decisions.find((item) => item.id === prompt.decisionId) : undefined;

    if (!prompt || !decision) {
        return (
            <section className="mt-5 rounded-xl bg-background px-4 py-3 shadow-card ring-1 ring-border" aria-label="生成依据">
                <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                            <BrainCircuit className="size-4 text-muted-foreground" strokeWidth={2} />
                            查看生成依据
                        </span>
                        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" strokeWidth={2} />
                    </summary>
                    <Empty className="mt-4" image={Empty.PRESENTED_IMAGE_SIMPLE} description="这条旧记录还没有 Agent Decision" />
                </details>
            </section>
        );
    }

    const counts = {
        adopted: decision.evidence.filter((item) => item.disposition === "adopted").length,
        avoided: decision.evidence.filter((item) => item.disposition === "avoided").length,
        ignored: decision.evidence.filter((item) => item.disposition === "ignored").length,
    };
    const groups = diffOrder.map((key) => ({ key, changes: prompt.diff[key] })).filter((group) => group.changes.length);

    return (
        <section className="mt-5 rounded-xl bg-background p-4 shadow-card ring-1 ring-border" aria-label="本轮学习摘要与生成依据">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="size-5 text-primary" strokeWidth={2} />
                    <h3 className="text-base font-semibold">本轮学习摘要</h3>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="证据处置统计">
                    <Tag color="success" className="!m-0">
                        采用 {counts.adopted}
                    </Tag>
                    <Tag color="error" className="!m-0">
                        规避 {counts.avoided}
                    </Tag>
                    <Tag className="!m-0">忽略 {counts.ignored}</Tag>
                    <Tag className="!m-0">Prompt 变更 {groups.reduce((sum, group) => sum + group.changes.length, 0)} 项</Tag>
                </div>
            </div>

            <details className="group mt-4 border-t border-border pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="text-sm font-medium">查看生成依据与 Prompt 变更</span>
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" strokeWidth={2} />
                </summary>
                <div className="mt-4 rounded-lg bg-card p-4 ring-1 ring-border">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="size-5 text-primary" strokeWidth={2} />
                        <h4 className="text-base font-semibold">Agent Decision</h4>
                    </div>
                    <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{decision.summary}</p>

                    {decision.evidence.length ? (
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {decision.evidence.map((evidence) => (
                                <EvidenceCard key={evidence.imageId} evidence={evidence} />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-4 rounded-lg bg-background px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">本轮没有可用 Preference DNA，Prompt 只依据 Creative Brief 生成。</div>
                    )}
                </div>

                <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                        <GitCompareArrows className="size-5 text-muted-foreground" strokeWidth={2} />
                        <h4 className="text-base font-semibold">Prompt Diff</h4>
                        <span className="text-xs tabular-nums text-muted-foreground">{groups.reduce((sum, group) => sum + group.changes.length, 0)} 项</span>
                    </div>
                    <div className="mt-3 space-y-3">
                        {groups.map((group) => (
                            <div key={group.key} className="rounded-lg bg-card p-3 ring-1 ring-border">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <span className={cn("text-sm font-semibold", group.key === "avoid" && "text-feedback-delete")}>{diffLabel[group.key]}</span>
                                    <span className="text-xs tabular-nums text-muted-foreground">{group.changes.length}</span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {group.changes.map((change, index) => (
                                        <DiffRow key={`${change.field}-${index}`} change={change} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </details>
        </section>
    );
}

function EvidenceCard({ evidence }: { evidence: FrameFlowAgentDecisionEvidence }) {
    const meta = dispositionMeta[evidence.disposition];
    const Icon = meta.icon;
    return (
        <article className="rounded-lg bg-card p-3 ring-1 ring-border">
            <div className="flex items-start justify-between gap-3">
                <div className={cn("flex items-center gap-2 text-sm font-semibold", meta.className)}>
                    <Icon className="size-4" strokeWidth={2} />
                    {meta.label}
                </div>
                <span className={cn("text-sm font-semibold tabular-nums", evidence.weight > 0 ? "text-feedback-reinforce" : evidence.weight < 0 ? "text-feedback-delete" : "text-muted-foreground")}>
                    {evidence.weight > 0 ? `+${evidence.weight}` : evidence.weight}
                </span>
            </div>
            <p className="mt-2 text-sm leading-6">{evidence.reason}</p>
            {evidence.comment ? <p className="mt-2 rounded-md bg-background px-3 py-2 text-xs leading-5 text-muted-foreground ring-1 ring-border">“{evidence.comment}”</p> : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {evidence.rating ? <Tag className="!m-0">{evidence.rating} 星</Tag> : null}
                {evidence.affectedFields.map((field) => (
                    <Tag key={field} className="!m-0">
                        {fieldLabel[field]}
                    </Tag>
                ))}
                <Tag className="!m-0">图片 {shortId(evidence.imageId)}</Tag>
                <Tag className="!m-0">{evidence.sourceEventIds.length} 条事实事件</Tag>
            </div>
        </article>
    );
}

function DiffRow({ change }: { change: FrameFlowPromptFieldChange }) {
    return (
        <div className="rounded-md bg-background px-3 py-2 ring-1 ring-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold">{fieldLabel[change.field]}</span>
                {change.evidenceImageIds.length ? <span className="text-[11px] text-muted-foreground">{change.evidenceImageIds.length} 张证据图</span> : null}
            </div>
            <div className="mt-1.5 grid gap-1 text-xs leading-5 sm:grid-cols-2">
                <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">前：</span>
                    {change.before.join(" · ") || "无"}
                </p>
                <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">后：</span>
                    {change.after.join(" · ") || "无"}
                </p>
            </div>
        </div>
    );
}

const dispositionMeta = {
    adopted: { label: "采用", icon: CheckCircle2, className: "text-feedback-reinforce" },
    avoided: { label: "规避", icon: Ban, className: "text-feedback-delete" },
    ignored: { label: "忽略", icon: CircleSlash2, className: "text-muted-foreground" },
} as const;

const diffOrder = ["add", "change", "remove", "avoid", "keep"] as const;
const diffLabel = { keep: "保留", add: "新增", change: "修改", remove: "移除", avoid: "明确规避" } as const;
const fieldLabel: Record<FrameFlowPromptFieldKey, string> = {
    subject: "主体",
    composition: "构图",
    color: "色彩",
    lighting: "光线",
    material: "材质",
    layout: "布局",
    mood: "氛围",
    rendering: "渲染",
    technical: "技术参数",
    negative: "负向约束",
};

function shortId(value: string) {
    return value.slice(0, 8);
}
