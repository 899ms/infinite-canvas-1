import { getImageBlob } from "@/services/image-storage";
import type { ImageAsset } from "@/stores/use-asset-store";

const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;

export function frameFlowReferenceIdempotencyKey(asset: Pick<ImageAsset, "id" | "updatedAt">) {
    return `reference:${asset.id}:${asset.updatedAt}`;
}

export async function imageAssetToFrameFlowPng(asset: ImageAsset) {
    let source: Blob | null = asset.data.storageKey ? await getImageBlob(asset.data.storageKey) : null;
    if (!source) source = await fetch(asset.data.dataUrl || asset.coverUrl).then((response) => {
        if (!response.ok) throw new Error("无法读取所选资产图片");
        return response.blob();
    });
    if (!source) throw new Error("所选资产图片内容不存在");
    const png = source.type === "image/png" ? source : await rasterToPng(source);
    if (png.size > MAX_REFERENCE_BYTES) throw new Error(`参考图“${asset.title}”转换后超过 20MB`);
    return png;
}

async function rasterToPng(source: Blob) {
    const bitmap = await createImageBitmap(source);
    try {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("浏览器无法创建参考图转换画布");
        context.drawImage(bitmap, 0, 0);
        const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("参考图转换为 PNG 失败")), "image/png"));
        return png;
    } finally {
        bitmap.close();
    }
}
