import { expect, test } from "@playwright/test";

test("提示词仪表盘的知识库、PromptFill 与图片反馈在刷新后保持", async ({ page }) => {
    await page.goto("/prompts?view=mine");
    await page.waitForFunction(async () => {
        const [knowledge, templates, feedback] = await Promise.all([import("/src/stores/use-prompt-knowledge-base-store.ts"), import("/src/stores/use-prompt-fill-store.ts"), import("/src/stores/use-image-feedback-store.ts")]);
        return knowledge.usePromptKnowledgeBaseStore.getState().hydrated && templates.usePromptFillStore.getState().hydrated && feedback.useImageFeedbackStore.getState().hydrated;
    });
    await page.evaluate(async () => {
        const [knowledge, templates, feedback] = await Promise.all([import("/src/stores/use-prompt-knowledge-base-store.ts"), import("/src/stores/use-prompt-fill-store.ts"), import("/src/stores/use-image-feedback-store.ts")]);
        await knowledge.usePromptKnowledgeBaseStore.getState().capture({ sourceType: "manual", content: "刷新后保留的知识库采集" });
        await templates.usePromptFillStore.getState().save({ title: "刷新后保留的 PromptFill", content: "{{主体}}", category: "我的模板", description: "隔离持久化回归" });
        await feedback.useImageFeedbackStore.getState().setFeedback("storage-feedback", { rating: 5, comment: "刷新后保留的图片反馈", style: "电影感", scene: "城市" });
    });
    await expect(page.getByText("刷新后保留的知识库采集")).toBeVisible();
    await page.reload();
    await page.waitForFunction(async () => {
        const [knowledge, templates, feedback] = await Promise.all([import("/src/stores/use-prompt-knowledge-base-store.ts"), import("/src/stores/use-prompt-fill-store.ts"), import("/src/stores/use-image-feedback-store.ts")]);
        return (
            knowledge.usePromptKnowledgeBaseStore.getState().data.captures.some((item) => item.content === "刷新后保留的知识库采集") &&
            templates.usePromptFillStore.getState().templates.some((item) => item.title === "刷新后保留的 PromptFill") &&
            feedback.useImageFeedbackStore.getState().feedback["storage-feedback"]?.comment === "刷新后保留的图片反馈"
        );
    });
    await expect(page.getByText("刷新后保留的知识库采集")).toBeVisible();
});

