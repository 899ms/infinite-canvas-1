export type CanvasGenerationRequest = {
    targetNodeId: string;
    originNodeId: string;
    runningNodeId: string;
    controller: AbortController;
};

export class CanvasGenerationRequestRegistry {
    private readonly requests = new Map<string, CanvasGenerationRequest>();

    start(targetNodeId: string, originNodeId: string, runningNodeId = originNodeId, controller = new AbortController()) {
        const previous = this.requests.get(targetNodeId);
        if (previous?.controller !== controller) previous?.controller.abort();
        this.requests.set(targetNodeId, { targetNodeId, originNodeId, runningNodeId, controller });
        return controller;
    }

    finish(targetNodeId: string, controller: AbortController) {
        if (this.requests.get(targetNodeId)?.controller === controller) this.requests.delete(targetNodeId);
    }

    cancelByRunningId(runningNodeId: string) {
        const affectedNodeIds = new Set<string>();
        this.requests.forEach((request) => {
            if (request.runningNodeId !== runningNodeId) return;
            request.controller.abort();
            this.requests.delete(request.targetNodeId);
            affectedNodeIds.add(request.targetNodeId);
            affectedNodeIds.add(request.originNodeId);
        });
        return [...affectedNodeIds];
    }

    has(targetNodeId: string) {
        return this.requests.has(targetNodeId);
    }
}
