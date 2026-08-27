import localforage from "localforage";
import { create } from "zustand";

import type { FeedbackMap, Rating } from "@/lib/image-feedback";
import { persistBeforeCommit } from "@/lib/persisted-state";

const store = localforage.createInstance({ name: "infinite-canvas", storeName: "image_feedback" });
const key = "image-feedback:v1";
type Store = {
    hydrated: boolean;
    feedback: FeedbackMap;
    error?: string;
    hydrate: () => Promise<void>;
    replace: (feedback: FeedbackMap) => Promise<void>;
    setFeedback: (assetId: string, patch: Partial<Omit<import("@/lib/image-feedback").ImageFeedback, "id" | "assetId" | "createdAt" | "updatedAt">>) => Promise<void>;
    removeFeedback: (assetId: string) => Promise<void>;
};

export const useImageFeedbackStore = create<Store>((set, get) => ({
    hydrated: false,
    feedback: {},
    hydrate: async () => { try { set({ feedback: (await store.getItem<FeedbackMap>(key)) || {}, hydrated: true, error: undefined }); } catch (reason) { set({ hydrated: true, error: reason instanceof Error ? reason.message : "图片反馈读取失败；原数据未被覆盖" }); } },
    replace: async (feedback) => persist(feedback, set),
    setFeedback: async (assetId, patch) => {
        const current = get().feedback[assetId];
        const timestamp = new Date().toISOString();
        const feedback = { ...get().feedback, [assetId]: { ...current, id: current?.id || `feedback_${crypto.randomUUID()}`, assetId, comment: patch.comment ?? current?.comment ?? "", hidden: patch.hidden ?? current?.hidden ?? false, rating: patch.rating ?? current?.rating, promptSnapshot: patch.promptSnapshot ?? current?.promptSnapshot, style: patch.style ?? current?.style, scene: patch.scene ?? current?.scene, canvasId: patch.canvasId ?? current?.canvasId, canvasNodeId: patch.canvasNodeId ?? current?.canvasNodeId, createdAt: current?.createdAt || timestamp, updatedAt: timestamp } };
        await persist(feedback, set);
    },
    removeFeedback: async (assetId) => {
        const feedback = { ...get().feedback };
        delete feedback[assetId];
        await persist(feedback, set);
    },
}));

async function persist(feedback: FeedbackMap, set: (next: Partial<Store>) => void) {
    try { await persistBeforeCommit(feedback, (value) => store.setItem(key, value), (saved) => set({ feedback: saved, error: undefined })); }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : "图片反馈保存失败" }); throw reason; }
}
