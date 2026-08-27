import { mergeGenerationPrompt } from "@/lib/interior-design-workflow";
import { requestInteriorPrompt, type InteriorPromptDraft, type InteriorPromptStage } from "@/services/api/interior-design";
import { imageToDataUrl } from "@/services/image-storage";
import type { AgentReasoningEffort } from "@/stores/use-agent-store";
import type { InteriorWorkflowMetadata } from "@/types/canvas";
import type { ReferenceImage } from "@/types/image";

export async function generateInteriorCanvasPrompt(input: {
    endpoint: string;
    token: string;
    stage: InteriorPromptStage;
    workflow: InteriorWorkflowMetadata;
    reference: ReferenceImage;
    model?: string;
    effort: AgentReasoningEffort;
    signal?: AbortSignal;
}): Promise<{ draft: InteriorPromptDraft; content: string }> {
    const draft = await requestInteriorPrompt(
        input.endpoint,
        input.token,
        {
            stage: input.stage,
            roomType: input.workflow.roomType,
            style: input.workflow.style,
            requirements: input.workflow.requirements,
            imageDataUrl: await imageToDataUrl(input.reference),
            model: input.model,
            effort: input.effort,
        },
        { signal: input.signal },
    );
    return { draft, content: mergeGenerationPrompt(draft.prompt, draft.negativePrompt) };
}
