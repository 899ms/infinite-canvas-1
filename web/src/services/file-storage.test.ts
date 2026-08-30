import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ stores: new Map<string, Map<string, unknown>>() }));

vi.mock("localforage", () => ({
    default: {
        createInstance: ({ storeName }: { storeName: string }) => {
            const values = mocked.stores.get(storeName) || new Map<string, unknown>();
            mocked.stores.set(storeName, values);
            return {
                getItem: async <T>(key: string) => (values.get(key) as T | null) || null,
                setItem: async <T>(key: string, value: T) => (values.set(key, value), value),
                removeItem: async (key: string) => values.delete(key),
                iterate: async <T>(callback: (value: T, key: string) => void) => {
                    for (const [key, value] of values) callback(value as T, key);
                },
            };
        },
    },
}));

import { cleanupUnusedMedia, getMediaBlob, setMediaBlob } from "./file-storage";

describe("媒体历史引用回收", () => {
    beforeEach(() => mocked.stores.forEach((values) => values.clear()));

    it("图片和视频生成记录都会保留引用媒体，仅回收孤立文件", async () => {
        const imageHistory = mocked.stores.get("image_generation_logs")!;
        const videoHistory = mocked.stores.get("video_generation_logs")!;
        await Promise.all([setMediaBlob("video:from-image-history", new Blob(["image-history"])), setMediaBlob("video:from-video-history", new Blob(["video-history"])), setMediaBlob("video:orphan", new Blob(["orphan"]))]);
        imageHistory.set("image-log", { result: { storageKey: "video:from-image-history" } });
        videoHistory.set("video-log", { references: [{ storageKey: "video:from-video-history" }] });

        await cleanupUnusedMedia({ assets: [], projects: [] });

        expect(await getMediaBlob("video:from-image-history")).toBeInstanceOf(Blob);
        expect(await getMediaBlob("video:from-video-history")).toBeInstanceOf(Blob);
        expect(await getMediaBlob("video:orphan")).toBeNull();

        imageHistory.clear();
        videoHistory.clear();
        await cleanupUnusedMedia({ assets: [], projects: [] });
        expect(await getMediaBlob("video:from-image-history")).toBeNull();
        expect(await getMediaBlob("video:from-video-history")).toBeNull();
    });
});
