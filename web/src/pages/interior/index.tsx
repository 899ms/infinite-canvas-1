import { Check, Download, Film, ImagePlus, LoaderCircle, Save, ScanLine, Sparkles, Upload, Workflow } from "lucide-react";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import { Alert, App, Button, Card, Input, Select, Steps, Tag, Tooltip } from "antd";
import { nanoid } from "nanoid";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

import { mergeGenerationPrompt, normalizeRegion, usableRegion, workflowStep, type NormalizedRegion } from "@/lib/interior-design-workflow";
import { buildInteriorCanvasWorkflow } from "@/lib/canvas/interior-canvas-workflow";
import { requestInteriorImages, requestInteriorPrompt, type InteriorPromptDraft, type InteriorPromptStage } from "@/services/api/interior-design";
import { requestVideoGeneration, storeGeneratedVideo } from "@/services/api/video";
import { imageToDataUrl, uploadImage, type UploadedImage } from "@/services/image-storage";
import type { UploadedFile } from "@/services/file-storage";
import { useAgentStore } from "@/stores/use-agent-store";
import { useAssetStore } from "@/stores/use-asset-store";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { modelOptionLabel, useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import { cn } from "@/lib/utils";

type ImageCandidate = UploadedImage & { id: string };
type PlanImage = ReferenceImage & UploadedImage;
type BusyStage = InteriorPromptStage | "white-images" | "design-images" | "video" | "canvas" | "";

const roomOptions = ["客厅", "卧室", "餐厅", "厨房", "书房", "儿童房", "卫生间", "玄关", "办公室", "商业空间"];
const styleOptions = ["现代极简", "侘寂", "原木自然", "中古", "现代奢华", "新中式", "法式", "北欧", "工业风", "未来主义"];

export default function InteriorDesignPage() {
    const { message } = App.useApp();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const addAsset = useAssetStore((state) => state.addAsset);
    const agent = useAgentStore();
    const canvasHydrated = useCanvasStore((state) => state.hydrated);
    const [plan, setPlan] = useState<PlanImage | null>(null);
    const [region, setRegion] = useState<NormalizedRegion | null>(null);
    const [roomType, setRoomType] = useState("客厅");
    const [style, setStyle] = useState("现代极简");
    const [requirements, setRequirements] = useState("");
    const [whitePrompt, setWhitePrompt] = useState<InteriorPromptDraft | null>(null);
    const [whiteModels, setWhiteModels] = useState<ImageCandidate[]>([]);
    const [selectedWhiteId, setSelectedWhiteId] = useState("");
    const [designPrompt, setDesignPrompt] = useState<InteriorPromptDraft | null>(null);
    const [designs, setDesigns] = useState<ImageCandidate[]>([]);
    const [selectedDesignId, setSelectedDesignId] = useState("");
    const [videoPrompt, setVideoPrompt] = useState<InteriorPromptDraft | null>(null);
    const [video, setVideo] = useState<UploadedFile | null>(null);
    const [busy, setBusy] = useState<BusyStage>("");

    const videoModel = effectiveConfig.videoModel || effectiveConfig.model;
    const selectedWhite = whiteModels.find((item) => item.id === selectedWhiteId) || null;
    const selectedDesign = designs.find((item) => item.id === selectedDesignId) || null;
    const currentStep = workflowStep({ plan: Boolean(plan), region: usableRegion(region), whiteModel: Boolean(selectedWhite), design: Boolean(selectedDesign), videoPrompt: Boolean(videoPrompt), video: Boolean(video) });

    const uploadPlan = async (file?: File) => {
        if (!file || !file.type.startsWith("image/")) return message.error("请选择平面图图片");
        setBusy("white-images");
        try {
            const stored = await uploadImage(file);
            setPlan({ id: nanoid(), name: file.name, type: stored.mimeType, dataUrl: stored.url, ...stored });
            resetAfterPlan();
            message.success("平面图已上传，请框选要设计的空间");
        } catch (error) {
            message.error(errorText(error));
        } finally {
            setBusy("");
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const generatePrompt = async (stage: InteriorPromptStage, reference?: ReferenceImage | ImageCandidate | null) => {
        if (!agent.token.trim()) {
            agent.openPanel();
            throw new Error("请先在右侧 Agent 中连接 Canvas Agent，室内提示词由 Codex 生成");
        }
        const imageDataUrl = reference ? await imageToDataUrl(reference) : undefined;
        return requestInteriorPrompt(agent.url.trim().replace(/\/$/, ""), agent.token.trim(), {
            stage,
            roomType,
            style,
            requirements,
            imageDataUrl,
            model: agent.model || undefined,
            effort: agent.reasoningEffort || "high",
        });
    };

    const optimizePrompt = async (stage: InteriorPromptStage) => {
        const reference = stage === "white-model" ? await selectedRegionReference() : stage === "design" ? selectedWhite : selectedDesign;
        if (!reference) return;
        setBusy(stage);
        try {
            const draft = await generatePrompt(stage, reference);
            if (stage === "white-model") setWhitePrompt(draft);
            else if (stage === "design") setDesignPrompt(draft);
            else setVideoPrompt(draft);
            message.success("Codex 提示词已生成，可编辑后继续");
        } catch (error) {
            message.error(errorText(error));
        } finally {
            setBusy("");
        }
    };

    const generateWhiteModels = async () => {
        const reference = await selectedRegionReference();
        if (!reference || !ensureAgent()) return;
        setBusy("white-images");
        try {
            const draft = whitePrompt || (await generatePrompt("white-model", reference));
            setWhitePrompt(draft);
            const results = await requestInteriorImages(agent.url.trim().replace(/\/$/, ""), agent.token.trim(), {
                stage: "white-model",
                roomType,
                style,
                requirements,
                prompt: mergeGenerationPrompt(draft.prompt, draft.negativePrompt),
                imageDataUrl: await imageToDataUrl(reference),
                count: 3,
                model: agent.model || undefined,
                effort: agent.reasoningEffort || "high",
            });
            const stored = await Promise.all(results.map(async (item) => ({ id: nanoid(), ...(await uploadImage(item)) })));
            setWhiteModels(stored);
            setSelectedWhiteId(stored[0]?.id || "");
            setDesignPrompt(null);
            setDesigns([]);
            setSelectedDesignId("");
            setVideoPrompt(null);
            setVideo(null);
            message.success(`已生成 ${stored.length} 个空间白膜，请选择一个`);
        } catch (error) {
            message.error(errorText(error));
        } finally {
            setBusy("");
        }
    };

    const generateDesigns = async () => {
        if (!selectedWhite || !ensureAgent()) return;
        setBusy("design-images");
        try {
            const draft = designPrompt || (await generatePrompt("design", selectedWhite));
            setDesignPrompt(draft);
            const reference = imageCandidateReference(selectedWhite, "选中的空间白膜");
            const results = await requestInteriorImages(agent.url.trim().replace(/\/$/, ""), agent.token.trim(), {
                stage: "design",
                roomType,
                style,
                requirements,
                prompt: mergeGenerationPrompt(draft.prompt, draft.negativePrompt),
                imageDataUrl: await imageToDataUrl(reference),
                count: 3,
                model: agent.model || undefined,
                effort: agent.reasoningEffort || "high",
            });
            const stored = await Promise.all(results.map(async (item) => ({ id: nanoid(), ...(await uploadImage(item)) })));
            setDesigns(stored);
            setSelectedDesignId(stored[0]?.id || "");
            setVideoPrompt(null);
            setVideo(null);
            message.success(`已生成 ${stored.length} 张设计成品图，请选择一个`);
        } catch (error) {
            message.error(errorText(error));
        } finally {
            setBusy("");
        }
    };

    const generateVideo = async () => {
        if (!selectedDesign || !ensureVideoModel(videoModel)) return;
        setBusy("video");
        try {
            const draft = videoPrompt || (await generatePrompt("walkthrough", selectedDesign));
            setVideoPrompt(draft);
            const reference = imageCandidateReference(selectedDesign, "室内设计成品图");
            const result = await requestVideoGeneration({ ...effectiveConfig, model: videoModel, size: "16:9", videoSeconds: effectiveConfig.videoSeconds || "10" }, mergeGenerationPrompt(draft.prompt, draft.negativePrompt), [reference]);
            const stored = await storeGeneratedVideo(result);
            setVideo(stored);
            message.success("室内漫游视频已生成");
        } catch (error) {
            message.error(errorText(error));
        } finally {
            setBusy("");
        }
    };

    const selectedRegionReference = async () => {
        if (!plan) return void message.warning("请先上传平面图");
        if (!usableRegion(region)) return void message.warning("请在平面图上框选一个空间，或点击使用整张平面图");
        const cropped = await cropReference(plan, region!);
        return imageCandidateReference({ id: cropped.storageKey, ...cropped }, `${roomType}平面图选区`);
    };

    const ensureAgent = () => {
        if (agent.token.trim()) return true;
        agent.openPanel();
        message.warning("请先连接 Canvas Agent，白膜与成品图由 Codex ImageGen 生成");
        return false;
    };

    const ensureVideoModel = (model: string) => {
        if (isAiConfigReady(effectiveConfig, model)) return true;
        message.warning("请先配置视频模型");
        openConfigDialog(true);
        return false;
    };

    const saveImageAsset = (image: ImageCandidate, title: string, stage: string) => {
        addAsset({
            kind: "image",
            title,
            coverUrl: image.url,
            tags: ["室内设计", roomType, style],
            source: "室内设计工作台",
            data: { dataUrl: image.url, storageKey: image.storageKey, width: image.width, height: image.height, bytes: image.bytes, mimeType: image.mimeType },
            metadata: { source: "interior-design", stage, roomType, style },
        });
        message.success("已加入我的资产");
    };

    const createCanvasWorkflow = async () => {
        if (!plan) return message.warning("请先上传平面图");
        if (!usableRegion(region)) return message.warning("请先框选要设计的空间");
        setBusy("canvas");
        try {
            const regionImage = await cropReference(plan, region!);
            const workflow = buildInteriorCanvasWorkflow({
                plan,
                regionImage,
                region: region!,
                roomType,
                style,
                requirements,
                videoModel,
                videoSize: "16:9",
                videoSeconds: effectiveConfig.videoSeconds || "10",
                whitePrompt: whitePrompt ? { title: whitePrompt.title, text: mergeGenerationPrompt(whitePrompt.prompt, whitePrompt.negativePrompt), summary: whitePrompt.summary, negativePrompt: whitePrompt.negativePrompt } : undefined,
                designPrompt: designPrompt ? { title: designPrompt.title, text: mergeGenerationPrompt(designPrompt.prompt, designPrompt.negativePrompt), summary: designPrompt.summary, negativePrompt: designPrompt.negativePrompt } : undefined,
                walkthroughPrompt: videoPrompt ? { title: videoPrompt.title, text: mergeGenerationPrompt(videoPrompt.prompt, videoPrompt.negativePrompt), summary: videoPrompt.summary, negativePrompt: videoPrompt.negativePrompt } : undefined,
                whiteCandidates: whiteModels,
                selectedWhiteId,
                designCandidates: designs,
                selectedDesignId,
                video,
            });
            const store = useCanvasStore.getState();
            const projectId = store.createProject(`${style}${roomType} · 室内设计`);
            store.updateProject(projectId, workflow);
            message.success("室内设计工作流已创建，正在进入无限画布");
            navigate(`/canvas/${projectId}`);
        } catch (error) {
            message.error(errorText(error));
        } finally {
            setBusy("");
        }
    };

    const resetAfterRegion = () => {
        setWhitePrompt(null);
        setWhiteModels([]);
        setSelectedWhiteId("");
        setDesignPrompt(null);
        setDesigns([]);
        setSelectedDesignId("");
        setVideoPrompt(null);
        setVideo(null);
    };
    const resetAfterPlan = () => {
        setRegion(null);
        resetAfterRegion();
    };

    return (
        <main className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-5 text-foreground lg:px-6">
            <div className="mx-auto max-w-[1500px] space-y-5">
                <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <ScanLine className="size-4" />
                            室内设计分支
                        </div>
                        <h1 className="page-title">平面图到漫游视频</h1>
                        <p className="mt-2 text-sm text-muted-foreground">框选空间，由 Codex 编写提示词并调用 ImageGen 生成白膜和成品图，再调用视频 API 生成连续漫游视频。</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <Tag color={agent.connected ? "green" : "default"}>Codex {agent.connected ? "已连接" : "未连接"}</Tag>
                        <Tag>生图：Codex ImageGen</Tag>
                        <Tag>视频：{modelOptionLabel(effectiveConfig, videoModel)}</Tag>
                    </div>
                </header>

                <Card size="small" className="overflow-x-auto">
                    <Steps current={currentStep} responsive={false} items={["上传平面图", "选择空间", "选择白膜", "选择成品图", "漫游提示词", "漫游视频"].map((title) => ({ title }))} />
                </Card>

                <Alert
                    type="success"
                    showIcon
                    title="推荐在无限画布完成整个室内设计流程"
                    description="创建后会自动铺好 8 个节点：三个 Codex 提示词节点、两个 Codex ImageGen 节点和一个视频 API 节点。白膜与成品候选可展开并选择主图，下游会自动使用当前主图。"
                    action={
                        <Button
                            type="primary"
                            icon={busy === "canvas" ? <LoaderCircle className="size-4 animate-spin" /> : <Workflow className="size-4" />}
                            disabled={!canvasHydrated || !plan || !usableRegion(region) || Boolean(busy)}
                            onClick={() => void createCanvasWorkflow()}
                        >
                            创建无限画布工作流
                        </Button>
                    }
                />

                <div className="grid gap-4 xl:grid-cols-[minmax(420px,1.15fr)_minmax(360px,.85fr)]">
                    <section className="space-y-4">
                        <WorkflowCard number={1} title="上传平面图并选择空间" ready={Boolean(plan && usableRegion(region))}>
                            {!plan ? (
                                <button
                                    type="button"
                                    className="flex min-h-80 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground transition hover:bg-muted/60"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="mb-3 size-8" />
                                    <span className="font-medium text-foreground">上传 JPG、PNG 或 WebP 平面图</span>
                                    <span className="mt-1 text-xs">上传后拖拽框选需要生成的房间</span>
                                </button>
                            ) : (
                                <>
                                    <RegionSelector
                                        image={plan.dataUrl}
                                        region={region}
                                        onChange={(value) => {
                                            setRegion(value);
                                            resetAfterRegion();
                                        }}
                                    />
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Button onClick={() => fileInputRef.current?.click()} icon={<Upload className="size-4" />}>
                                            更换平面图
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setRegion({ x: 0, y: 0, width: 1, height: 1 });
                                                resetAfterRegion();
                                            }}
                                        >
                                            使用整张图
                                        </Button>
                                        <span className="self-center text-xs text-muted-foreground">蓝框区域将作为空间结构依据</span>
                                    </div>
                                </>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => void uploadPlan(event.target.files?.[0])} />
                        </WorkflowCard>

                        <WorkflowCard number={2} title="生成并选择空间白膜" ready={Boolean(selectedWhite)}>
                            <PromptEditor draft={whitePrompt} onChange={setWhitePrompt} onOptimize={() => void optimizePrompt("white-model")} optimizing={busy === "white-model"} disabled={!usableRegion(region)} />
                            <div className="mt-3">
                                <Button
                                    type="primary"
                                    icon={busy === "white-images" ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                                    disabled={!usableRegion(region) || Boolean(busy)}
                                    onClick={() => void generateWhiteModels()}
                                >
                                    生成 3 个白膜
                                </Button>
                            </div>
                            <CandidateGrid
                                items={whiteModels}
                                selectedId={selectedWhiteId}
                                onSelect={(id) => {
                                    setSelectedWhiteId(id);
                                    setDesignPrompt(null);
                                    setDesigns([]);
                                    setSelectedDesignId("");
                                }}
                                onSave={(item) => saveImageAsset(item, `${roomType}空间白膜`, "white-model")}
                            />
                        </WorkflowCard>

                        <WorkflowCard number={3} title="生成并选择室内设计成品图" ready={Boolean(selectedDesign)}>
                            <PromptEditor draft={designPrompt} onChange={setDesignPrompt} onOptimize={() => void optimizePrompt("design")} optimizing={busy === "design"} disabled={!selectedWhite} />
                            <div className="mt-3">
                                <Button type="primary" icon={busy === "design-images" ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} disabled={!selectedWhite || Boolean(busy)} onClick={() => void generateDesigns()}>
                                    生成 3 张设计图
                                </Button>
                            </div>
                            <CandidateGrid
                                items={designs}
                                selectedId={selectedDesignId}
                                onSelect={(id) => {
                                    setSelectedDesignId(id);
                                    setVideoPrompt(null);
                                    setVideo(null);
                                }}
                                onSave={(item) => saveImageAsset(item, `${style}${roomType}成品图`, "design")}
                            />
                        </WorkflowCard>
                    </section>

                    <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
                        <Card title="项目设定" size="small">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <label className="space-y-1.5 text-sm">
                                    <span>空间类型</span>
                                    <Select
                                        className="w-full"
                                        value={roomType}
                                        options={roomOptions.map((value) => ({ value, label: value }))}
                                        onChange={(value) => {
                                            setRoomType(value);
                                            resetAfterRegion();
                                        }}
                                    />
                                </label>
                                <label className="space-y-1.5 text-sm">
                                    <span>设计风格</span>
                                    <Select
                                        className="w-full"
                                        value={style}
                                        options={styleOptions.map((value) => ({ value, label: value }))}
                                        onChange={(value) => {
                                            setStyle(value);
                                            resetAfterRegion();
                                        }}
                                    />
                                </label>
                            </div>
                            <label className="mt-4 block space-y-1.5 text-sm">
                                <span>需求与限制</span>
                                <Input.TextArea
                                    value={requirements}
                                    autoSize={{ minRows: 3, maxRows: 7 }}
                                    placeholder="例如：保留南侧落地窗、两人居住、隐藏收纳、暖色无主灯、预算中等…"
                                    onChange={(event) => {
                                        setRequirements(event.target.value);
                                        resetAfterRegion();
                                    }}
                                />
                            </label>
                        </Card>

                        <WorkflowCard number={4} title="Codex 生成漫游视频提示词" ready={Boolean(videoPrompt)}>
                            <PromptEditor draft={videoPrompt} onChange={setVideoPrompt} onOptimize={() => void optimizePrompt("walkthrough")} optimizing={busy === "walkthrough"} disabled={!selectedDesign} />
                            {videoPrompt ? <Alert className="mt-3" type="info" showIcon title={videoPrompt.summary} /> : null}
                        </WorkflowCard>

                        <WorkflowCard number={5} title="生成室内漫游视频" ready={Boolean(video)}>
                            {!video ? (
                                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                                    <Film className="mx-auto mb-3 size-8" />
                                    选择成品图后，Codex 会编写连续漫游镜头提示词，再调用视频 API。
                                </div>
                            ) : (
                                <video src={video.url} controls className="aspect-video w-full rounded-xl bg-black object-contain" />
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button type="primary" icon={busy === "video" ? <LoaderCircle className="size-4 animate-spin" /> : <Film className="size-4" />} disabled={!selectedDesign || Boolean(busy)} onClick={() => void generateVideo()}>
                                    {video ? "重新生成视频" : "生成漫游视频"}
                                </Button>
                                {video ? (
                                    <Button icon={<Download className="size-4" />} onClick={() => saveAs(video.url, `${roomType}-室内漫游.mp4`)}>
                                        下载
                                    </Button>
                                ) : null}
                                {video ? (
                                    <Button
                                        icon={<Save className="size-4" />}
                                        onClick={() => {
                                            addAsset({
                                                kind: "video",
                                                title: `${style}${roomType}漫游`,
                                                coverUrl: selectedDesign?.url || "",
                                                tags: ["室内设计", roomType, style],
                                                source: "室内设计工作台",
                                                data: { url: video.url, storageKey: video.storageKey, width: video.width || 1280, height: video.height || 720, bytes: video.bytes, mimeType: video.mimeType },
                                                metadata: { source: "interior-design", stage: "walkthrough", prompt: videoPrompt?.prompt },
                                            });
                                            message.success("视频已加入我的资产");
                                        }}
                                    >
                                        加入资产
                                    </Button>
                                ) : null}
                            </div>
                        </WorkflowCard>
                    </aside>
                </div>
            </div>
        </main>
    );
}

function WorkflowCard({ number, title, ready, children }: { number: number; title: string; ready: boolean; children: ReactNode }) {
    return (
        <Card
            size="small"
            title={
                <div className="flex items-center gap-2">
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs", ready ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>{ready ? <Check className="size-3.5" /> : number}</span>
                    <span>{title}</span>
                </div>
            }
        >
            {children}
        </Card>
    );
}

function PromptEditor({ draft, onChange, onOptimize, optimizing, disabled }: { draft: InteriorPromptDraft | null; onChange: (draft: InteriorPromptDraft | null) => void; onOptimize: () => void; optimizing: boolean; disabled: boolean }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">生成提示词，可在调用模型前修改</span>
                <Button size="small" icon={optimizing ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} disabled={disabled || optimizing} onClick={onOptimize}>
                    Codex 生成提示词
                </Button>
            </div>
            <Input.TextArea
                value={draft?.prompt || ""}
                autoSize={{ minRows: 3, maxRows: 8 }}
                placeholder="留空时，点击生成会先自动调用 Codex…"
                onChange={(event) => onChange({ title: draft?.title || "自定义提示词", prompt: event.target.value, negativePrompt: draft?.negativePrompt || "", summary: draft?.summary || "已手动编辑" })}
            />
            {draft ? <Input.TextArea value={draft.negativePrompt} autoSize={{ minRows: 1, maxRows: 4 }} placeholder="负面提示词" onChange={(event) => onChange({ ...draft, negativePrompt: event.target.value })} /> : null}
        </div>
    );
}

function CandidateGrid({ items, selectedId, onSelect, onSave }: { items: ImageCandidate[]; selectedId: string; onSelect: (id: string) => void; onSave: (item: ImageCandidate) => void }) {
    if (!items.length) return null;
    return (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {items.map((item, index) => (
                <div key={item.id} className={cn("group relative overflow-hidden rounded-xl border-2 bg-muted/20 transition", selectedId === item.id ? "border-primary" : "border-transparent hover:border-border")}>
                    <button type="button" className="block w-full" aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)}>
                        <img src={item.url} alt={`候选方案 ${index + 1}`} className="aspect-video w-full object-cover" />
                        <span className="absolute left-2 top-2 rounded bg-black/65 px-2 py-1 text-xs text-white">方案 {index + 1}</span>
                        {selectedId === item.id ? (
                            <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="size-4" />
                            </span>
                        ) : null}
                    </button>
                    <div className="flex items-center justify-end gap-1 p-1.5">
                        <Tooltip title="加入资产">
                            <Button type="text" size="small" icon={<Save className="size-3.5" />} onClick={() => onSave(item)} />
                        </Tooltip>
                        <Tooltip title="下载">
                            <Button type="text" size="small" icon={<Download className="size-3.5" />} onClick={() => saveAs(item.url, `interior-${index + 1}.png`)} />
                        </Tooltip>
                    </div>
                </div>
            ))}
        </div>
    );
}

function RegionSelector({ image, region, onChange }: { image: string; region: NormalizedRegion | null; onChange: (region: NormalizedRegion) => void }) {
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [draft, setDraft] = useState<NormalizedRegion | null>(null);
    const active = draft || region;
    const point = (event: PointerEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    };
    return (
        <div
            className="relative cursor-crosshair touch-none select-none overflow-hidden rounded-xl bg-muted"
            onPointerDown={(event) => {
                const start = point(event);
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragStart(start);
                setDraft({ x: start.x, y: start.y, width: 0, height: 0 });
            }}
            onPointerMove={(event) => {
                if (!dragStart) return;
                const end = point(event);
                setDraft(normalizeRegion(dragStart.x, dragStart.y, end.x, end.y));
            }}
            onPointerUp={(event) => {
                if (!dragStart) return;
                const next = normalizeRegion(dragStart.x, dragStart.y, point(event).x, point(event).y);
                setDragStart(null);
                setDraft(null);
                if (usableRegion(next)) onChange(next);
            }}
        >
            <img src={image} alt="待选择区域的平面图" draggable={false} className="block h-auto w-full" />
            <div className="pointer-events-none absolute inset-0 bg-black/20" />
            {active ? (
                <div
                    className="pointer-events-none absolute border-2 border-sky-400 bg-sky-400/15 shadow-[0_0_0_9999px_rgba(0,0,0,.22)]"
                    style={{ left: `${active.x * 100}%`, top: `${active.y * 100}%`, width: `${active.width * 100}%`, height: `${active.height * 100}%` }}
                >
                    <span className="absolute -top-7 left-0 rounded bg-sky-500 px-2 py-1 text-xs text-white">选择区域</span>
                </div>
            ) : null}
        </div>
    );
}

function imageCandidateReference(image: Pick<ImageCandidate, "id" | "url" | "storageKey" | "mimeType">, name: string): ReferenceImage {
    return { id: image.id, name, type: image.mimeType, dataUrl: image.url, storageKey: image.storageKey };
}

async function cropReference(reference: ReferenceImage, region: NormalizedRegion) {
    const source = await imageToDataUrl(reference);
    if (!source) throw new Error("平面图读取失败");
    const image = await loadImage(source);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * region.width));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * region.height));
    canvas.getContext("2d")?.drawImage(image, image.naturalWidth * region.x, image.naturalHeight * region.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    return uploadImage(canvas.toDataURL("image/png"));
}

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("平面图读取失败"));
        image.src = src;
    });
}

function errorText(error: unknown) {
    return error instanceof Error ? error.message : "操作失败，请稍后重试";
}
