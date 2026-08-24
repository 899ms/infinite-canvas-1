export type FrameFlowCreateWorkflowSession = {
    endpoint: string;
    workflowKey: string;
    briefId: string;
    promptVersionId?: string;
    count: number;
};

type WorkflowStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const STORAGE_KEY = "frameflow:create-workflow:v1";

export function readFrameFlowCreateWorkflow(storage: WorkflowStorage, endpoint: string) {
    try {
        const value = JSON.parse(storage.getItem(STORAGE_KEY) || "null") as Partial<FrameFlowCreateWorkflowSession> | null;
        if (!value || value.endpoint !== endpoint || !validId(value.workflowKey) || !validId(value.briefId) || !validCount(value.count)) return null;
        if (value.promptVersionId !== undefined && !validId(value.promptVersionId)) return null;
        return value as FrameFlowCreateWorkflowSession;
    } catch {
        return null;
    }
}

export function writeFrameFlowCreateWorkflow(storage: WorkflowStorage, value: FrameFlowCreateWorkflowSession) {
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearFrameFlowCreateWorkflow(storage: WorkflowStorage) {
    storage.removeItem(STORAGE_KEY);
}

function validId(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function validCount(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8;
}
