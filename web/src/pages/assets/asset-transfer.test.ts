import { expect, it } from "vitest";

import { buildAssetExportPackage, readAssetPackage } from "./asset-transfer";

it("builds a validated asset package that can be read back", async () => {
    const asset = {
        id: "asset-1",
        kind: "text" as const,
        title: "导出回环测试",
        coverUrl: "",
        tags: ["QA"],
        source: "test",
        data: { content: "export then import" },
        createdAt: "2026-08-11T00:00:00.000Z",
        updatedAt: "2026-08-11T00:00:00.000Z",
    };
    const { zip, receipt } = await buildAssetExportPackage([asset]);
    expect(receipt).toMatchObject({ fileName: "我的资产.zip", assetCount: 1, mediaFileCount: 0, verified: true });
    expect(receipt.bytes).toBeGreaterThan(0);
    await expect(readAssetPackage(zip)).resolves.toEqual([asset]);
});
