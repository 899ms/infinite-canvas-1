import { Download, FileUp, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Card, Col, Empty, Input, Row, Select, Space, Tabs, Tag, Typography } from "antd";

import { compilePrompt, getTemplateVariables } from "@/lib/prompt-fill/compiler";
import { starterPromptTemplates } from "@/lib/prompt-fill/templates";
import { compileRuntimeLibrary, recipeContent } from "@/lib/prompt-knowledge-base/domain";
import { createMigrationExport, importMigrationSnapshot } from "@/lib/prompt-knowledge-base/import-export";
import { useCopyText } from "@/hooks/use-copy-text";
import { usePromptKnowledgeBaseStore } from "@/stores/use-prompt-knowledge-base-store";
import { usePromptFillStore } from "@/stores/use-prompt-fill-store";
import { useImageFeedbackStore } from "@/stores/use-image-feedback-store";
import { insertPromptIntoCanvas } from "@/lib/canvas/prompt-library";
import { useNavigate } from "react-router-dom";
import { preferenceSignals } from "@/lib/image-feedback";

const categories = ["主体", "场景", "构图", "光线", "风格", "材质", "镜头", "情绪", "其他"] as const;

export function PromptDashboard() {
    const { message } = App.useApp();
    const fileRef = useRef<HTMLInputElement>(null);
    const { data, hydrated, error: knowledgeError, hydrate, capture, addTerm, addRecipe, addPrompt, review, replace } = usePromptKnowledgeBaseStore();
    const { templates: customTemplates, hydrated: templatesHydrated, error: templatesError, hydrate: hydrateTemplates, save: saveTemplate, remove: removeTemplate, replace: replaceTemplates } = usePromptFillStore();
    const { feedback, hydrated: feedbackHydrated, error: feedbackError, hydrate: hydrateFeedback, replace: replaceFeedback } = useImageFeedbackStore();
    const navigate = useNavigate();
    const copy = useCopyText();
    const [captureText, setCaptureText] = useState("");
    const [termText, setTermText] = useState("");
    const [termCategory, setTermCategory] = useState<(typeof categories)[number]>("其他");
    const [recipeTitle, setRecipeTitle] = useState("");
    const [recipeTerms, setRecipeTerms] = useState<string[]>([]);
    const [promptTitle, setPromptTitle] = useState("");
    const [promptContent, setPromptContent] = useState("");
    const [template, setTemplate] = useState(starterPromptTemplates[0]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [exportReceipt, setExportReceipt] = useState("");

    useEffect(() => {
        if (!hydrated) void hydrate();
    }, [hydrate, hydrated]);
    useEffect(() => {
        if (!templatesHydrated) void hydrateTemplates();
    }, [hydrateTemplates, templatesHydrated]);
    useEffect(() => {
        if (!feedbackHydrated) void hydrateFeedback();
    }, [feedbackHydrated, hydrateFeedback]);
    useEffect(() => setValues(Object.fromEntries(getTemplateVariables(template.content).map((item) => [item.key, item.defaultValue]))), [template.content]);
    const runtime = useMemo(() => compileRuntimeLibrary(data), [data]);
    const preference = useMemo(() => preferenceSignals(feedback), [feedback]);
    const compiled = compilePrompt(template.content, values);
    const approve = async (kind: "term" | "recipe" | "prompt", id: string, state: "machine_passed" | "human_approved" | "needs_revision" = "human_approved") => {
        try {
            await review(kind, id, state);
            message.success(state === "machine_passed" ? "结构与引用校验通过" : state === "human_approved" ? "人工审核通过" : "已标记为需要返修");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "审核失败");
        }
    };
    const addManualCapture = async () => {
        try {
            await capture({ sourceType: "manual", content: captureText });
            setCaptureText("");
            message.success("已采集到待处理区");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "采集失败");
        }
    };
    const createTerm = async () => {
        try {
            await addTerm({ text: termText, browseCategory: termCategory, sourceCaptureIds: data.captures.slice(-1).map((item) => item.id) });
            setTermText("");
            message.success("词条已进入待审核");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "创建失败");
        }
    };
    const createRecipe = async () => {
        try {
            await addRecipe({ title: recipeTitle, termIds: recipeTerms, sourceCaptureIds: [...new Set(recipeTerms.flatMap((id) => data.terms.find((term) => term.id === id)?.sourceCaptureIds || []))] });
            setRecipeTitle("");
            setRecipeTerms([]);
            message.success("配方已进入待审核");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "创建失败");
        }
    };
    const createPrompt = async () => {
        try {
            const sourceCaptureIds = data.captures.slice(-1).map((item) => item.id);
            await addPrompt({ title: promptTitle, content: promptContent, sourceCaptureIds });
            setPromptTitle("");
            setPromptContent("");
            message.success("完整提示词已进入待审核");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "请先收录原始提示词，再保存完整 Prompt");
        }
    };
    const download = () => {
        try {
            const { json, receipt } = createMigrationExport(data, customTemplates, feedback);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = receipt.fileName;
            link.click();
            URL.revokeObjectURL(url);
            const summary = `已校验：${receipt.captures} 条收录、${receipt.terms} 个词条、${receipt.recipes} 个配方、${receipt.prompts} 条 Prompt、${receipt.templates} 个模板、${receipt.feedback} 条反馈，${receipt.bytes} B`;
            setExportReceipt(summary);
            message.success(`迁移包已验证，可安全导入（${receipt.bytes} B）`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "导出校验失败");
        }
    };
    const upload = async (file?: File) => {
        if (!file) return;
        try {
            const imported = importMigrationSnapshot(await file.text(), data);
            await replace(imported.knowledgeBase);
            await replaceTemplates([...customTemplates, ...imported.promptFillTemplates.filter((item) => !customTemplates.some((current) => current.id === item.id))]);
            await replaceFeedback({ ...feedback, ...imported.imageFeedback });
            message.success(`迁移完成：新增 ${imported.report.added}，合并 ${imported.report.merged}，跳过 ${imported.report.skipped}，冲突 ${imported.report.conflicts}`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "导入失败");
        }
    };
    const useOnCanvas = (content: string, title: string) => {
        const result = insertPromptIntoCanvas(content, title);
        message.success("已插入画布文本节点");
        navigate(`/canvas/${result.projectId}`);
    };
    const saveCompiledAsPrompt = async () => {
        try {
            const sourceCaptureIds = data.captures.slice(-1).map((item) => item.id);
            await addPrompt({ title: template.title, content: compiled, sourceCaptureIds });
            message.success("已保存为待审核完整 Prompt");
        } catch {
            message.error("请先在“采集与审核”中收录一个原文，再保存完整 Prompt");
        }
    };
    const saveCurrentTemplate = async () => {
        try {
            await saveTemplate({ title: template.title, content: template.content, category: "我的模板", description: template.description });
            message.success("PromptFill 模板已保存");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "PromptFill 模板保存失败");
        }
    };
    const deleteTemplate = async (id: string) => {
        try {
            await removeTemplate(id);
            message.success("PromptFill 模板已删除");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "PromptFill 模板删除失败");
        }
    };

    return (
        <main className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:py-8">
            <div className="mx-auto max-w-7xl">
                {knowledgeError || templatesError || feedbackError ? <Alert className="mb-4" showIcon type="error" title="浏览器数据未能安全保存或读取" description={[knowledgeError, templatesError, feedbackError].filter(Boolean).join("；")} /> : null}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="page-title text-stone-950 dark:text-stone-100">我的提示词仪表盘</h1>
                        <p className="mt-1 text-sm text-stone-500">把灵感、公开库与资产反馈沉淀为可审核、可复用的个人审美资产。</p>
                        {exportReceipt ? (
                            <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300" role="status" aria-label="提示词导出校验结果">
                                {exportReceipt}
                            </div>
                        ) : null}
                    </div>
                    <Space>
                        <Button icon={<Download className="size-4" />} onClick={download}>
                            导出
                        </Button>
                        <Button icon={<FileUp className="size-4" />} onClick={() => fileRef.current?.click()}>
                            导入
                        </Button>
                    </Space>
                </div>
                <input
                    ref={fileRef}
                    className="hidden"
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => {
                        void upload(event.target.files?.[0]);
                        event.target.value = "";
                    }}
                />
                <Row gutter={[16, 16]} className="mt-6">
                    <Metric title="待处理采集" value={data.captures.length} />
                    <Metric title="已通过词条" value={runtime.terms.length} />
                    <Metric title="可用配方" value={runtime.recipes.length} />
                    <Metric title="可插入画布" value={runtime.prompts.length} />
                </Row>
                <Tabs
                    className="mt-6"
                    items={[
                        {
                            key: "capture",
                            label: "采集与审核",
                            children: (
                                <div className="grid gap-5 lg:grid-cols-2">
                                    <Card title="采集灵感">
                                        <Input.TextArea value={captureText} rows={4} placeholder="粘贴灵感、公开提示词、画布文本或你对图片的评论" onChange={(event) => setCaptureText(event.target.value)} />
                                        <Button className="mt-3" type="primary" icon={<Plus className="size-4" />} onClick={() => void addManualCapture()}>
                                            收录为待处理采集
                                        </Button>
                                        <div className="mt-4 space-y-2">
                                            {data.captures
                                                .slice()
                                                .reverse()
                                                .slice(0, 8)
                                                .map((item) => (
                                                    <div key={item.id} className="rounded border border-stone-200 p-3 text-sm dark:border-stone-800">
                                                        <Tag>{item.sourceType}</Tag>
                                                        {item.content}
                                                    </div>
                                                ))}
                                            {!data.captures.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未采集" /> : null}
                                        </div>
                                    </Card>
                                    <Card title="建立词条">
                                        <Space.Compact className="w-full">
                                            <Input value={termText} placeholder="例如：低角度侧逆光" onChange={(event) => setTermText(event.target.value)} />
                                            <Select value={termCategory} options={categories.map((item) => ({ value: item }))} onChange={setTermCategory} />
                                        </Space.Compact>
                                        <Button className="mt-3" onClick={() => void createTerm()}>
                                            加入待审核词条
                                        </Button>
                                        <ReviewList items={data.terms} empty="尚未建立词条" onSet={(id, state) => approve("term", id, state)} />
                                    </Card>
                                </div>
                            ),
                        },
                        {
                            key: "recipes",
                            label: "配方与完整提示词",
                            children: (
                                <div className="grid gap-5 lg:grid-cols-2">
                                    <Card title="组合视觉配方">
                                        <Input value={recipeTitle} placeholder="配方标题" onChange={(event) => setRecipeTitle(event.target.value)} />
                                        <Select
                                            className="mt-3 w-full"
                                            mode="multiple"
                                            placeholder="至少选择两个词条"
                                            value={recipeTerms}
                                            options={data.terms.map((item) => ({ label: `${item.text} · ${item.browseCategory}`, value: item.id }))}
                                            onChange={setRecipeTerms}
                                        />
                                        <Button className="mt-3" onClick={() => void createRecipe()}>
                                            建立待审核配方
                                        </Button>
                                        <ReviewList items={data.recipes} empty="尚未建立配方" onSet={(id, state) => approve("recipe", id, state)} />
                                    </Card>
                                    <Card title="沉淀完整提示词">
                                        <Input value={promptTitle} placeholder="标题" onChange={(event) => setPromptTitle(event.target.value)} />
                                        <Input.TextArea className="mt-3" rows={5} value={promptContent} placeholder="完整提示词内容" onChange={(event) => setPromptContent(event.target.value)} />
                                        <Button className="mt-3" type="primary" onClick={() => void createPrompt()}>
                                            保存为待审核提示词
                                        </Button>
                                        <ReviewList items={data.prompts} empty="尚未建立完整提示词" onSet={(id, state) => approve("prompt", id, state)} />
                                    </Card>
                                </div>
                            ),
                        },
                        {
                            key: "runtime",
                            label: `运行时词库 (${runtime.prompts.length})`,
                            children: (
                                <RuntimeLibrary
                                    data={runtime}
                                    onCopy={copy}
                                    onCanvas={useOnCanvas}
                                    onLoad={(content, title) => {
                                        setTemplate({ id: `runtime_${crypto.randomUUID()}`, title, content, category: "运行时词库", description: "从运行时词库载入" });
                                        message.success("已载入 PromptFill，请切换至 PromptFill 自定义提示词继续编辑");
                                    }}
                                />
                            ),
                        },
                        { key: "feedback", label: `审美反馈 (${Object.keys(feedback).length})`, children: <FeedbackOverview feedback={feedback} styles={preference.styles} scenes={preference.scenes} /> },
                        {
                            key: "fill",
                            label: "PromptFill 自定义提示词",
                            children: (
                                <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                                    <Card
                                        title="模板"
                                        extra={
                                            <Button size="small" icon={<Save className="size-3.5" />} onClick={() => void saveCurrentTemplate()}>
                                                保存当前
                                            </Button>
                                        }
                                    >
                                        <div className="space-y-2">
                                            {[...starterPromptTemplates, ...customTemplates].map((item) => (
                                                <div key={item.id} className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        className={`min-w-0 flex-1 rounded-lg border p-3 text-left ${template.id === item.id ? "border-primary bg-primary/5" : "border-stone-200 dark:border-stone-800"}`}
                                                        onClick={() => setTemplate(item)}
                                                    >
                                                        <div className="font-medium">{item.title}</div>
                                                        <div className="mt-1 text-xs text-stone-500">{item.description}</div>
                                                    </button>
                                                    {item.custom ? <Button aria-label={`删除模板 ${item.title}`} icon={<Trash2 className="size-3.5" />} onClick={() => void deleteTemplate(item.id)} /> : null}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 grid gap-2">
                                            <Input value={template.title} onChange={(event) => setTemplate((current) => ({ ...current, title: event.target.value }))} placeholder="模板名称" />
                                            <Input.TextArea rows={4} value={template.content} onChange={(event) => setTemplate((current) => ({ ...current, content: event.target.value }))} placeholder="支持 {{变量: 默认值}}" />
                                        </div>
                                    </Card>
                                    <Card title={template.title}>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {getTemplateVariables(template.content).map((item) => (
                                                <label key={item.key} className="text-sm font-medium">
                                                    {item.label}
                                                    <Input
                                                        className="mt-1"
                                                        value={values[item.key] || ""}
                                                        onChange={(event) => setValues((old) => ({ ...old, [item.key]: event.target.value }))}
                                                        suffix={item.occurrences > 1 ? `同步 ${item.occurrences} 处` : undefined}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm leading-6 dark:border-stone-800 dark:bg-stone-950">{compiled}</div>
                                        <Space className="mt-3">
                                            <Button type="primary" onClick={() => copy(compiled, "已复制 PromptFill 结果")}>
                                                复制结果
                                            </Button>
                                            <Button onClick={() => void saveCompiledAsPrompt()}>保存为完整 Prompt</Button>
                                            <Button onClick={() => useOnCanvas(compiled, template.title)}>插入画布</Button>
                                        </Space>
                                    </Card>
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </main>
    );
}

function Metric({ title, value }: { title: string; value: number }) {
    return (
        <Col xs={12} sm={6}>
            <Card size="small">
                <Typography.Text type="secondary">{title}</Typography.Text>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
            </Card>
        </Col>
    );
}
function ReviewList({
    items,
    empty,
    onSet,
}: {
    items: Array<{ id: string; title?: string; text?: string; content?: string; reviewState: string; validationErrors?: string[] }>;
    empty: string;
    onSet: (id: string, state: "machine_passed" | "human_approved" | "needs_revision") => void;
}) {
    return (
        <div className="thin-scrollbar mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
            {items
                .slice()
                .reverse()
                .map((item) => (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-stone-200 p-3 text-sm dark:border-stone-800" key={item.id}>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate">{item.title || item.text || item.content}</span>
                            {item.validationErrors?.length ? <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{item.validationErrors.join("；")}</span> : null}
                        </span>
                        <Space size={4} wrap>
                            <Tag>
                                {item.reviewState === "machine_passed" ? "机器校验通过" : item.reviewState === "needs_revision" ? "需要返修" : item.reviewState === "human_approved" ? "人工已通过" : item.validationErrors?.length ? "引用待修复" : "待审核"}
                            </Tag>
                            {item.reviewState !== "human_approved" ? (
                                <Button size="small" onClick={() => onSet(item.id, "machine_passed")}>
                                    机器校验
                                </Button>
                            ) : null}
                            <Button size="small" type="primary" onClick={() => onSet(item.id, "human_approved")}>
                                人工通过
                            </Button>
                            <Button size="small" danger onClick={() => onSet(item.id, "needs_revision")}>
                                返修
                            </Button>
                        </Space>
                    </div>
                ))}
            {!items.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} /> : null}
        </div>
    );
}
function RuntimeLibrary({
    data,
    onCopy,
    onCanvas,
    onLoad,
}: {
    data: ReturnType<typeof compileRuntimeLibrary>;
    onCopy: (value: string, message: string) => void;
    onCanvas: (value: string, title: string) => void;
    onLoad: (value: string, title: string) => void;
}) {
    return (
        <div className="grid gap-5 lg:grid-cols-3">
            <Card title={`原子词 ${data.terms.length}`}>
                {data.terms.length ? (
                    data.terms.map((item) => (
                        <div key={item.id} className="mb-2 flex items-center justify-between gap-2">
                            <span>{item.text}</span>
                            <Space size={2}>
                                <Tag>{item.browseCategory}</Tag>
                                <Button size="small" onClick={() => onLoad(item.text, item.text)}>
                                    载入
                                </Button>
                            </Space>
                        </div>
                    ))
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用词条" />
                )}
            </Card>
            <Card title={`配方 ${data.recipes.length}`}>
                {data.recipes.length ? (
                    data.recipes.map((item) => {
                        const content = recipeContent(item, data.terms);
                        return (
                            <div key={item.id} className="mb-3">
                                <Typography.Text strong>{item.title}</Typography.Text>
                                <div className="mt-2">
                                    <Space>
                                        <Button size="small" onClick={() => onLoad(content, item.title)}>
                                            载入 PromptFill
                                        </Button>
                                        <Button size="small" onClick={() => onCanvas(content, item.title)}>
                                            插入画布
                                        </Button>
                                    </Space>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用配方" />
                )}
            </Card>
            <Card title={`完整提示词 ${data.prompts.length}`}>
                {data.prompts.length ? (
                    data.prompts.map((item) => (
                        <div key={item.id} className="mb-3">
                            <Typography.Text strong>{item.title}</Typography.Text>
                            <p className="line-clamp-2 text-xs text-stone-500">{item.content}</p>
                            <Space>
                                <Button size="small" onClick={() => onCopy(item.content, "已复制提示词")}>
                                    复制
                                </Button>
                                <Button size="small" onClick={() => onLoad(item.content, item.title)}>
                                    载入 PromptFill
                                </Button>
                                <Button size="small" onClick={() => onCanvas(item.content, item.title)}>
                                    插入画布
                                </Button>
                            </Space>
                        </div>
                    ))
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用完整提示词" />
                )}
            </Card>
        </div>
    );
}
function FeedbackOverview({
    feedback,
    styles,
    scenes,
}: {
    feedback: Record<string, { rating?: number; comment: string; hidden: boolean; style?: string; scene?: string }>;
    styles: Array<{ label: string; score: number }>;
    scenes: Array<{ label: string; score: number }>;
}) {
    const records = Object.values(feedback);
    return (
        <div className="grid gap-5 lg:grid-cols-3">
            <Card title="反馈记录">
                {records.length ? (
                    records.map((item, index) => (
                        <div key={index} className="mb-3 rounded border border-stone-200 p-3 text-sm dark:border-stone-800">
                            <Tag color={item.hidden ? "red" : item.rating && item.rating >= 4 ? "green" : "default"}>{item.hidden ? "强负反馈" : `${item.rating || "未评分"} 星`}</Tag>
                            <div className="mt-2">{item.comment || "未填写评论"}</div>
                        </div>
                    ))
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有图片反馈" />
                )}
            </Card>
            <Card title="风格偏好">
                {styles.length ? (
                    styles.map((item) => (
                        <Tag key={item.label} color={item.score > 0 ? "green" : "red"}>
                            {item.score > 0 ? "+" : ""}
                            {item.score} {item.label}
                        </Tag>
                    ))
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无风格信号" />
                )}
            </Card>
            <Card title="场景偏好">
                {scenes.length ? (
                    scenes.map((item) => (
                        <Tag key={item.label} color={item.score > 0 ? "green" : "red"}>
                            {item.score > 0 ? "+" : ""}
                            {item.score} {item.label}
                        </Tag>
                    ))
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无场景信号" />
                )}
            </Card>
        </div>
    );
}
