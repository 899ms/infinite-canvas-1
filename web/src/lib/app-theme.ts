import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

// Ant Design resolves its palette in JavaScript, so this is the framework adapter
// for the pinned shared CSS token artifact rather than a product-owned palette.
const sharedTokenAdapter = {
    light: {
        primary: "#171717",
        primaryHover: "#202020",
        primaryText: "#ffffff",
        menuBg: "#f5f5f3",
        menuText: "#171717",
        selectActiveBg: "#f5f5f3",
        selectSelectedBg: "#ececea",
        selectText: "#171717",
        tableSelectedBg: "rgba(17, 17, 17, 0.05)",
        tableSelectedHoverBg: "rgba(17, 17, 17, 0.08)",
    },
    dark: {
        primary: "#fafaf9",
        primaryHover: "#ffffff",
        primaryText: "#171717",
        menuBg: "#202020",
        menuText: "#fafaf9",
        selectActiveBg: "#202020",
        selectSelectedBg: "#292927",
        selectText: "#fafaf9",
        tableSelectedBg: "rgba(255, 255, 255, 0.08)",
        tableSelectedHoverBg: "rgba(255, 255, 255, 0.12)",
    },
};

export function getAntThemeConfig(dark: boolean): ThemeConfig {
    const color = dark ? sharedTokenAdapter.dark : sharedTokenAdapter.light;

    return {
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        cssVar: { key: dark ? "infinite-canvas-dark" : "infinite-canvas-light" },
        token: {
            colorPrimary: color.primary,
            colorInfo: color.primary,
            colorLink: color.primary,
            colorLinkHover: color.primaryHover,
            colorLinkActive: color.primary,
            colorTextLightSolid: color.primaryText,
        },
        components: {
            Button: {
                primaryShadow: "none",
            },
            Menu: {
                itemActiveBg: color.menuBg,
                itemHoverBg: color.menuBg,
                itemSelectedBg: color.menuBg,
                itemSelectedColor: color.menuText,
                darkItemHoverBg: sharedTokenAdapter.dark.menuBg,
                darkItemSelectedBg: sharedTokenAdapter.dark.menuBg,
                darkItemSelectedColor: sharedTokenAdapter.dark.menuText,
            },
            Select: {
                optionActiveBg: color.selectActiveBg,
                optionSelectedBg: color.selectSelectedBg,
                optionSelectedColor: color.selectText,
            },
            Table: {
                rowSelectedBg: color.tableSelectedBg,
                rowSelectedHoverBg: color.tableSelectedHoverBg,
            },
        },
    };
}
