import { describe, expect, it } from "vitest";

import { DEFAULT_PROMPT_SOURCES, PROMPT_REGISTRY_HOMEPAGE } from "./prompt-source-presets";

describe("default prompt sources", () => {
    it("keeps the six Image Prompts registry sources in the documented order", () => {
        expect(PROMPT_REGISTRY_HOMEPAGE).toBe("https://github.com/yukkcat/image-prompts");
        expect(DEFAULT_PROMPT_SOURCES.map((source) => ({ id: source.id, enabled: source.enabled, builtIn: source.builtIn, url: source.url }))).toEqual([
            { id: "banana-prompt-quicker", enabled: true, builtIn: true, url: "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/banana-prompt-quicker.json" },
            { id: "davidwu-gpt-image2-prompts", enabled: true, builtIn: true, url: "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/davidwu-gpt-image2-prompts.json" },
            { id: "awesome-gpt-image", enabled: true, builtIn: true, url: "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/awesome-gpt-image.json" },
            { id: "awesome-gpt4o-image-prompts", enabled: true, builtIn: true, url: "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/awesome-gpt4o-image-prompts.json" },
            { id: "youmind-gpt-image-2", enabled: true, builtIn: true, url: "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/youmind-gpt-image-2.json" },
            { id: "youmind-nano-banana-pro", enabled: true, builtIn: true, url: "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources/youmind-nano-banana-pro.json" },
        ]);
    });
});
