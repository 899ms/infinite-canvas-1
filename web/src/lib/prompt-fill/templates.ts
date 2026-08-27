export type PromptFillTemplate = { id: string; title: string; description: string; category: string; content: string; custom?: boolean; createdAt?: string };
export const starterPromptTemplates: PromptFillTemplate[] = [
    { id: "editorial-object", title: "编辑感静物", description: "产品与静物的克制构图", category: "静物", content: "{{subject: 一件手工陶瓷器皿}} placed on {{surface: 浅色石材台面}}, {{composition: 大面积留白的编辑构图}}, {{lighting: 柔和侧窗光}}, {{palette: 低饱和中性色}}, subtle material texture, natural shadow, high detail" },
    { id: "calm-interior", title: "安静室内空间", description: "空间、材质与时间", category: "空间", content: "{{space: 小型阅读室}}, featuring {{material: 浅色木材与亚麻}}, at {{time: 清晨}}, {{lighting: 漫射自然光}}, {{mood: 安静、通透}}, architectural photography" },
    { id: "natural-portrait", title: "自然人物肖像", description: "真实姿态与环境关系", category: "人物", content: "A natural portrait of {{character: 一位年轻创作者}} in {{scene: 靠窗的工作室}}, {{action: 整理草图}}, {{lighting: 柔和环境光}}, {{camera: 50mm eye-level photograph}}" },
];
