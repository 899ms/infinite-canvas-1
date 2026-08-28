import assert from "node:assert/strict";
import test from "node:test";

import { AGENT_PROMPT } from "../config.js";

test("当前画布任务优先读取已打开画布，避免无谓的列表和重复导航", () => {
    assert.match(AGENT_PROMPT, /默认目标就是网页当前已经打开的画布/);
    assert.match(AGENT_PROMPT, /先使用 `canvas_get_state`/);
    assert.match(AGENT_PROMPT, /不要调用 `canvas_list_projects`，也不要用 `site_navigate` 重复进入画布/);
    assert.match(AGENT_PROMPT, /只有用户明确要求查看、选择或切换其他画布/);
});
