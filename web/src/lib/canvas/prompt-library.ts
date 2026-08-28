import { createCanvasNode } from "@/lib/canvas/canvas-node-factory";
import { CanvasNodeType } from "@/types/canvas";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";

export function insertPromptIntoCanvas(content: string, title = "提示词") {
    const state = useCanvasStore.getState();
    const projectId = state.projects[0]?.id || state.createProject("提示词画布");
    const project = useCanvasStore.getState().openProject(projectId);
    if (!project) throw new Error("无法创建提示词画布");
    const node = {
        ...createCanvasNode(CanvasNodeType.Text, { x: 360 + project.nodes.length * 24, y: 260 + project.nodes.length * 24 }, { content, prompt: content, status: "success" }),
        title,
    };
    state.updateProject(projectId, { nodes: [...project.nodes, node] });
    return { projectId, nodeId: node.id, title };
}
