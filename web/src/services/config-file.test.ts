import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

import { saveAs } from "file-saver";

import { defaultConfig, defaultWebdavSyncConfig, useConfigStore } from "@/stores/use-config-store";
import { usePromptSourceStore } from "@/stores/use-prompt-source-store";
import { exportAppConfig, importAppConfig } from "./config-file";

const originalConfig = structuredClone(defaultConfig);
const originalWebdav = structuredClone(defaultWebdavSyncConfig);
const originalSources = structuredClone(usePromptSourceStore.getState().sources);
const originalSchedule = structuredClone(usePromptSourceStore.getState().schedule);

afterEach(() => {
    useConfigStore.setState({ config: structuredClone(originalConfig), webdav: structuredClone(originalWebdav) });
    usePromptSourceStore.setState({ sources: structuredClone(originalSources), schedule: structuredClone(originalSchedule) });
    vi.clearAllMocks();
});

describe("配置与用户偏好文件", () => {
    it("导出渠道、默认模型、生成偏好、提示词来源和 WebDAV 设置", async () => {
        const config = {
            ...structuredClone(defaultConfig),
            apiKey: "test-api-key",
            imageModel: "default::gpt-image-2",
            videoModel: "default::grok-imagine-video",
            textModel: "default::gpt-5.5",
            audioModel: "default::gpt-4o-mini-tts",
            quality: "high",
            size: "16:9",
            count: "4",
        };
        const webdav = { url: "https://drive.example.test/webdav", username: "tester", password: "app-password", directory: "canvas-backup", lastSyncedAt: "2026-08-28T00:00:00.000Z" };
        const sources = originalSources.map((source, index) => ({ ...source, enabled: index === 0 }));
        const schedule = { intervalMinutes: 60, lastFetchedAt: "2026-08-28T00:00:00.000Z" };
        useConfigStore.setState({ config, webdav });
        usePromptSourceStore.setState({ sources, schedule });

        exportAppConfig();

        const [blob, filename] = vi.mocked(saveAs).mock.calls[0];
        const data = JSON.parse(await (blob as Blob).text());
        expect(filename).toBe("infinite-canvas-config.json");
        expect(data).toMatchObject({ app: "infinite-canvas", version: 1, config, webdav, promptSources: { sources, schedule } });
    });

    it("在当前配置变更后导入可完整恢复导出内容", async () => {
        const exported = {
            app: "infinite-canvas",
            version: 1,
            exportedAt: "2026-08-28T00:00:00.000Z",
            config: { ...structuredClone(defaultConfig), apiKey: "restored-key", quality: "medium", count: "2" },
            webdav: { url: "https://restore.example.test/webdav", username: "restore", password: "restore-password", directory: "restored", lastSyncedAt: "" },
            promptSources: { sources: originalSources.map((source, index) => ({ ...source, enabled: index === 1 })), schedule: { intervalMinutes: 1440, lastFetchedAt: "2026-08-28T00:00:00.000Z" } },
        };
        useConfigStore.setState({ config: { ...structuredClone(defaultConfig), apiKey: "changed-key", quality: "low", count: "15" }, webdav: structuredClone(defaultWebdavSyncConfig) });
        usePromptSourceStore.setState({ sources: [], schedule: { intervalMinutes: 0, lastFetchedAt: "" } });

        await importAppConfig(new File([JSON.stringify(exported)], "config.json", { type: "application/json" }));

        expect(useConfigStore.getState()).toMatchObject({ config: exported.config, webdav: exported.webdav });
        expect(usePromptSourceStore.getState()).toMatchObject(exported.promptSources);
    });

    it("拒绝格式错误的 JSON 文件且不改写当前设置", async () => {
        useConfigStore.setState({ config: { ...structuredClone(defaultConfig), apiKey: "keep-this-key" } });

        await expect(importAppConfig(new File(["{invalid"], "invalid.json", { type: "application/json" }))).rejects.toThrow("配置文件格式不正确");
        expect(useConfigStore.getState().config.apiKey).toBe("keep-this-key");
    });
});
