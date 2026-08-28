/** 文本已选中时放行浏览器原生复制，避免画布复制节点。 */
export function shouldAllowNativeCopy(hasTextSelection: boolean) {
    return hasTextSelection;
}
