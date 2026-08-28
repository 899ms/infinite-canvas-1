import { describe, expect, it } from "vitest";

import { DEFAULT_PROMPT_SOURCES } from "@/services/api/prompt-source-presets";
import { mergePromptSourceStore } from "./use-prompt-source-store";

describe("prompt source persistence", () => {
    it("keeps the retired Freestylefly built-in source as a removable custom source", () => {
        const merged = mergePromptSourceStore(
            {
                sources: [
                    {
                        id: "freestylefly-gpt-image-2",
                        name: "Freestylefly GPT Image 2",
                        url: "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/freestylefly-gpt-image-2.json",
                        homepage: "https://github.com/freestylefly/awesome-gpt-image-2",
                        enabled: false,
                        builtIn: true,
                    },
                ],
                schedule: { intervalMinutes: 60, lastFetchedAt: "2026-08-28T00:00:00.000Z" },
            },
            { sources: DEFAULT_PROMPT_SOURCES, schedule: { intervalMinutes: 30, lastFetchedAt: "" } },
        );

        expect(merged.sources).toHaveLength(7);
        expect(merged.sources.find((source) => source.id === "freestylefly-gpt-image-2")).toMatchObject({ builtIn: false, enabled: false, name: "Freestylefly GPT Image 2" });
        expect(merged.schedule).toEqual({ intervalMinutes: 60, lastFetchedAt: "2026-08-28T00:00:00.000Z" });
    });
});
