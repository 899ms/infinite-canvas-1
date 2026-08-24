import { useEffect, useMemo, useState } from "react";
import { Button, Empty, Input, Modal } from "antd";
import { Check, Image as ImageIcon, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAssetStore, type ImageAsset } from "@/stores/use-asset-store";

const MAX_REFERENCES = 4;

export function ReferenceAssetPicker({
    open,
    selectedIds,
    onConfirm,
    onClose,
}: {
    open: boolean;
    selectedIds: string[];
    onConfirm: (assets: ImageAsset[]) => void;
    onClose: () => void;
}) {
    const assets = useAssetStore((state) => state.assets);
    const hydrated = useAssetStore((state) => state.hydrated);
    const images = useMemo(() => assets.filter((asset): asset is ImageAsset => asset.kind === "image"), [assets]);
    const [keyword, setKeyword] = useState("");
    const [draftIds, setDraftIds] = useState<string[]>(selectedIds);

    useEffect(() => {
        if (!open) return;
        setDraftIds(selectedIds);
        setKeyword("");
    }, [open, selectedIds]);

    const visible = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return images.filter((asset) => !query || [asset.title, ...asset.tags].join(" ").toLowerCase().includes(query));
    }, [images, keyword]);

    const toggle = (id: string) => {
        setDraftIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < MAX_REFERENCES ? [...current, id] : current);
    };

    return (
        <Modal
            title="选择 FrameFlow 参考图"
            open={open}
            onCancel={onClose}
            width={860}
            destroyOnHidden
            footer={[
                <Button key="cancel" onClick={onClose}>取消</Button>,
                <Button
                    key="confirm"
                    type="primary"
                    disabled={!draftIds.length}
                    className="active:!scale-[.96] !transition-transform"
                    onClick={() => onConfirm(draftIds.flatMap((id) => {
                        const asset = images.find((item) => item.id === id);
                        return asset ? [asset] : [];
                    }))}
                >
                    使用 {draftIds.length} 张参考图
                </Button>,
            ]}
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    allowClear
                    prefix={<Search className="size-4 text-muted-foreground" strokeWidth={1.5} />}
                    placeholder="搜索图片名称或标签"
                    className="max-w-sm"
                />
                <span className="text-xs text-muted-foreground">最多选择 {MAX_REFERENCES} 张 · {draftIds.length}/{MAX_REFERENCES}</span>
            </div>
            {hydrated && visible.length ? (
                <div className="grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto p-0.5 sm:grid-cols-3 lg:grid-cols-4">
                    {visible.map((asset) => {
                        const selected = draftIds.includes(asset.id);
                        const disabled = !selected && draftIds.length >= MAX_REFERENCES;
                        return (
                            <button
                                key={asset.id}
                                type="button"
                                aria-pressed={selected}
                                disabled={disabled}
                                onClick={() => toggle(asset.id)}
                                className={cn(
                                    "group relative overflow-hidden rounded-xl bg-card text-left shadow-card ring-1 transition-[box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[.96]",
                                    selected ? "ring-2 ring-primary" : "ring-border hover:shadow-card-hover",
                                    disabled && "cursor-not-allowed opacity-45",
                                )}
                            >
                                <img src={asset.coverUrl || asset.data.dataUrl} alt={asset.title} className="aspect-[4/3] w-full object-cover ring-1 ring-inset ring-black/10 dark:ring-white/10" />
                                <div className="p-2.5">
                                    <div className="line-clamp-1 text-xs font-medium">{asset.title}</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">{asset.data.width} × {asset.data.height}</div>
                                </div>
                                {selected ? (
                                    <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-card" aria-hidden="true">
                                        <Check className="size-3.5" strokeWidth={2} />
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <Empty
                    className="py-20"
                    image={<ImageIcon className="mx-auto size-12 text-muted-foreground" strokeWidth={1.5} />}
                    description={!hydrated ? "正在读取我的资产…" : images.length ? "没有匹配的图片，请调整搜索词" : "我的资产里还没有图片，请先到“我的资产”导入"}
                />
            )}
        </Modal>
    );
}
