import { describe, expect, it } from "vitest";

import { mergeGenerationPrompt, normalizeRegion, usableRegion, workflowStep } from "./interior-design-workflow";

describe("interior design workflow", () => {
    it("normalizes reverse drags and clamps coordinates", () => {
        expect(normalizeRegion(0.9, 1.2, -0.1, 0.2)).toEqual({ x: 0, y: 0.2, width: 0.9, height: 0.8 });
    });

    it("rejects accidental tiny selections", () => {
        expect(usableRegion({ x: 0, y: 0, width: 0.02, height: 0.5 })).toBe(false);
        expect(usableRegion({ x: 0, y: 0, width: 0.3, height: 0.5 })).toBe(true);
    });

    it("builds a negative prompt and reports the current step", () => {
        expect(mergeGenerationPrompt("room", "distortion")).toBe("room\n\nAvoid: distortion");
        expect(workflowStep({ plan: true, region: true, whiteModel: true, design: false, videoPrompt: false, video: false })).toBe(3);
    });
});
