import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeLogDetails } from "./logger.js";

test("日志详情移除凭据字段、Data URL 与异常文本中的 Bearer 凭据", () => {
    const details = sanitizeLogDetails({
        token: "connect-token-value",
        password: "password-value",
        secret: "secret-value",
        credentials: { apiKey: "api-key-value" },
        image: { dataUrl: "data:image/png;base64,private-image" },
        error: new Error("request failed: Authorization: Bearer bearer-token-value"),
    });
    const text = JSON.stringify(details);

    assert.doesNotMatch(text, /connect-token-value|password-value|secret-value|api-key-value|private-image|bearer-token-value/);
    assert.match(text, /\[REDACTED\]|\[DATA URL/);
});
