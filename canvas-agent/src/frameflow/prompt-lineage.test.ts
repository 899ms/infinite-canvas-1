import assert from "node:assert/strict";
import test from "node:test";

import { promptLineage } from "./prompt-lineage.js";
import { emptyProjection } from "./reducer.js";
import type { AgentDecision, PromptVersion } from "./types.js";

const createdAt = "2026-08-28T00:00:00.000Z";
const fields = { subject: [], composition: [], color: [], lighting: [], material: [], layout: [], mood: [], rendering: [], technical: [], negative: [] };

function prompt(id: string, overrides: Partial<PromptVersion> = {}): PromptVersion {
    return {
        id,
        briefId: "brief-1",
        revision: 1,
        status: "approved",
        fields,
        compiledPrompt: `${id} prompt`,
        diff: { keep: [], add: [], change: [], remove: [], avoid: [] },
        referenceImageIds: [],
        locks: {},
        reason: "test",
        createdAt,
        ...overrides,
    };
}

test("Prompt 血缘按父版本顺序返回并仅关联命中的决策快照", () => {
    const projection = emptyProjection();
    const first = prompt("prompt-1");
    const second = prompt("prompt-2", { parentId: first.id, revision: 2, decisionId: "decision-2" });
    const decision: AgentDecision = {
        id: "decision-2",
        briefId: first.briefId,
        promptVersionId: second.id,
        profileId: "profile-1",
        summary: "沿用柔光。",
        evidence: [],
        createdAt,
    };
    projection.prompts[first.id] = first;
    projection.prompts[second.id] = second;
    projection.decisions[decision.id] = decision;

    const result = promptLineage(projection, second.id);

    assert.deepEqual(result.versions.map((item) => item.id), [first.id, second.id]);
    assert.deepEqual(result.decisions, [decision]);
    result.versions[0]!.fields.subject.push("不应写回投影");
    assert.deepEqual(projection.prompts[first.id]!.fields.subject, []);
});