test("IndexedDB 事务拒绝时仪表盘保留内存并显示安全告警", async ({ page }) => {
    await page.goto("/prompts?view=mine");
    await page.waitForFunction(async () => {
        const [knowledge, templates, feedback] = await Promise.all([import("/src/stores/use-prompt-knowledge-base-store.ts"), import("/src/stores/use-prompt-fill-store.ts"), import("/src/stores/use-image-feedback-store.ts")]);
        return knowledge.usePromptKnowledgeBaseStore.getState().hydrated && templates.usePromptFillStore.getState().hydrated && feedback.useImageFeedbackStore.getState().hydrated;
    });
    await page.evaluate(() => {
        const originalTransaction = IDBDatabase.prototype.transaction;
        Object.defineProperty(IDBDatabase.prototype, "transaction", {
            configurable: true,
            value(this: IDBDatabase, storeNames: string | string[], ...args: unknown[]) {
                const names = Array.isArray(storeNames) ? storeNames : [storeNames];
                if (names.some((name) => name === "prompt_knowledge_base" || name === "image_feedback")) throw new DOMException("IndexedDB 被拒绝", "QuotaExceededError");
                return originalTransaction.call(this, storeNames, ...(args as [IDBTransactionMode?, IDBTransactionOptions?]));
            },
        });
    });
    const failedWrites = await page.evaluate(async () => {
        const [knowledge, templates, feedback] = await Promise.all([import("/src/stores/use-prompt-knowledge-base-store.ts"), import("/src/stores/use-prompt-fill-store.ts"), import("/src/stores/use-image-feedback-store.ts")]);
        const settled = await Promise.allSettled([
            knowledge.usePromptKnowledgeBaseStore.getState().capture({ sourceType: "manual", content: "失败后不得出现的采集" }),
            templates.usePromptFillStore.getState().save({ title: "失败后不得出现的模板", content: "{{主体}}", category: "我的模板", description: "失败夹具" }),
            feedback.useImageFeedbackStore.getState().setFeedback("failed-feedback", { rating: 1, comment: "失败后不得出现的反馈" }),
        ]);
        return {
            statuses: settled.map((item) => item.status),
            captureCount: knowledge.usePromptKnowledgeBaseStore.getState().data.captures.length,
            templateCount: templates.usePromptFillStore.getState().templates.length,
            feedback: feedback.useImageFeedbackStore.getState().feedback["failed-feedback"],
            errors: [knowledge.usePromptKnowledgeBaseStore.getState().error, templates.usePromptFillStore.getState().error, feedback.useImageFeedbackStore.getState().error],
        };
    });
    expect(failedWrites.statuses).toEqual(["rejected", "rejected", "rejected"]);
    expect(failedWrites.captureCount).toBe(0);
    expect(failedWrites.templateCount).toBe(0);
    expect(failedWrites.feedback).toBeUndefined();
    expect(failedWrites.errors.every(Boolean)).toBe(true);
    await expect(page.getByText("浏览器数据未能安全保存或读取", { exact: true })).toBeVisible();

    const retainedAfterReadFailure = await page.evaluate(async () => {
        const [knowledge, templates, feedback, knowledgeDomain] = await Promise.all([
            import("/src/stores/use-prompt-knowledge-base-store.ts"),
            import("/src/stores/use-prompt-fill-store.ts"),
            import("/src/stores/use-image-feedback-store.ts"),
            import("/src/lib/prompt-knowledge-base/domain.ts"),
        ]);
        const retainedKnowledge = knowledgeDomain.addCapture(knowledgeDomain.createEmptyPromptKnowledgeBase(), { sourceType: "manual", content: "读取失败后保留的内存采集" });
        knowledge.usePromptKnowledgeBaseStore.setState({ data: retainedKnowledge, error: undefined });
        templates.usePromptFillStore.setState({
            templates: [{ id: "retained-template", title: "读取失败后保留的模板", content: "{{主体}}", category: "我的模板", description: "内存保留", custom: true, createdAt: "2026-08-28T00:00:00.000Z" }],
            error: undefined,
        });
        feedback.useImageFeedbackStore.setState({
            feedback: { "retained-feedback": { id: "retained-feedback", assetId: "retained-feedback", comment: "读取失败后保留的反馈", hidden: false, rating: 5, createdAt: "2026-08-28T00:00:00.000Z", updatedAt: "2026-08-28T00:00:00.000Z" } },
            error: undefined,
        });
        await Promise.all([knowledge.usePromptKnowledgeBaseStore.getState().hydrate(), templates.usePromptFillStore.getState().hydrate(), feedback.useImageFeedbackStore.getState().hydrate()]);
        return {
            capture: knowledge.usePromptKnowledgeBaseStore.getState().data.captures[0]?.content,
            template: templates.usePromptFillStore.getState().templates[0]?.title,
            feedback: feedback.useImageFeedbackStore.getState().feedback["retained-feedback"]?.comment,
            errors: [knowledge.usePromptKnowledgeBaseStore.getState().error, templates.usePromptFillStore.getState().error, feedback.useImageFeedbackStore.getState().error],
        };
    });
    expect(retainedAfterReadFailure).toEqual({
        capture: "读取失败后保留的内存采集",
        template: "读取失败后保留的模板",
        feedback: "读取失败后保留的反馈",
        errors: expect.arrayContaining([expect.any(String)]),
    });
    await expect(page.getByText("读取失败后保留的内存采集")).toBeVisible();
});
