export type Rating = 1 | 2 | 3 | 4 | 5;
export type ImageFeedback = { id: string; assetId?: string; canvasId?: string; canvasNodeId?: string; promptSnapshot?: string; style?: string; scene?: string; rating?: Rating; comment: string; hidden: boolean; createdAt: string; updatedAt: string };
export type FeedbackMap = Record<string, ImageFeedback>;
export type PreferenceSignal = { label: string; score: number };

export function feedbackLabel(feedback?: ImageFeedback) { if (feedback?.hidden) return "强负反馈"; if (feedback?.rating === 5) return "强化"; if (feedback?.rating === 4) return "继续变体"; if (feedback?.rating === 1 || feedback?.rating === 2) return "降权"; return feedback?.rating === 3 ? "中性观察" : "待评价"; }
export function feedbackWeight(feedback?: ImageFeedback) { if (feedback?.hidden) return -4; return feedback?.rating === 5 ? 3 : feedback?.rating === 4 ? 2 : feedback?.rating === 2 ? -1 : feedback?.rating === 1 ? -2 : 0; }
export function preferenceSignals(feedback: FeedbackMap): { styles: PreferenceSignal[]; scenes: PreferenceSignal[] } {
    const aggregate = (kind: "style" | "scene") => Object.values(feedback).reduce((map, item) => { const label = item[kind]; const weight = feedbackWeight(item); if (label && weight) map.set(label, (map.get(label) || 0) + weight); return map; }, new Map<string, number>());
    const sort = (values: Map<string, number>) => [...values.entries()].map(([label, score]) => ({ label, score })).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    return { styles: sort(aggregate("style")), scenes: sort(aggregate("scene")) };
}
