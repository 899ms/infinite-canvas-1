import assert from "node:assert/strict";
import test from "node:test";

import { shouldLogHttpRequest } from "./http.js";

test("HTTP Debug 日志忽略成功的健康检查与画布同步，但保留失败和业务请求", () => {
    assert.equal(shouldLogHttpRequest("GET", "/health", 200), false);
    assert.equal(shouldLogHttpRequest("POST", "/canvas/state", 200), false);
    assert.equal(shouldLogHttpRequest("POST", "/canvas/activate", 200), false);
    assert.equal(shouldLogHttpRequest("OPTIONS", "/agent/codex/turn", 204), false);
    assert.equal(shouldLogHttpRequest("GET", "/health", 500), true);
    assert.equal(shouldLogHttpRequest("POST", "/canvas/result", 409), true);
    assert.equal(shouldLogHttpRequest("POST", "/agent/codex/turn", 200), true);
});
