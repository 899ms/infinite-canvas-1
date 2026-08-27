import { expect, it } from "vitest";
import { compilePrompt, getTemplateVariables } from "./compiler";

it("uses a supplied value for every repeated PromptFill variable", () => {
    expect(compilePrompt("{{subject: 猫}}，{{subject: 猫}}，{{light: 柔光}}", { subject: "柴犬" })).toBe("柴犬，柴犬，柔光");
    expect(getTemplateVariables("{{subject: 猫}} {{subject}}")).toMatchObject([{ key: "subject", occurrences: 2 }]);
});
