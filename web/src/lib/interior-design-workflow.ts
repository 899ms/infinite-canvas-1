export type NormalizedRegion = { x: number; y: number; width: number; height: number };

export function normalizeRegion(startX: number, startY: number, endX: number, endY: number): NormalizedRegion {
    const left = clamp(Math.min(startX, endX));
    const top = clamp(Math.min(startY, endY));
    const right = clamp(Math.max(startX, endX));
    const bottom = clamp(Math.max(startY, endY));
    return { x: left, y: top, width: right - left, height: bottom - top };
}

export function usableRegion(region?: NormalizedRegion | null) {
    return Boolean(region && region.width >= 0.03 && region.height >= 0.03);
}

export function mergeGenerationPrompt(prompt: string, negativePrompt: string) {
    const positive = prompt.trim();
    const negative = negativePrompt.trim();
    return negative ? `${positive}\n\nAvoid: ${negative}` : positive;
}

export function workflowStep(options: { plan: boolean; region: boolean; whiteModel: boolean; design: boolean; videoPrompt: boolean; video: boolean }) {
    if (options.video) return 5;
    if (options.videoPrompt || options.design) return 4;
    if (options.whiteModel) return 3;
    if (options.region) return 2;
    return options.plan ? 1 : 0;
}

function clamp(value: number) {
    return Math.max(0, Math.min(1, value));
}
