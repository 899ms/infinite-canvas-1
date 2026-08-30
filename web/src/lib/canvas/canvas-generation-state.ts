import type { CanvasNodeData } from "@/types/canvas";

export function settleCancelledGenerationNodes(nodes: CanvasNodeData[], affectedNodeIds: ReadonlySet<string>, errorDetails: string) {
    return nodes.map((node) =>
        affectedNodeIds.has(node.id) && node.metadata?.status === "loading"
            ? {
                  ...node,
                  metadata: {
                      ...node.metadata,
                      status: "idle" as const,
                      errorDetails: undefined,
                      images: node.metadata.images?.map((image) => (image.status === "loading" ? { ...image, status: "error" as const, errorDetails } : image)),
                  },
              }
            : node,
    );
}
