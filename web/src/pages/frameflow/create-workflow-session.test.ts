import { describe, expect, it } from "vitest";

import { clearFrameFlowCreateWorkflow, readFrameFlowCreateWorkflow, writeFrameFlowCreateWorkflow } from "./create-workflow-session";

function memoryStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
    };
}

describe("FrameFlow create workflow session", () => {
    it("restores an unfinished prompt only for the same Agent endpoint", () => {
        const storage = memoryStorage();
        const workflow = { endpoint: "http://127.0.0.1:17371", workflowKey: "workflow-1", briefId: "brief-1", promptVersionId: "prompt-1", count: 1 };

        writeFrameFlowCreateWorkflow(storage, workflow);

        expect(readFrameFlowCreateWorkflow(storage, workflow.endpoint)).toEqual(workflow);
        expect(readFrameFlowCreateWorkflow(storage, "http://127.0.0.1:17372")).toBeNull();
    });

    it("rejects corrupt or unsafe workflow state", () => {
        const storage = memoryStorage();
        storage.setItem("frameflow:create-workflow:v1", JSON.stringify({ endpoint: "agent", workflowKey: "", briefId: "brief-1", count: 9 }));

        expect(readFrameFlowCreateWorkflow(storage, "agent")).toBeNull();
    });

    it("clears the workflow after reset or generation start", () => {
        const storage = memoryStorage();
        writeFrameFlowCreateWorkflow(storage, { endpoint: "agent", workflowKey: "workflow-1", briefId: "brief-1", count: 4 });

        clearFrameFlowCreateWorkflow(storage);

        expect(readFrameFlowCreateWorkflow(storage, "agent")).toBeNull();
    });
});
