import { expect, it } from "vitest";
import { personalPromptOptions } from "./personal-prompt-options";
import type { RuntimePromptLibrary } from "./domain";

it("orders personal runtime prompts with image-feedback preference signals", () => {
    const runtime: RuntimePromptLibrary = {
        version: 1,
        generatedAt: "",
        terms: [],
        recipes: [],
        prompts: [
            { id: "a", title: "极简室内", content: "minimal interior", sourceCaptureIds: ["c"], reviewState: "human_approved", createdAt: "1", updatedAt: "1" },
            { id: "b", title: "电影感室内", content: "cinematic interior", sourceCaptureIds: ["c"], reviewState: "human_approved", createdAt: "2", updatedAt: "2" },
            { id: "c", title: "废弃风格室内", content: "discarded interior", sourceCaptureIds: ["c"], reviewState: "human_approved", createdAt: "3", updatedAt: "3" },
        ],
    };
    const base = { comment: "", hidden: false, createdAt: "", updatedAt: "" };
    const options = personalPromptOptions(runtime, {
        preferred: { ...base, id: "preferred", rating: 5, style: "电影感" },
        reduced: { ...base, id: "reduced", rating: 1, style: "极简" },
        removed: { ...base, id: "removed", hidden: true, style: "废弃风格" },
    });
    expect(options.map((item) => item.title)).toEqual(["电影感室内", "极简室内", "废弃风格室内"]);
});
