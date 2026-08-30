# 本轮仓库审查与文件关联记录

## 1. 本轮目标

用户要求审查当前 Infinite Canvas + FrameFlow 仓库，并编写可供后续开发使用的文档。

本轮工作边界：

- 读取仓库交接信息、开发约束、文档规则与架构决策。
- 检查当前 Git 工作树、项目结构、依赖、测试、构建、运行端口和自动化浏览器回归。
- 识别影响后续开发的功能、架构、验收、安全与文档问题。
- 生成后期开发路线图，并同步项目 TODO。
- 不新增业务功能，不删除或移动真实资产，不清理、重置或覆盖用户现有修改。
- 不把 Docker 或容器部署作为当前阶段要求。

## 2. 审查依据

| 依据 | 用途 |
| --- | --- |
| `CONTEXT.md` | 接手边界、当前产品语义、运行方式和用户资产保护要求 |
| `AGENTS.md` | 仓库开发、测试、文档和变更范围约束 |
| `docs/adr/` | 已确定的 FrameFlow 架构决策，避免路线图与现有决策冲突 |
| `docs/content/docs/progress/pending-test*.mdx` | 当前验收债务与文档状态 |
| `docs/content/docs/progress/todo*.mdx` | 当前后续任务入口及中英文漂移检查 |
| Git 状态与 `HEAD` 文件清单 | 区分当前工作区能力与版本库可复现能力 |
| 三个子项目的测试、构建和依赖审计 | 验证当前工作区的工程健康度 |
| Web Playwright 回归 | 验证主要路由首屏、可访问名称与 FrameFlow 图片预览分组 |

## 3. 主要发现

### 已确认可用

- Web 单元测试、类型检查和生产构建通过。
- Canvas Agent 单元测试和生产构建通过。
- 文档内容检查、类型检查和生产构建通过。
- Web 与 Canvas Agent 生产依赖审计结果为 0 个已知漏洞。
- 11 项自动化浏览器回归全部通过。
- 端口 3000 与 17371 上存在当前项目服务。

### 需要优先处理

1. 当前工作区有大量用户修改和未跟踪文件，构建与测试所需的部分基础设施不在当前 `HEAD` 中；必须先形成可恢复检查点，再验证干净检出。
2. 中文待测试主清单有 95 项，英文摘要有 25 项；当前缺少逐项状态和证据矩阵。
3. FrameFlow 需要一条覆盖创建、自动评审、暂停/继续/停止、人工反馈、归档/恢复的可重复端到端流程。
4. `project.tsx`、`local-agent-panel.tsx`、FrameFlow core 与 Codex 集成模块职责较重，后续应先用特征测试保护，再渐进拆分。
5. TODO 两个语言版本此前内容不一致，需要同步并增加自动一致性门禁。
6. 浏览器本地凭据、外部 Prompt/图片内容与运行日志需要更明确的安全边界和脱敏验证。

## 4. 本轮生成与修改的文件

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `docs/post-development-roadmap.md` | 新增 | 汇总审查结论、风险分级、阶段计划、退出条件和后续开发顺序；作为后期开发总览 |
| `docs/session-development-record.md` | 新增 | 记录本轮对话目标、审查范围、验证结果、文件关联和未执行事项 |
| `docs/index.md` | 修改 | 在英文文档索引中加入两份仓库级工程文档入口 |
| `docs/index.zh-CN.md` | 修改 | 在中文文档索引中加入两份仓库级工程文档入口 |
| `docs/content/docs/progress/todo.mdx` | 修改 | 把稳定基线、验收债务、模块拆分、安全治理和后续功能纳入统一任务清单 |
| `docs/content/docs/progress/todo.zh-CN.mdx` | 修改 | 与另一语言入口同步同一组任务，修复任务清单漂移 |

本轮没有修改 Web、Canvas Agent 或文档站的业务实现代码。

## 5. 验证记录

| 范围 | 结果 |
| --- | --- |
| Web 测试 | 15 个测试文件、47 项通过 |
| Web TypeScript | 通过 |
| Web 格式基线 | 通过；仍有约 205 个历史文件处于豁免基线 |
| Web 生产构建 | 通过 |
| Web 首包检查 | 约 214.8 KiB，低于 400 KiB 门槛 |
| Web 自动化浏览器 | 11 项通过 |
| Canvas Agent 测试 | 168 项通过 |
| Canvas Agent 构建 | 通过 |
| Canvas Agent 生产依赖审计 | 0 个已知漏洞 |
| 文档内容检查 | 通过；英文摘要 25 项、中文主清单 95 项 |
| 文档 TypeScript | 通过 |
| 文档生产构建 | 通过 |
| 文档生产依赖审计 | 0 个已知漏洞 |

## 6. 明确保留与未执行事项

- 未执行 Git reset、checkout、clean、批量格式化或删除操作。
- 未删除、移动或重命名真实图片、运行记录、归档和其他用户资产。
- 未把未跟踪文件自动加入版本控制，也未代替用户决定哪些证据或产物应提交。
- 未执行 Docker 构建或 Compose 验收，因为容器部署不在当前需求范围。
- 未把自动化浏览器通过描述成内置浏览器人工验收；完整人工闭环仍列在路线图阶段 B。
- 未建立提交、分支、标签或远端发布；这些动作需要用户另行授权。

## 7. 建议下一执行入口

先执行[后期开发路线图](post-development-roadmap.md)的阶段 A：只读分类当前修改与未跟踪文件，确认哪些是运行必需源码、哪些是用户资产或临时证据，然后形成可恢复检查点并做干净检出复现。完成前不建议继续叠加新功能。

## 8. 阶段 B 本次续开发记录（2026-08-28）

本次在已建立的可恢复分支基线上继续关闭 FrameFlow 验收债务；没有修改产品业务逻辑、真实资产或现有运行记录。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-task-context.spec.ts` | 修改 | 使用隔离浏览器 origin、路由响应夹具和内存状态，验证待审页的“隐藏并学习 → 状态回写 → 恢复 → 状态回写”闭环；验证自动跑失败卡片刷新后保留原批次并只继续同一任务的审图；验证创建页空用途、Prompt 批准与独立 Run 提交的顺序。断言限定在实际检查器/状态标签，避免把静态标题当作状态证据。 |
| `canvas-agent/src/frameflow/core.test.ts` | 修改 | 使用一次性 Agent 工作区模拟一次机器审图 Provider 失败；验证同一 Auto Run 的已生成批次不丢失，显式恢复后只补齐缺失审图并完成。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 为主清单 12 补充上述局部浏览器证据及剩余未覆盖范围，维持该项“未验证”，不外推为完整验收。 |
| `docs/session-development-record.md` | 修改 | 记录本次新增测试、文件关联、验证结果和边界，满足对话级可追溯要求。 |

### 内置浏览器隔离验收

- 使用 Codex 内置浏览器访问临时 Web `127.0.0.1:3014` 和临时 FrameFlow Core `127.0.0.1:17400`；临时 Core 复用已编译的 FrameFlow router，并以确定性 planner、图片生成器和审图器代替外部 Provider，所有数据位于系统临时目录。
- 手工闭环依次验证：空用途创建 Brief、Prompt 生成与批准、独立提交 1 张 Run、运行与血缘中成功 1/1、5 星评分、Comment、隐藏、恢复、Preference DNA 保留 `+3` 净权重及 Comment 证据、归档后的只读历史、恢复后证据保持不变。
- 自动跑页以临时探索方向启动 1 张/1 轮，刷新后显示“已完成 1/1 轮”，并可见“查看演化”“查看审图”“继续探索 +1 轮”入口。
- 该记录只证明隔离 UI 与真实已编译核心的集成；不使用端口 3000/17371、真实 Token、真实图片或用户工作区，也不等价于外部模型、真实 Canvas Agent SSE 或 Docker/容器生产验收。

本次验证结果：

- `web`：`npm run test:e2e` 15 项通过；`npm run typecheck` 通过。
- `canvas-agent`：`npm test` 170 项通过，其中包括机器审图失败后的原任务恢复回归。
- 仓库根目录：`node docs/scripts/check-pending-test-locales.mjs` 通过（英文摘要 25 项、中文主清单 95 项、状态矩阵 95 项）。
- 测试请求仅命中 Playwright 本地路由夹具；未读取或使用本机 Canvas Agent 的真实 Token、真实图片或端口 3000/17371 服务。

阶段 B 已具备隔离自动化证据与一次内置浏览器可见闭环记录；后续仍须按 95 项主清单逐项补齐缺口，且不得把本次临时 Provider 验收写成真实 Agent/外部模型生产验收。Docker/容器验收仍不在本轮范围。

## 9. 阶段 C 首个解耦切片（2026-08-28）

本切片只迁移 Canvas Skill 草稿的纯脱敏/快照投影逻辑；不改变 HTTP API、Codex 调度、画布存储或前端行为。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/agent/canvas-skill-safety.ts` | 新增 | 独立承载画布快照的节点匿名化、媒体/路径/凭据/临时字段剔除、长度限制，以及草稿输出的敏感信息拒绝逻辑；输入输出均为纯数据，便于脱离 Codex 进程测试。 |
| `canvas-agent/src/agent/codex.ts` | 修改 | 保留 Codex 编排职责，改为调用上述纯模块生成安全的画布 Skill 输入并校验草稿输出；`CanvasSnapshot` 仍作为公开输入类型，不改变调用方契约。 |
| `canvas-agent/src/agent/codex-client.test.ts` | 修改 | 既有安全回归改为直接导入新模块，覆盖匿名节点引用、敏感信息清除、截断优先级和草稿拒绝规则，防止后续重新耦合到 Codex 编排层。 |

验证记录：先将既有测试切换到新模块路径，确认模块不存在时得到预期的 `ERR_MODULE_NOT_FOUND`；迁移同一段纯逻辑后，聚焦测试 `npx tsx --test src/agent/codex-client.test.ts` 40 项通过，`npm run build` 通过，完整 `npm test` 170 项通过。测试日志中的中断/SSE 文本来自既有测试夹具，不是本机 Agent 服务操作。

## 10. 阶段 D 日志脱敏切片（2026-08-28）

本切片只收紧 Canvas Agent 的普通日志详情；不读取、打印或改变任何真实 Token、图片、浏览器存储或运行服务。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/utils/logger.ts` | 修改 | 导出可独立验证的日志详情清理入口；除既有 token、authorization、apiKey、Data URL 外，统一遮蔽 password、secret、credential 字段，并清理 Error 的 message/stack 中 Bearer 与常见赋值式凭据。 |
| `canvas-agent/src/utils/logger.test.ts` | 新增 | 以虚构值验证字段级凭据、嵌套 Data URL 和 Error 文本中的 Bearer 值均不会进入序列化日志。 |
| `canvas-agent/package.json` | 修改 | 将日志脱敏回归纳入 Canvas Agent 的正式 `npm test` 命令，避免只作为一次性本地检查。 |
| `docs/session-development-record.md` | 修改 | 记录本次安全边界、文件关联与验证结果，满足会话可追溯要求。 |

验证记录：先新增直接导入 `sanitizeLogDetails` 的测试，确认实现尚未导出该安全边界时失败；补齐实现后聚焦测试与 `npm run build` 通过，完整 `npm test` 为 171 项通过。该证据覆盖待测清单中 Canvas Agent Debug 的凭据/Data URL 脱敏子项；Codex stderr ANSI 时间规范化、网页诊断日志与浏览器人工验收仍按矩阵保留未验证。

## 11. 阶段 D 浏览器凭据威胁模型（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `docs/content/docs/support/browser-credential-threat-model.mdx` | 新增 | 英文权威说明：浏览器本地 API Key、WebDAV、Agent URL/Token、一次性 URL 参数、会话身份和不可信外部内容的边界、已知限制与 CSP 前置门禁。 |
| `docs/content/docs/support/browser-credential-threat-model.zh-CN.mdx` | 新增 | 与英文同范围的中文用户说明。 |
| `docs/content/docs/support/meta.json` / `meta.zh-CN.json` | 修改 | 将双语威胁模型加入支持与安全导航。 |
| `docs/session-development-record.md` | 修改 | 记录基于当前实现核验得到的边界，避免把 CSP 计划误写成已实施的 CSP。 |

文档事实依据：Agent URL/Token 显式连接后进入 `localStorage`，标签页身份进入 `sessionStorage`；一次性 `baseUrl`/`apiKey` 参数读取后通过 `history.replaceState` 从 URL 移除；第三方插件按可读取当前页面本地数据的高信任代码处理。该文档不改变浏览器存储模型，也不声称 CSP 已实施。

## 12. 阶段 D 外部 Prompt URL 边界（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/services/api/prompt-image-url.ts` | 修改 | 对不可信 Prompt 图片 URL 仅允许 HTTP(S)、blob 与 PNG/JPEG/WebP/GIF 的 base64 Data URL；新增仅允许 HTTP(S) 的来源详情链接清理器，继续保留既有不可加载缩略图黑名单。 |
| `web/src/services/api/prompt-source-runtime.ts` | 修改 | 将外部记录的 `sourceUrl` 写入运行时对象前经过 HTTP(S) 清理，避免来源详情把 `javascript:`、`file:` 等协议交给 UI 链接。 |
| `web/src/services/api/prompt-image-url.test.ts` | 修改 | 新增对 `javascript:`、`file:`、非图片 Data URL、SVG Data URL 与来源链接协议的回归；允许既有安全位图 Data URL、blob 和有效 HTTPS 图片。 |
| `docs/session-development-record.md` | 修改 | 记录协议、来源与失败降级边界及质量结果。 |

验证记录：先新增协议断言，确认当前实现会返回 `javascript:alert(1)` 且缺少来源链接清理函数；实现后聚焦测试 6 项通过，`npm run typecheck` 通过，完整 `npm test` 为 15 个文件/49 项通过，`npm run build` 通过。该切片不把浏览器 Prompt URL 政策外推为全部外部内容审计，CSP 与来源抓取网络策略仍需后续阶段 D 工作。

## 13. 阶段 D 自动跑停止原因（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/types.ts` | 修改 | 为 `auto_run.paused` 和 `run.cancelled` 事件增加可选的 `reason`；新事件分别记录用户停止、用户取消或 Agent 重启恢复取消，而旧 journal 缺少字段时仍保持可回放。 |
| `canvas-agent/src/frameflow/schemas.ts` | 修改 | 将停止和取消原因纳入事件 schema，并保持可选以兼容历史持久化记录。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 用户执行 `auto_run.stop` 或 `run.cancel` 时在事实事件中分别持久化 `user_requested`；初始化恢复检测到未结束 Run 时持久化 `agent_restart`。 |
| `canvas-agent/src/frameflow/core.test.ts` | 修改 | 在机器审图期间停止的既有状态机回归中查询 `event.history`；新增 Run 的用户取消与 Agent 重启恢复两条原因回归。 |
| `docs/session-development-record.md` | 修改 | 记录事件契约、向后兼容约束和验证结果。 |

验证记录：先新增事件历史断言，原实现返回 `undefined`，证明停止原因尚未记录；补齐 Auto Run 的用户停止后，继续以 Run 的用户取消断言复现同一缺口。现在聚焦两条取消回归、Canvas Agent 构建和完整 `npm test` 172 项均通过。历史 journal 仍可无原因回放；新写入会区分 `user_requested` 与 `agent_restart`。此切片补的是可恢复事实语义；生成失败、机器审图、轮次、批次和隔离结果已有独立事件，未将其伪装成单一通用遥测流。

## 14. 阶段 C FrameFlow 请求构建器解耦（2026-08-28）

本切片只从 Codex 编排层迁出无副作用的 FrameFlow 请求文本构建；不修改线程启动、结构化输出 schema、Provider 调用、文件附件或既有 Prompt 文本。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/agent/codex-frameflow-requests.ts` | 新增 | 独立承载 FrameFlow 的规划、中文翻译、ImageGen、机器审图和跨轮总结请求文本，以及它们的输入类型；模块只依赖领域类型，不启动 Codex 进程。 |
| `canvas-agent/src/agent/codex.ts` | 修改 | 保留线程、Provider、结构化输出校验和资源清理职责，改为调用独立构建器，并继续导出相同的 FrameFlow 输入类型以保持调用方契约。 |
| `canvas-agent/src/agent/codex-frameflow-requests.test.ts` | 新增 | 直接验证五类请求保留策略、人工偏好证据、逐图映射、目标画幅、参考图和跨轮真实 iteration 等关键约束。 |
| `canvas-agent/package.json` | 修改 | 将新纯模块测试加入正式 Canvas Agent 测试命令。 |
| `docs/session-development-record.md` | 修改 | 记录职责边界、测试先行过程、文件关联和验证结果。 |

验证记录：先让新测试直接导入尚不存在的纯模块，得到预期 `ERR_MODULE_NOT_FOUND`；迁移后，首次断言错误地把系统指令当成请求文本，已改为只断言构建器本来负责的内容。聚焦测试、`npm run build` 和完整 `npm test` 173 项均通过。该切片不声称外部 Codex Provider 已人工验收；它只证明请求文本在本地纯函数与既有 Agent 测试组合中保持一致。

## 15. 阶段 C 图像请求构建器解耦（2026-08-28）

本切片继续拆分 Codex 编排层中的无副作用文本构建，但不改变附件落盘、ImageGen 线程、Provider 调用或 UI 行为。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/agent/codex-image-requests.ts` | 新增 | 独立承载室内白膜/设计/漫游提示词、室内 ImageGen 与普通画布 ImageGen 请求文本及其输入类型；只依赖协议和附件类型。 |
| `canvas-agent/src/agent/codex.ts` | 修改 | 保留实际线程创建、附件写入、生成调用和 finally 清理，改为调用该纯构建模块，并持续导出兼容的输入类型。 |
| `canvas-agent/src/agent/codex-image-requests.test.ts` | 新增 | 直接覆盖室内阶段语义、数量上下限、唯一参考图、画幅、普通画布参考图数量和用户提示词。 |
| `canvas-agent/package.json` | 修改 | 将图像请求构建器回归纳入正式 Agent 测试。 |
| `docs/session-development-record.md` | 修改 | 记录会话级文件关联、职责边界与验证结果。 |

验证记录：先由测试导入尚不存在模块，得到预期 `ERR_MODULE_NOT_FOUND`；迁移后聚焦测试、`npm run build` 和完整 `npm test` 174 项均通过。此处的数量截断与文案完全沿用原行为；没有调用真实外部 ImageGen，也没有读取用户图片或端口 3000/17371 服务。

## 16. 阶段 C FrameFlow 重启恢复策略解耦（2026-08-28）

本切片只将事件加载后的遗留 Run 判定与恢复事务构造移出 `FrameFlowCore`；文件读写、事务追加、投影重放和资产隔离仍由 Core 按原顺序负责。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/recovery.ts` | 新增 | 纯恢复策略：从投影中识别 queued/running/retrying Run，生成带 `agent_restart` 原因的系统取消事务；没有遗留 Run 时返回空。时间和 ID 均由调用方注入。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 初始化时委托恢复策略构造事务，再沿用原有 Event Store 追加、内存重放与资产隔离流程。 |
| `canvas-agent/src/frameflow/recovery.test.ts` | 新增 | 不使用临时文件或 Provider，直接验证恢复范围、事务序列、系统 actor、原因与无遗留 Run 的空结果。 |
| `canvas-agent/package.json` | 修改 | 将恢复策略测试加入正式 Agent 测试命令。 |
| `docs/session-development-record.md` | 修改 | 记录此职责边界、文件关联和验证证据。 |

验证记录：先直接导入未创建的恢复模块，得到预期 `ERR_MODULE_NOT_FOUND`；实现后聚焦测试 2 项、`npm run build` 与完整 `npm test` 176 项均通过。该切片不改变 journal 兼容性、运行取消语义或重启时的资产孤儿隔离，仅令恢复决策可脱离 Core 单元测试。

## 17. 阶段 C FrameFlow 事件历史查询解耦（2026-08-28）

本切片将事件历史的资源关联、排序和分页从 `FrameFlowCore` 迁为纯查询模块；命令执行、事件追加、投影更新与 HTTP 响应契约不变。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/history.ts` | 新增 | 纯事件历史查询：依据当前投影解析事件关联资源，按事务顺序附加 sequence/occurredAt，并实现游标分页。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 查询 `event.history` 时传入 Core 持有的事务和投影，保留原有校验、加载和公开 API。 |
| `canvas-agent/src/frameflow/history.test.ts` | 新增 | 直接验证 Run 关联事件的顺序、分页、事务元数据，以及无关联资源时不泄漏事件。 |
| `canvas-agent/package.json` | 修改 | 将事件历史查询回归加入正式 Agent 测试。 |
| `docs/session-development-record.md` | 修改 | 记录查询职责边界、文件关联与验证证据。 |

验证记录：先让测试导入不存在模块，得到预期 `ERR_MODULE_NOT_FOUND`；迁移后聚焦测试 2 项、`npm run build` 和完整 `npm test` 178 项均通过。随后在独立 `127.0.0.1:4173` 服务运行既有 Web Playwright 回归，15 项均通过。该切片没有更改事件数据、顺序、分页格式或用户可见历史，只使投影/查询边界可被独立验证；浏览器回归不外推为 95 项主清单全部人工验收。

## 18. 阶段 A 未跟踪项只读分类复核（2026-08-28）

本次只读取当前仍未跟踪的用户保留项，不执行 `add`、移动、删除、重命名或内容修改。

| 路径 | 分类 | 读取依据 | 处理结论 |
| --- | --- | --- | --- |
| `99_PERCENT_ACCEPTANCE.md` | 历史验收文档证据 | 文件明示为 2026-08-11 的限定范围 103 项应用内验收快照，且明确不代表当前完整仓库或外部服务验收。 | 保留为用户历史证据；不作为当前基线或运行依赖提交。 |
| `design-qa.md` | 设计 QA 记录 | 记录资产瀑布流的源图、隔离站点截图、视觉差异与当时的运行结论。 | 保留为用户设计审查证据；不作为运行依赖提交。 |
| `artifacts/` | 运行日志、截图与对比产物 | 目录只包含 FrameFlow/Design QA PNG、HTML 对比、验收 Markdown 及 Canvas Agent/Web 运行日志。 | 保留为用户真实证据资产；不纳入代码分支，也不清理。 |

结论：截至本次复核，这三项均不属于当前源码、构建脚本、测试夹具、依赖清单或部署配置。代码分支的可复现性验证应以已跟踪文件和隔离安装/测试为准；历史证据继续保留在原工作区，未经用户单独授权不得加入 Git 或处置。

## 19. 阶段 A 干净检出复现（2026-08-28）

使用系统临时目录的全新浅克隆 `C:\Users\13900\AppData\Local\Temp\infinite-canvas-clean-20260828-0453` 验证 fork 分支 `codex/frameflow-roadmap` 的 `eddb70b`。克隆完成后 Git 工作树为空；该目录不含原工作区的三个未跟踪证据项。

| 子项目 | 锁定安装 | 验证命令 | 结果 |
| --- | --- | --- | --- |
| `web/` | `npm ci` | `npm test`、`npm run typecheck`、`npm run build`、`npm run test:e2e` | 49 项 Vitest、类型、生产构建及 15 项 Playwright 均通过；生成 `dist/index.html`。 |
| `canvas-agent/` | `npm ci` | `npm test`、`npm run build` | 178 项测试与 TypeScript 构建均通过。测试中的 SSE/中断日志来自夹具。 |
| `docs/` | `bun install --frozen-lockfile` | `bun run check:content`、`bun run types:check`、`bun run build` | 内容清单（英文 25/中文 95/矩阵 95）、类型和 Next 生产构建均通过。 |

说明：Docs 只有 `bun.lock`，因此未使用会被 npm 正确拒绝的 `npm ci`；Bun 冻结安装完成后执行全部 Docs 门禁。验证不构建 Docker/Compose、不访问端口 3000 或 17371、不读取真实 Agent 凭据或用户资产。临时克隆保留在系统临时目录作为本轮可检查证据，未对原工作区执行清理或切换。

已同步更新双语 TODO：工程基线不再被列为待执行动作，改为引用本节的已完成证据；FrameFlow 逐项验收、核心模块治理与 CSP 仍保持为未完成后续事项。

## 20. 阶段 D Vercel CSP 报告模式（2026-08-28）

本切片只为 Vercel 静态托管增加观察型 CSP 响应头；不修改 Docker/Nginx、Canvas Agent CORS、用户配置的 Provider、WebDAV 或插件行为。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `vercel.json` | 修改 | 为全部 Vercel 路径发送 `Content-Security-Policy-Report-Only`。策略以 `default-src 'self'`、`object-src 'none'`、`frame-ancestors 'none'` 建立收敛基线；保留内联主题、用户模型脚本的 `unsafe-eval`、插件 Blob 模块和 HTTP(S) 外部连接，故不阻断现有功能。 |
| `web/scripts/check-csp-report-only.mjs` | 新增 | 读取部署配置并校验报告头及关键指令，避免后续无意删除安全基线。 |
| `web/package.json` | 修改 | 提供正式 `npm run check:csp` 检查命令。 |
| `docs/content/docs/support/browser-credential-threat-model*.mdx` | 修改 | 双语说明报告模式覆盖范围、保留的宽松来源、无集中报告端点以及转为强制模式前的迁移条件。 |
| `docs/session-development-record.md` | 修改 | 记录风险评估、文件关联、覆盖边界与验证要求。 |

验证记录：先运行新增检查命令，确认当前 Vercel 配置缺少 CSP 报告头而失败；补齐策略后应运行 `npm run check:csp`、Web 单元/类型/生产构建与 Docs 内容/类型/生产构建。报告头不等价于 CSP 强制保护：本应用仍有用户可信插件和用户脚本的高信任边界，Docker/自托管的响应头需在各自部署层单独设计。

## 21. 干净检出证据刷新至当前分支（2026-08-28）

为避免将旧提交的复现结果外推到 CSP 更新后的分支，保留原临时浅克隆并仅对该克隆执行快进：`eddb70b` → `69b3556`。快进后工作树仍为空，且 `eddb70b..69b3556` 没有 `canvas-agent/` 路径变更。

| 范围 | 当前提交复核命令 | 结果 |
| --- | --- | --- |
| `web/` | `npm run check:csp`、`npm test`、`npm run typecheck`、`npm run build`、`npm run test:e2e` | CSP 配置检查、49 项 Vitest、类型、生产构建和 15 项 Playwright 全部通过。 |
| `docs/` | `bun run check:content`、`bun run types:check`、`bun run build` | 内容清单、类型与 Next 生产构建通过；`.next/BUILD_ID` 已生成。 |
| `canvas-agent/` | 路径差异复核 | 当前提交相对第 19 节的已验证提交无源码变更，因此继续引用第 19 节在同一干净克隆完成的 178 项测试与构建证据。 |

边界：这证明 fork 的当前提交可在隔离 Windows 环境完成已列的本地质量门禁；它不证明 Vercel 已实际部署或已发送响应头，也不替代 95 项中文主清单的逐项人工验收。临时克隆继续保留，不删除、不纳入项目文件。

## 22. 阶段 C FrameFlow 事务结果映射解耦（2026-08-28）

本切片将已提交事务转换为命令响应的纯映射移出 `FrameFlowCore`；事件写入、幂等键命中、投影更新、资产隔离和 HTTP API 均保持由 Core/HTTP 层负责。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/transaction-result.ts` | 新增 | 纯函数：从事务生成事务 ID、序列、事件 ID 与资源定位；沿用既有的首事件资源和 `run.queued` 优先级规则。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 执行命令时委托新模块生成响应，保留原有公开结果类型和执行时序。 |
| `canvas-agent/src/frameflow/transaction-result.test.ts` | 新增 | 直接验证 Brief、Run 排队覆盖、重试与取消的资源映射及完整事件 ID。 |
| `canvas-agent/package.json` | 修改 | 将纯映射回归纳入正式 Canvas Agent 测试命令。 |
| `docs/session-development-record.md` | 修改 | 记录职责边界、测试先行过程、文件关联和验证证据。 |

验证记录：先让新测试导入尚不存在模块，得到预期 `ERR_MODULE_NOT_FOUND`；迁移原函数后，聚焦测试 3 项、`npm run build` 与完整 `npm test` 181 项均通过。该切片不改变命令响应内容，只令事务结果规则脱离大 Core 进行独立测试。

## 23. 路线图状态同步（2026-08-28）

`docs/post-development-roadmap.md` 的早期风险描述仍将工程基础设施视为未跟踪、将质量基线写为 Web 47 项与 Agent 168 项，已不符合当前 fork。现已依据阶段 A 干净检出、阶段 B 隔离主闭环、阶段 C 纯模块拆分与阶段 D 报告模式 CSP 的已验证证据同步状态。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `docs/post-development-roadmap.md` | 修改 | 阶段 A 标注完成，阶段 B 标注 P0 主闭环已覆盖，阶段 C/D 标注进行中；将质量基线更新为 Web 49 项、Agent 181 项和 15 项浏览器回归，并明确 92 项仍未验证、CSP 未进入强制模式。 |
| `docs/session-development-record.md` | 修改 | 记录文档状态更新依据和未完成边界。 |

验证要求：文档变更需继续通过内容清单、类型和生产构建；路线图中的“已完成”仅对应明确列出的隔离证据，不代表生产部署或主清单全量完成。

## 24. 阶段 C FrameFlow Prompt Diff 解耦（2026-08-28）

本切片将 Prompt 版本的差异分类与证据归属移出 `FrameFlowCore`；规划调用、偏好上下文组装、事件写入与 Prompt API 均保留在原职责边界。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/prompt-diff.ts` | 新增 | 纯函数：按字段生成 keep/add/change/remove/avoid Diff，并保留已采用/规避证据的去重与来源字段。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 规划 Prompt 时委托 Diff 模块，同时保留偏好上下文仍需的私有去重工具。 |
| `canvas-agent/src/frameflow/prompt-diff.test.ts` | 新增 | 直接验证五类分类中的 keep/add/change/remove/avoid、决策证据去重与规避来源字段。 |
| `canvas-agent/package.json` | 修改 | 将 Prompt Diff 纯函数回归纳入正式 Agent 测试命令。 |
| `docs/post-development-roadmap.md` | 修改 | 将 Agent 当前测试基线从 181 项更新为 183 项，并关联本节记录。 |
| `docs/session-development-record.md` | 修改 | 记录职责边界、失败诊断、文件关联和验证证据。 |

验证记录：先让测试导入未创建模块，得到预期 `ERR_MODULE_NOT_FOUND`；首次迁移后，TypeScript 构建和两项既有 Core 测试提示 `unique` 仍被偏好上下文组装使用，因此恢复该 Core 私有工具后重跑。最终聚焦测试 2 项、`npm run build` 与完整 `npm test` 183 项均通过。该切片未修改 Prompt Diff 协议、偏好事实或存储格式。

## 25. 阶段 C FrameFlow 偏好上下文解耦（2026-08-28）

本切片将“投影中的 Preference DNA → Planner 输入上下文”从 `FrameFlowCore` 移为纯模块；公开 `preference.dna` 查询、命令编排和 Agent Decision 校验仍保留在 Core。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/preference-context.ts` | 新增 | 纯函数：依托现有投影/Preference DNA，补齐评分、Comment 事件、Prompt 字段快照和同 Requirement 的证据上下文。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | Planner 上下文委托新模块；公开查询继续直接调用 `preferenceDna`，避免改变已有查询契约。 |
| `canvas-agent/src/frameflow/preference-context.test.ts` | 新增 | 验证跨 Brief 修订聚合、跨 Requirement 隔离、5 星权重、规避反馈、Comment 事件、Prompt 字段克隆。 |
| `canvas-agent/package.json` | 修改 | 将偏好上下文纯函数回归纳入正式 Agent 测试命令。 |
| `docs/post-development-roadmap.md` | 修改 | 干净检出证据更新到 `723b093`，并将 Agent 当前测试基线更新为 184 项。 |
| `docs/session-development-record.md` | 修改 | 记录职责边界、失败诊断、文件关联和验证证据。 |

验证记录：先导入未创建模块，得到预期 `ERR_MODULE_NOT_FOUND`。首次迁移时，测试错误地将 5 星当作 `+5`，实际领域权重为 `+3`；同时构建/全量测试显示 `preferenceDna` 仍被公开查询使用。修正测试期望并恢复该查询依赖后，聚焦测试 1 项、`npm run build` 与完整 `npm test` 184 项均通过。随后隔离干净克隆已快进至 `600ba8e`，复核 Agent 构建/184 项测试及 Docs 内容、类型、生产构建均通过；Web 源码自 `723b093` 的同一干净克隆全量验证后未变。

## 26. FrameFlow 隔离浏览器离线可见性复核（2026-08-28）

使用临时 Vite 服务 `127.0.0.1:4173` 和 Playwright CLI 打开 `/frameflow`，未连接 Canvas Agent、未访问端口 3000/17371，也未读取真实资产或凭据。

| 范围 | 结果 | 边界 |
| --- | --- | --- |
| 顶部导航与语言可访问名称 | 中文导航、FrameFlow 入口、配置与语言/主题控件在真实浏览器可见且可访问。 | 不验证各页面的已连接数据交互。 |
| FrameFlow 页面骨架 | 中文标题、说明、创建/自动跑风格/演化轨迹/待审/需求内偏好/运行与血缘等 8 个标签和创建页默认选中状态可见。 | 不代表真实 Agent、Provider 或 SSE 已连接。 |
| 离线引导 | 明确显示“先连接 Canvas Agent”及连接入口。 | 仅证明无 Agent 时的可见降级状态。 |

运行结束后已关闭浏览器和本轮 Vite 服务。CLI 生成的 `.playwright-cli/` 快照不属于验收资产，已加入根 `.gitignore`；当前执行环境拒绝删除该目录，故仅保留为被 Git 忽略的无敏感临时文件。该人工检查补强页面离线可见性，不将其外推为 95 项主清单的完整闭环验收。

## 27. 阶段 C FrameFlow Agent Decision 校验解耦（2026-08-28）

本切片将 Planner 对 Preference DNA 的证据完整性校验和 Agent Decision 映射移出 `FrameFlowCore`；Core 继续承担命令编排，并把新模块的校验失败转换为既有 `FrameFlowDomainError` 500 契约。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/agent-decision.ts` | 新增 | 纯领域规则：验证每条可用 Preference DNA 证据被恰好处置一次，并生成可持久化的 Agent Decision。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 调用规则模块并将专用校验错误恢复为原有 500 领域错误，保持自动跑失败处理和 HTTP 语义。 |
| `canvas-agent/src/frameflow/agent-decision.test.ts` | 新增 | 验证完整映射、可变数组复制，以及重复、不存在、遗漏证据的三种拒绝路径。 |
| `canvas-agent/package.json` | 修改 | 将 Agent Decision 纯规则回归纳入正式测试命令。 |
| `docs/post-development-roadmap.md` | 修改 | 将 Canvas Agent 当前测试基线更新为 186 项。 |
| `docs/session-development-record.md` | 修改 | 记录职责边界、错误契约与验证结果。 |

验证记录：先由测试导入未创建模块，得到预期 `ERR_MODULE_NOT_FOUND`；迁移后聚焦测试 2 项、`npm run build` 与完整 `npm test` 186 项均通过。该切片不改变 Planner 输入、事件格式或错误状态码，只使证据处置规则可脱离 Core 直接测试。

## 28. 阶段 D 生产依赖与凭据边界审计（2026-08-28）

本节只记录只读安全审计和威胁模型澄清，不修改 CORS、连接 Token、认证/授权协议、外部 Provider 或部署配置。

| 范围 | 核验方法 | 结果与边界 |
| --- | --- | --- |
| 生产依赖 | 官方 npm registry 的 `npm audit --omit=dev --audit-level=high`（Web/Canvas Agent），以及 `bun audit`（Docs） | 三者均报告 0 个已知漏洞；此前默认 npm 镜像不实现 advisories API，因此没有将该镜像错误误报为审计通过。 |
| 已跟踪凭据 | 仅按常见硬编码凭据与秘密文件名模式扫描已跟踪源码 | 未发现候选项；未读取用户本地配置、`.env` 或真实 Token。 |
| 动态执行与浏览器边界 | 检索 `new Function`、HTML 注入入口、Agent Token/CORS 实现 | 动态执行仅发现已知用户模型脚本路径；Agent 以 Token 与已记录 Origin 绑定访问。 |
| 启动 Token 输出 | 读取启动入口和接入说明 | 直接启动仍为手工/现有启动器配对而输出 Token 到标准输出；该协议风险已写入双语威胁模型，未在缺少授权时改变。 |

关联文件：`docs/content/docs/support/browser-credential-threat-model.mdx` 与 `browser-credential-threat-model.zh-CN.mdx` 新增可复核审计快照和配对协议边界说明；`docs/session-development-record.md` 保留本节的命令、结果与未解决项。验证要求：Docs 内容、类型与生产构建需通过；审计 0 漏洞不外推为深度代码审计、生产部署安全或 Token 协议已消除。

## 29. 提示词迁移 QA 夹具回归绑定（2026-08-28）

本切片不改变迁移实现或用户数据格式，只让已跟踪的隔离 QA 文件成为正式单元回归输入，防止样例与导入语义各自演进而失去关联。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/lib/prompt-knowledge-base/import-export.test.ts` | 修改 | 直接读取 `web/qa-fixtures/prompt-migration.json`，验证收录、两个已审核术语、配方、Prompt、模板及重映射后的引用血缘；与既有缺失引用用例共同覆盖正常迁入和待修复保留。 |
| `web/qa-fixtures/prompt-migration.json` | 既有夹具（未修改） | 提供不含真实资产或凭据的确定性迁移输入。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 20 项补充可复核的自动化局部证据，状态仍保持“未验证”。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关联、边界及验证要求。 |

验证要求：运行聚焦 Vitest、完整 Web 单元测试、类型检查和生产构建。该回归只证明迁移领域语义；缺失引用在实际导入页面的可见待修复状态、审核列表超过 8 条时的滚动访问，仍须隔离浏览器验收，不能据此将第 20 项标记为通过。

## 30. 提示词迁移隔离浏览器回归（2026-08-28）

本切片为第 20 项增加真实浏览器覆盖；使用 Playwright 的独立浏览器上下文和临时 Vite `127.0.0.1:4173`，不访问项目常用 3000/17371 端口、不读取真实浏览器存储、资产或凭据。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/prompt-migration.spec.ts` | 新增 | 在“提示词库 → 我的仪表盘”真实入口上传已跟踪 QA 夹具，验证迁入数量、收录、已审核术语、配方、完整 Prompt、运行时词库和 PromptFill 自定义模板；再以内存 JSON 注入缺失收录引用，验证页面显示“引用待修复”。 |
| `web/qa-fixtures/prompt-migration.json` | 既有夹具（未修改） | 提供正常审核血缘迁入的确定性输入。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 20 项更新为单元与浏览器局部证据，仍保持“未验证”。 |
| `docs/session-development-record.md` | 修改 | 记录浏览器执行路径、隔离边界与保留验收缺口。 |

验证记录：新增用例首次失败，原因是默认 `/prompts` 打开“公开提示词库”而非导入所在的“我的仪表盘”；补上真实标签路径后，第二次失败指出已访问的 Ant Design 隐藏标签页保留同名 Prompt，故将运行时断言限定到可见面板。最终聚焦浏览器用例 1 项与完整 Web Playwright 16 项均通过。Web 单元测试当前为 15 个文件/50 项，类型检查、生产构建、CSP 检查和 Docs 内容/类型/生产构建也通过。`npm run format:check` 仍报告未触达且不在基线内的 `e2e/frameflow-task-context.spec.ts`、`scripts/check-csp-report-only.mjs`；新增 `e2e/prompt-migration.spec.ts` 已单独通过 Prettier 检查，未为消除该既有基线漂移修改无关文件。此证据仍不覆盖审核列表超过 8 条时的滚动访问，不能把第 20 项标为完整通过。

## 31. 阶段 C FrameFlow 生成准备规则解耦（2026-08-28）

本切片将三条生成路径复用的裁剪位置判定与失败槽位事件构造移出 `FrameFlowCore`；生成 Provider 调用、资产写入、Run 收尾、事件格式和 HTTP 契约均未改变。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/generation-plan.ts` | 新增 | 纯生成准备规则：基于 Prompt 语义选择 `top` 或 `attention` 裁剪位置；为每个失败 slot 构造带独立 event ID 和错误快照的既有 `run.slot_failed` 事件。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 以导入调用新模块，保留排队、重试与自动跑三条既有生成路径和所有外部类型。 |
| `canvas-agent/src/frameflow/generation-plan.test.ts` | 新增 | 验证界面语义与普通 Prompt 的裁剪选择，以及多槽位失败的 ID 独立性和错误快照。 |
| `canvas-agent/package.json` | 修改 | 将新纯规则测试纳入正式 Canvas Agent 测试命令。 |
| `docs/post-development-roadmap.md` | 修改 | 将 Canvas Agent 当前测试基线更新为 188 项。 |
| `docs/session-development-record.md` | 修改 | 记录职责边界、测试先行过程和验证结果。 |

验证记录：先由新测试导入尚不存在模块，得到预期 `ERR_MODULE_NOT_FOUND`；迁移后聚焦测试 2 项、Canvas Agent TypeScript 构建和完整 `npm test` 188 项均通过。该切片不改变生成裁剪的正则规则、slot 失败事件字段、随机 ID 来源或任何 Provider 行为，只使可复用的生成准备规则脱离大 Core 单独测试。

## 32. 提示词迁移审核门禁与长列表验收（2026-08-28）

本切片关闭中文主清单第 20 项的剩余验收缺口：待修复迁入项必须无法机器/人工审核，且超过 8 条时仍可在审核列表中滚动访问。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/pages/prompts/dashboard.tsx` | 修改 | 对带 `validationErrors` 的审核行禁用“机器校验”和“人工通过”；保留“返修”入口，以便用户标注修复需求。 |
| `web/e2e/prompt-migration.spec.ts` | 修改 | 在隔离浏览器迁入 10 条缺失收录引用的术语，验证全部状态标签、滚动容器可滚动、最早记录可滚动到可见区域，以及两个批准入口禁用。 |
| `web/src/lib/prompt-knowledge-base/import-export.test.ts` | 修改 | 对缺失收录、词条或配方引用的 term/recipe/prompt 同时断言待修复状态，并验证各类审核操作被领域层拒绝。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 20 项改为“自动化通过”；汇总改为 2 项自动化通过、91 项未验证。 |
| `docs/post-development-roadmap.md` | 修改 | 同步当前未验证项数。 |
| `docs/session-development-record.md` | 修改 | 记录验收路径、实际缺口与完成边界。 |

验证记录：先扩展浏览器用例，首次因同名状态标签的严格定位失败，改为数量断言；随后真实暴露待修复项的审核按钮仍可点击。页面禁用逻辑补齐后，因早先启动的 Vite 子进程仍监听 4173 而继续命中旧代码；只读核验其命令行确认它是本轮临时服务后，精确停止该 PID，改用直接 Node 启动的新临时 Vite，聚焦浏览器用例通过。随后迁移单元测试通过。该路径不访问 3000/17371、真实浏览器存储、资产或凭据；状态升级仅对应主清单第 20 项，不外推其余 91 项。

## 33. 个人提示词运行时的生图/视频入口回归（2026-08-28）

本切片为中文主清单第 19 项增加两个工作台入口的隔离浏览器证据；画布节点入口尚未进行真实交互验收，因此本项状态保持“未验证”。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/personal-prompt-runtime.spec.ts` | 新增 | 导入 QA 审核血缘与一条待修复术语后，分别在生图和视频工作台打开公共提示词库，切换“我的可用库”，验证 4 条已审核运行时内容可见、待修复项不可见。 |
| `web/src/components/prompts/prompt-select-dialog.tsx` | 既有共享组件（未修改） | 由生图、视频和画布提示词入口共同使用；本节只验证前两个实际入口。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 19 项补充单元/浏览器局部证据与画布待验收边界。 |
| `docs/post-development-roadmap.md` | 修改 | 浏览器回归基线更新为 17 项。 |
| `docs/session-development-record.md` | 修改 | 记录交互时序、文件关联和未覆盖范围。 |

验证记录：新增用例先假设个人库在弹窗首帧即显示 4 项；实际浏览器快照表明首次打开为“我的可用库 (0)”，切换个人库后才异步 hydrate 本地存储，故改为真实点击后等待可见 segmented 项更新为 4 项。第二次定位到 Ant Design 隐藏 radio input，改为点击可见 `.ant-segmented-item` 容器。最终聚焦浏览器用例 1 项通过。该证据不读取真实数据、资产或凭据，也不代表画布节点入口已完成验收。

## 34. 个人提示词运行时的画布入口与偏好排序验收（2026-08-28）

本切片补齐中文主清单第 19 项的画布节点真实浏览器交互，并将偏好排序的五星优先、低评分降权和软删除路径固定为单元测试；第 33 节中“画布待验收”的边界由本节完成并替代。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/personal-prompt-runtime.spec.ts` | 修改 | 在既有生图/视频验证之外，新建隔离画布，双击画布插入图片节点，打开节点的提示词库并切换“我的可用库”；验证 4 条已审核内容可见、待修复术语不可见。 |
| `web/src/lib/prompt-knowledge-base/personal-prompt-options.test.ts` | 修改 | 为个人运行时提示词排序加入五星反馈优先、低评分降权与软删除项末置的回归断言。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 19 项升为“自动化通过”；汇总更新为 3 项自动化通过、90 项未验证。 |
| `docs/post-development-roadmap.md` | 修改 | 同步当前测试、浏览器回归和未验证项基线。 |
| `docs/session-development-record.md` | 修改 | 记录画布交互时序、覆盖边界与文档关联。 |

验证记录：画布路径使用独立浏览器 origin 和一次性迁移夹具，依次进入 `/canvas?mode=new`、等待新建画布 URL、双击可编辑画布、选择“图片”、点击节点“提示词库”，再切换“我的可用库”。聚焦浏览器用例 2 项通过，个人偏好排序单元测试通过；后续完整 Web、Docs 门禁见本次提交记录。该证据不访问 3000/17371、真实个人数据、资产或凭据，也不包含真实 Provider、Canvas Agent SSE 或 Docker/容器部署验收。

## 35. FrameFlow Requirement 查询投影职责拆分（2026-08-28）

本切片落实阶段 C 的单一职责约束：将 Requirement 当前修订、归档/替代状态和可继续探索判定从 `FrameFlowCore` 提取为无副作用的查询投影函数；命令编排、事件写入、持久化与公开 `FrameFlowCore` API 保持不变。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/query-projection.ts` | 新增 | 纯函数：计算 Requirement 的当前 Brief、查询状态和 Auto Run 是否可继续探索；输入仅为投影与领域对象。 |
| `canvas-agent/src/frameflow/query-projection.test.ts` | 新增 | 在不创建工作区、不访问存储的条件下，验证当前修订、归档/替代状态与 `vary` 机器审图的继续探索条件。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 改用查询投影函数；保持命令、查询、错误消息、事件和文件读写路径不变。 |
| `canvas-agent/package.json` | 修改 | 将新增纯函数测试加入正式 Canvas Agent 测试命令。 |
| `docs/post-development-roadmap.md` | 修改 | 同步 Canvas Agent 189 项测试基线及阶段 C 当前进展。 |
| `docs/session-development-record.md` | 修改 | 记录测试先行、职责边界、验证结果和文件关联。 |

验证记录：先新增测试并导入尚不存在的 `query-projection` 模块，得到预期 `ERR_MODULE_NOT_FOUND`；实现后聚焦测试通过。首次完整 TypeScript 构建暴露 3 处遗留的 Core 私有调用，均替换为同一纯函数入口后，Canvas Agent 完整 `npm test` 189 项与 `npm run build` 通过。该切片不触及 Web、浏览器端口、真实资产、运行中的 Agent、Docker/容器部署或外部服务。

## 36. FrameFlow Prompt 血缘查询职责拆分（2026-08-28）

本切片继续阶段 C 的单一职责拆分：将 Prompt 父子版本链与关联 Agent Decision 的只读投影移出 `FrameFlowCore`；Core 仍负责查询参数解析与将缺失 Prompt 转换为既有 `FrameFlowDomainError` 404 契约。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/prompt-lineage.ts` | 新增 | 纯投影函数：以 FrameFlow 投影和 Prompt ID 生成父子版本链、关联决策快照；通过错误工厂保持调用方错误语义。 |
| `canvas-agent/src/frameflow/prompt-lineage.test.ts` | 新增 | 验证父子版本按根到叶顺序、只关联命中决策，并验证返回对象不会回写投影。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 公开 `prompt.lineage` 查询委托纯投影函数，保留 schema 解析、等待队列和 404 领域错误。 |
| `canvas-agent/package.json` | 修改 | 将新增 Prompt 血缘单元测试纳入正式 Canvas Agent 测试命令。 |
| `docs/post-development-roadmap.md` | 修改 | 同步 Canvas Agent 190 项测试基线和阶段 C 当前进展。 |
| `docs/session-development-record.md` | 修改 | 记录测试先行、契约保留、验证结果与文件关联。 |

验证记录：先新增模块导入测试，得到预期 `ERR_MODULE_NOT_FOUND`；实现后聚焦单元测试通过。完整 Canvas Agent `npm test` 190 项及 `npm run build` 均通过。该切片不改变 HTTP 路由、事件格式、持久化、Prompt 版本字段、Agent Decision 字段、外部 Provider 行为或运行服务。

## 37. FrameFlow 自动跑轨迹查询职责拆分（2026-08-28）

本切片继续阶段 C 的只读模型拆分：将自动跑、Brief、事务事件、Run、Prompt、图片和机器审图汇总为演化轨迹的逻辑移出 `FrameFlowCore`；Core 仍负责查询解析、跨轮总结编排和既有领域错误契约。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/auto-run-trajectory.ts` | 新增 | 纯投影函数：从投影和事实事务构造 `auto_run.trajectory`，补齐 Requirement 状态、继续探索能力、轮次、机器审图与摘要快照。 |
| `canvas-agent/src/frameflow/auto-run-trajectory.test.ts` | 新增 | 验证空轮次稳定输出、继续探索状态及缺失 Auto Run 时的错误工厂委托；复杂多轮和归档路径由既有 Core/HTTP 回归覆盖。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 公开轨迹查询和跨轮总结输入改为调用纯投影函数，保留 404/500 领域错误、写队列和总结器调用。 |
| `canvas-agent/package.json` | 修改 | 将新增自动跑轨迹单元测试纳入正式 Canvas Agent 测试命令。 |
| `docs/post-development-roadmap.md` | 修改 | 同步 Canvas Agent 191 项测试基线及阶段 C 当前进展。 |
| `docs/session-development-record.md` | 修改 | 记录测试先行、依赖边界、验证结果与文件关联。 |

验证记录：先新增模块导入测试，得到预期 `ERR_MODULE_NOT_FOUND`；实现后聚焦测试通过。完整 Canvas Agent `npm test` 191 项与 `npm run build` 均通过。现有 Core 与 HTTP 用例继续覆盖多轮排序、机器审图、归档血缘、摘要和 API 返回结构。该切片不触及运行服务、Web、真实资产、外部 Provider 或 Docker/容器部署。

## 38. 室内设计工作流的隔离浏览器验收（2026-08-28）

本切片关闭中文主清单第 21 项的 UI 主路径证据：在隔离浏览器 origin 上传已跟踪 QA 平面图、选择整张图并创建无限画布工作流；真实画布侧栏显示 8 个节点，三段 Codex 引导和视频节点均可见。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/qa-fixtures/qa-99-image.svg` | 既有夹具（未修改） | 作为隔离浏览器的平面图输入；不读取或写入真实用户资产。 |
| `web/src/pages/interior/index.tsx` | 既有实现（未修改） | 提供上传、选区、整图选择与创建工作流的用户入口；本节以真实浏览器执行该路径。 |
| `web/src/lib/canvas/interior-canvas-workflow.ts` | 既有实现（未修改） | 构造 8 节点、10 连线及 Codex 指引节点链。 |
| `web/src/lib/canvas/interior-canvas-workflow.test.ts` | 既有回归（未修改） | 覆盖节点数、连线数、Codex ImageGen 元数据与候选主图选择。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 21 项升为“人工通过”；汇总更新为 1 项人工通过、89 项未验证。 |
| `docs/post-development-roadmap.md` | 修改 | 同步当前未验证项基线。 |
| `docs/session-development-record.md` | 修改 | 记录浏览器交互、证据边界和文件关联。 |

验证记录：使用独立 Playwright CLI 会话和临时 Vite `127.0.0.1:4173`，先确认 `/interior` 首屏的 6 步流程、8 节点说明和前置禁用状态；上传 QA SVG 后确认“平面图已上传”，点击“使用整张图”后工作流创建按钮启用，点击后跳转到新 `/canvas/<id>`。画布侧栏显示“画布元素 8”，并列出 01 原始平面图至 08 室内漫游视频，其中 03、05、07 三个 Codex 提示词节点的引导文本可见。既有纯单元测试验证同一构造器输出 8 节点、10 连线。未连接 Canvas Agent，也未调用真实 ImageGen、视频 API 或 Docker；以上外部调用不由本项验收声称覆盖。结束后精确关闭 Playwright 会话与临时 Vite，3000/17371 原服务未受影响。

## 39. 设计系统主题与键盘路径的隔离浏览器验收（2026-08-28）

本切片关闭中文主清单第 23 项。验收同时检查首屏主题初始化、浅色主题色同步、画布库键盘路径以及生成工作台和画布设置控件的可达性；第 22 项上游 v0.15.1 的 Freestylefly、图片节点多图和 Agent 功能仍未覆盖，继续保持“未验证”。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/index.html` | 既有实现（未修改） | 在 React 模块启动前读取主题持久化值，设置根节点 class、`data-ds-theme`、`color-scheme` 和浏览器 `theme-color`，避免深色偏好首帧闪白。 |
| `web/src/components/layout/app-providers.tsx` | 既有实现（未修改） | React 已挂载后继续同步主题 class、浏览器主题色和 Ant Design 主题，确保切换后的状态一致。 |
| `web/src/components/canvas/canvas-project-card.tsx` | 既有实现（未修改） | 提供可 Tab 聚焦并由 Enter 打开的原生画布标题按钮，以及选择、重命名、导出、删除操作。 |
| `web/src/pages/image/index.tsx`、`web/src/pages/video/index.tsx`、`web/src/components/audio-settings-panel.tsx` | 既有实现（未修改） | 分别提供图像、视频与画布音频设置控件，供键盘焦点与原生控件可达性核验。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 23 项改为“人工通过”；汇总更新为 2 项人工通过、88 项未验证。 |
| `docs/post-development-roadmap.md` | 修改 | 同步当前未验证项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本次真实浏览器交互、源代码边界和临时产物说明。 |

验证记录：使用独立 Playwright CLI 会话与临时 Vite `127.0.0.1:4173`。以深色偏好创建隔离画布，首屏已是深色；切换浅色后，浏览器实际读取到 `data-ds-theme=light`、无 `dark` class、`colorScheme=light` 与 `theme-color=#fafaf9`，刷新后主题仍保持。源码进一步确认上述首屏主题写入发生在 `index.html` 的模块脚本之前。画布库中创建一次性空画布，选中卡片后按 Tab 焦点落到标题原生按钮且具有浏览器焦点轮廓，按 Enter 进入该画布；再返回库完成选择、重命名、零节点 ZIP 导出及确认删除。生图质量、视频清晰度和画布音频设置面板均在真实浏览器显示可访问的输入/选项；前两者通过 Tab 取得明确焦点轮廓，音频面板渲染了声音、格式、语速与声音指令控件。导出的零节点 ZIP 仅位于被 Git 忽略的 `.playwright-cli/` 临时会话目录，不含真实资产；本节不访问 3000/17371，不连接 Agent，不调用外部生成服务，也不包含 Docker/容器部署。

## 40. 提示词筛选响应式与键盘验收（2026-08-28）

本切片关闭中文主清单第 25 项。以真实公共提示词列表验证窄宽度下分类与标签各自有独立横向滚动轨道，桌面恢复左侧纵向筛选栏，并检查键盘激活语义；没有新增或修改任何提示词、资产、浏览器持久化数据或业务代码。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/pages/prompts/index.tsx` | 既有实现（未修改） | 提供 1100px 以下独立横向轨道、桌面 `lg` 左侧筛选栏，以及 `aria-pressed` 与 Enter/Space 键盘激活处理。 |
| `web/src/styles/globals.css` | 既有实现（未修改） | 为筛选按钮提供与主题一致的活动和焦点视觉状态。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 25 项改为“人工通过”；汇总更新为 3 项人工通过、87 项未验证。 |
| `docs/post-development-roadmap.md` | 修改 | 同步当前未验证项基线。 |
| `docs/session-development-record.md` | 修改 | 记录响应式尺寸、键盘时序和证据边界。 |

验证记录：独立 Playwright CLI 会话在 `127.0.0.1:4173/prompts` 读取公开提示词列表。1000px 宽度下，分类轨道 `clientWidth=937`、`scrollWidth=1208`，标签轨道 `clientWidth=937`、`scrollWidth=50778`，二者实际计算样式均为 `overflow-x:auto` 与 `flex-wrap:nowrap`；没有换行堆叠或卡片受挤压。先选中 `all` 分类、Tab 到 `Banana Prompt Quicker`、按 Enter 后该分类显示 `aria-pressed=true` 并将列表更新为 323 条；为避免状态更新导致的旧焦点误判，再按实际路径选中“工作”、Tab 到“海报”、按 Space 后“海报”显示 `aria-pressed=true` 且结果继续过滤。1280px 宽度下，侧栏实际为 `position:sticky`、`overflow-y:auto`，可视高度 804、内容高度 2924，分类与标签轨道均恢复 `overflow-x:visible` 与 `flex-wrap:wrap`。开始时曾在鼠标点击标签后直接按空格，重渲染已使旧元素失焦；复测采用真实 Tab 路径后确认键盘行为正确。结束后关闭 Playwright 与临时 Vite；3000/17371 原服务未受影响，也未连接 Agent、执行外部生成、使用 Docker 或写入用户资产。

## 41. 资产瀑布流与资产库操作的隔离浏览器验收（2026-08-28）

本切片关闭中文主清单第 17 项。全部测试资产仅存在于独立 Playwright browser origin：使用已跟踪的 QA SVG 创建两张图片资产，不读取、修改或删除用户的真实资产、未跟踪文件或 3000/17371 服务数据。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/pages/assets/index.tsx` | 既有实现（未修改） | 提供资产种类/标签、搜索、排序、密度、隐藏视图、新增以及导入导出入口；本节以真实浏览器执行其主路径。 |
| `web/qa-fixtures/qa-99-image.svg` | 既有夹具（未修改） | 作为隔离图片资产输入，原始尺寸为 320x240；不属于用户真实资产。 |
| `.playwright-cli/我的资产.zip` | 临时且 Git 忽略 | 由隔离浏览器导出并立即回导，验证 ZIP 包含 2 个资产、2 个媒体文件和可复用校验结果；不纳入提交。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 第 17 项改为“人工通过”；汇总更新为 4 项人工通过、86 项未验证。 |
| `docs/post-development-roadmap.md` | 修改 | 同步当前未验证项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本次浏览器主路径、临时文件边界和端口保护结果。 |

验证记录：在临时 Vite `127.0.0.1:4173/assets` 创建“瀑布流宽图”与“瀑布流隐藏图”后，实际读取瀑布流列 `column-width=292px`、`column-gap=16px`；QA SVG 自然尺寸 320x240，渲染尺寸 335x251、`object-fit=contain`，保持 4:3 原比例。五星“强化”与一星“强降权”分别改变卡片评分和审美偏好；选择“高评分”后五星资产位于一星资产之前。标题搜索可收敛到单项，输入不存在词后显示“没有匹配条件的资产”与“清除筛选”。密度切换实际在 `column-width=232px` 和 `292px` 间往返。点击导出产生 `我的资产.zip`；随即导入该包，页面报告“已校验：2 个资产、2 个媒体文件、3.5 KB；可重新导入”，并实际导入 2 个资产。对一星资产执行 Soft delete 后，正常资产库从 4 降至 3；“已隐藏”视图仅显示该 1 项并提供“恢复到库中”，恢复后正常库回到 4 项。结束时精确关闭浏览器会话和本轮监听 4173 的 Vite，复核 3000（PID 37996）及 17371（PID 42544）仍在监听；不涉及 Agent、外部生成服务或 Docker/容器部署。

## 42. 标题 Token 一致性修复与部分隔离验收（2026-08-28）

本切片修复中文主清单第 24 项已经定位的标题 Token 漂移：路由级骨架与顶栏 Agent 懒加载此前已存在，但首页和图像、视频、画布、资产页没有统一引用设计系统的 display/title Token。真实已连接 Agent 的历史、日志和会话保留仍未在本轮验证，因此状态矩阵的第 24 项继续保持“未验证”。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/router.tsx` | 既有实现（未修改） | 全部路由已通过 `lazy` 和 `Suspense` 使用带 `aria-busy` 的骨架，而不是空白回退。 |
| `web/src/pages/home/index.tsx` | 修改 | 首页唯一的 `h1` 改为 `page-display`，继承设计系统 display 尺寸、700 字重与紧凑行高。 |
| `web/src/pages/image/index.tsx`、`web/src/pages/video/index.tsx` | 修改 | 两个工作台的唯一 `h1` 改为 `page-title`，消除本地 `text-2xl font-semibold` 偏差。 |
| `web/src/pages/canvas/index.tsx` | 修改 | 画布库的唯一 `h1` 改为 `page-title`，保留原有外边距与文案。 |
| `web/src/pages/assets/index.tsx` | 修改 | 在资产筛选栏上方增加可见的“我的资产” `h1.page-title`，使页面具有一致的标题层级和可访问名称。 |
| `web/src/styles/globals.css`、`web/design-system/css/tokens.css` | 既有实现（未修改） | `page-title` 和 `page-display` 分别绑定 32px、52px 的设计 Token，并强制 700 字重。 |
| `docs/session-development-record.md` | 修改 | 记录标题修复、浏览器实测值和未覆盖的 Agent 连接边界。 |

验证记录：隔离 Vite `127.0.0.1:4173` 下，首页 `h1` 实测为 52px、700、56.16px 行高；资产、图像工作台、视频工作台、画布库和配置页 `h1` 均为 32px、700。切换浅色主题后，资产标题仍为 32px、700，根节点为 `data-ds-theme=light`。空资产库仍明确显示“新增资产”按钮。点击“打开 Agent”可展开面板，页面实际暴露对话、历史、技能、日志标签及连接设置；在未建立隔离 Agent 连接的前提下，不声称覆盖已有连接、对话、历史和日志的保留语义。结束时关闭 Playwright 和临时 Vite，3000（PID 37996）及 17371（PID 42544）未受影响；未执行外部生成、未写入用户资产且不涉及 Docker/容器部署。

## 43. 配置、生成与画布控件的可访问性及按需加载验收（2026-08-28）

本切片关闭中文主清单第 04 项。所有交互位于独立 Playwright browser origin 和本轮临时 Vite `127.0.0.1:4173`；没有连接 Agent、读取 Token、导入用户资产或访问用户正在运行的 3000/17371 服务。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/pages/image/index.tsx`、`web/src/pages/video/index.tsx` | 既有实现（未修改） | 提供具名的对齐、透明背景、清晰度、时长和数量控件；本节通过真实浏览器确认其可访问名称、状态与键盘切换。 |
| `web/src/pages/config/index.tsx`、`web/src/components/layout/channel-editor-drawer.tsx`、`web/src/components/layout/model-script-editor.tsx` | 既有实现（未修改） | 配置页首访按需加载渠道编辑器和脚本编辑器；点击“编辑”及“调用脚本”后分别显示对应界面。 |
| `web/src/components/canvas/canvas-toolbar.tsx`、`web/src/components/canvas/canvas-appearance.tsx` | 既有实现（未修改） | 提供具名画布外观开关与节点插件入口；焦点上的 Space 不被画布平移快捷键抢占。 |
| `web/src/components/agent/agent-skills-view.tsx` | 修改 | 为 Skill 创建对话框增加 `forceRender`，使 `Form.useForm` 在未连接 Agent 时已有挂载的表单容器，消除打开“技能”标签产生的 Ant Design 表单警告，且不改变连接或 Skill 操作语义。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 04 项记为“人工通过”，并同步未验证项总数为 85。 |
| `docs/session-development-record.md` | 修改 | 记录本次交互、修复、端口保护和证据边界，满足对话级可追溯要求。 |

验证记录：配置页首访的网络请求中没有 `channel-editor-drawer.tsx` 或 `model-script-editor.tsx`；点击“编辑”后显示“编辑渠道”对话框，点击“调用脚本”后显示模型脚本编辑器。隔离浏览器依次确认：生图页的“16 倍数对齐”和“透明背景”开关、视频页的“清晰度”和“秒数”数值控件、提示词来源的具名来源开关、画布外观的“图片信息”开关、节点插件入口，以及 Agent 面板的“对话/历史/技能/日志”标签均有清晰的可访问名称或状态。对已获得焦点的“16 倍数对齐”、提示词来源和“图片信息”按 Space 均实际切换自身状态；画布开关可从已选中切换为未选中，未触发画布平移。未连接的 Agent “技能”标签按产品预期显示“连接 Agent 后查看 Skill”并禁用操作；修复后以全新浏览器会话重复打开该标签，控制台为 0 errors、0 warnings，之前的 `useForm` 未连接表单警告不再出现。结束时精确关闭浏览器会话与监听 4173 的临时 Vite，复核 3000（PID 37996）和 17371（PID 42544）仍在监听；不涉及真实 Agent、外部生成或 Docker/容器部署。

## 44. FrameFlow 图片预览全入口隔离回归（2026-08-28）

本切片关闭中文主清单第 05 项。新增浏览器夹具完全拦截 FrameFlow 查询、命令与图片请求；只使用内存中的 1×1 PNG 和固定路由响应，不读取真实 Agent Token、用户资产、3000/17371 服务数据或 Docker/容器环境。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-preview.spec.ts` | 修改 | 新增跨入口预览回归：运行与血缘成功结果、演化轨迹同轮图片、待审右侧当前图片，以及 Preference DNA 的强化/规避/Comment 证据图。验证预览集合切换、缩放、旋转、翻转、关闭与零命令写入。 |
| `web/src/pages/frameflow/index.tsx`、`web/src/pages/frameflow/trajectory-view.tsx`、`web/src/pages/frameflow/review-view.tsx`、`web/src/pages/frameflow/preference-view.tsx` | 既有实现（未修改） | 四个页面均以 `Image`/`Image.PreviewGroup` 提供图片预览；本节通过真实 Chromium 浏览器覆盖可见入口。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 05 项记为“自动化通过”，并同步未验证项总数为 84。 |
| `docs/session-development-record.md` | 修改 | 记录夹具、操作范围、无写入断言和质量门禁边界。 |

验证记录：新用例先在演化轨迹点击“第 1 轮图片 1”，验证仅在该轮 2 张图片间从 `1 / 2` 切换到 `2 / 2`，随后实际执行 `zoomIn`、`zoomOut`、`rotateLeft`、`rotateRight`、`flipX`、`flipY` 与关闭操作。它再分别从运行与血缘的“生成结果 1”、待审检查器的“当前审核图片”、偏好页的“强化方向图片 image-a”“规避方向图片 image-b”“Comment 证据 image-a”打开预览；预览关闭后仍可见原始血缘结果、评分 `5 星`、Comment 与对应证据卡。所有命令路由均被收集并最终断言为空数组，因此放大、浏览和变换不会写入评分、Comment、soft delete 或其他反馈。该用例及同文件的既有同轮切换用例在 Chromium 中共 2 项通过，完整 Playwright 套件为 19 项通过；Web 单测 15 文件/50 项、生产构建和文档内容/类型/生产构建均通过。`format:check` 已不报告本次的预览用例，但仍因保留的 `.playwright-cli` 证据文件及既有 `e2e/frameflow-task-context.spec.ts`、`scripts/check-csp-report-only.mjs` 报告 6 项基线外格式问题；本切片不格式化、更改或删除这些用户/既有内容。不将夹具图片或浏览器回归外推为真实外部模型、Agent SSE 或生产部署验收。

## 45. FrameFlow Prompt 中英审核与执行原文隔离回归（2026-08-28）

本切片关闭中文主清单第 06 项。浏览器测试只使用被 Playwright 路由拦截的固定 Prompt、Brief 与命令响应；Agent 测试为纯请求构建器测试。两者都不连接真实 Agent、调用外部模型、读取 Token、写入用户工作区或使用 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-prompt-language.spec.ts` | 新增 | 使用隔离浏览器验证新 Prompt 默认中文审核、English/中英对照切换、无页面横向溢出、批准/提交仍使用同一 Prompt Version，以及历史 Prompt 的补译、刷新保留和不重复调用。 |
| `canvas-agent/src/agent/codex-frameflow-requests.test.ts` | 修改 | 为含中文展示翻译的 Prompt 加入 ImageGen 请求断言，确保执行请求保留英文 `compiledPrompt`、技术/负面字段且不携带中文展示文案。 |
| `canvas-agent/src/frameflow/core.test.ts` | 既有实现（未修改） | 已验证翻译事件幂等、英文原文不变，并在 Core 重启后保留中文翻译。 |
| `web/src/pages/frameflow/create-view.tsx`、`canvas-agent/src/frameflow/core.ts`、`canvas-agent/src/agent/codex-frameflow-requests.ts` | 既有实现（未修改） | 分别提供中文默认审核视图、翻译持久化及执行请求只读取英文原文的边界。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 06 项记为“自动化通过”，并同步未验证项总数为 83。 |
| `docs/session-development-record.md` | 修改 | 记录浏览器/Agent 夹具、文件关联、测试结论和真实服务边界。 |

验证记录：新 Prompt 夹具带有中文展示稿时，创建页默认可见“陶瓷花瓶”且英文完整执行 Prompt 不显示；切换 English 后显示 `A matte ceramic vase, centered product shot, softbox lighting, warm white background.`，切换“中英对照”后两种语言并存，根文档的 `scrollWidth <= clientWidth`。批准与“开始生成 4 张”依次发出 `prompt.approve`、`run.start`，二者均指向同一英文 Prompt Version。历史 Prompt 夹具初始无翻译时显示“旧版本尚无中文展示稿”，点击“生成中文版本”后展示中文完整 Prompt、按钮消失；刷新页面后中文仍在，命令序列只有一次 `prompt.translate`。纯 Agent 请求测试把同一 Prompt 加入中文展示翻译后，断言 ImageGen 请求仍包含 `已批准 Prompt：a red chair`、英文 Negative，且不包含中文翻译。加上既有 Core 翻译测试，覆盖翻译的幂等、英文原文稳定与重启持久化；本切片完整回归为 Agent 191 项、Web 单测 15 文件/50 项、Playwright 21 项和 Docs 内容/类型/生产构建通过。`format:check` 继续仅报告保留 `.playwright-cli` 证据及既有两个文件的 6 项基线外问题，不包含本次新文件；不将隔离夹具外推为真实 Codex/外部模型生产调用。

## 46. FrameFlow Prompt 长文本响应式隔离回归（2026-08-28）

本切片关闭中文主清单第 07 项。由于不应连接真实 Canvas Agent、读取用户 Token 或触碰 3000/17371 服务，浏览器回归沿用既有 FrameFlow Prompt 路由夹具，在内存中返回固定 Brief、Prompt 和中文展示翻译；只新增超长英文返回值，不写入用户工作区、真实资产或 Docker/容器环境。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-prompt-language.spec.ts` | 修改 | 为既有隔离 Prompt 夹具增加可选字段与完整 Prompt 注入，并新增超长英文 Tag/完整 Prompt 的响应式回归；在 1280px、768px、390px 验证三/二/一列布局及所有溢出边界。 |
| `web/src/pages/frameflow/create-view.tsx` | 既有实现（未修改） | 以 `min-w-0` 栅格卡片、`overflow-wrap:anywhere` Tag 与完整 Prompt 的保留换行样式承载长文本。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 07 项记为“自动化通过”，同步自动化通过数为 6 项、未验证数为 82 项和浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录本次夹具范围、文件关联、浏览器尺寸和质量门禁，满足对话级可追溯要求。 |

验证记录：夹具使用重复 12 次的无空格英文 `cinematic-reference-token-0123456789-`，填充主体、构图、色彩、光线、材质、布局、氛围、呈现方式、技术参数与避免项共 10 个字段，并将同一长 Token 写入含显式换行的完整 Prompt。真实 Chromium 在 1280px、768px、390px 下分别读到 3、2、1 条计算后的栅格列；每个字段卡、每个 Ant Design Tag、完整 Prompt 的 `scrollWidth` 均不大于 `clientWidth`，根文档同样没有横向滚动。完整 Web 浏览器套件为 22 项通过，Web 单元测试为 15 个文件/50 项通过，生产构建通过。`npx playwright-cli --help` 在当前依赖中没有可执行入口，因此本项使用仓库既有 `@playwright/test` 隔离夹具；该选择不影响真实端口、Agent 或用户资产。文档内容、类型与生产构建门禁均已通过；`format:check` 已知仍保留 6 项非本切片格式基线问题，不为消除它们改写或删除用户/既有文件。

## 47. FrameFlow 自动跑首轮设置与停止隔离回归（2026-08-28）

本切片关闭中文主清单第 08 项的 UI 设置缺口。浏览器测试以本地路由夹具返回内存 Brief 与 Auto Run，不访问真实 Canvas Agent、3000/17371、外部 Provider、用户资产或 Docker/容器；Core 测试仍使用系统临时目录，负责验证异步状态机而非浏览器呈现。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-auto-run.spec.ts` | 新增 | 通过自动跑页的真实表单输入自由方向、可选任务名称、画幅、探索方式、每轮数量和最大轮数；验证首轮立刻呈现“Codex 规划第 1 轮”和“停止自动跑”，停止后保留同一任务的“继续自动跑”入口与精确命令顺序。 |
| `web/src/pages/frameflow/daily-view.tsx` | 既有实现（未修改） | 提供自由方向表单、1–8/1–20 边界、即时启动/停止/恢复控件与“人工反馈可选”提示。 |
| `canvas-agent/src/frameflow/core.test.ts` | 既有实现（未修改） | 已直接覆盖自动迭代至上限、机器审图失败恢复、完成态 `vary` 的 `auto_run.extended`、规划/生成/审图期间停止、迟到结果与重启持久化。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 08 项记为“自动化通过”，同步自动化通过数为 7 项、未验证数为 81 项和浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录夹具范围、文件关联、失败诊断和质量门禁，满足对话级可追溯要求。 |

验证记录：首次测试把 Ant Design 虚拟 Select 直接定位到未进入可视窗口的 `9:16` 选项，导致 30 秒定位超时；页面快照证明自动跑页面和首轮卡片均已正确渲染，失败仅来自测试选择器。改为在实际可见下拉层选择 `4:5` 与“大胆探索”后，通过自由方向提交精确发出 `brief.create`、`auto_run.create`，后者包含同一 Brief、每轮 2 张和最大 3 轮。启动请求返回 Auto Run 资源时页面不跳转，真实可见 `Codex 规划第 1 轮`、`停止自动跑`；停止后显示“已停止”和“继续自动跑”，命令序列追加唯一 `auto_run.stop`。完整 Web 门禁为 23 项 Playwright、15 个文件/50 项单元测试和生产构建通过；Canvas Agent 为 191 项测试与生产构建通过；Docs 内容、类型与生产构建通过。格式基线和真实服务边界继续按第 46 节保留，不将路由夹具外推为外部模型生产调用。

## 48. FrameFlow 演化轨迹多轮隔离回归（2026-08-28）

本切片关闭中文主清单第 09 项。由于 Windows Bash 兼容层无法启动 Playwright CLI 包装器（`Bash/0x80070422`），且 CLI 不能在不使用受限代码注入的情况下拦截 Agent 请求，本项沿用仓库的 `@playwright/test` 路由夹具；所有数据、图片和命令均在内存中，不访问真实 Agent、3000/17371、外部服务、用户资产或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-trajectory.spec.ts` | 新增 | 为同一 Auto Run 提供三轮 Prompt、Run、图片与 Machine Review，验证宽屏并排比较、Prompt Revision/评分/决策、Diff 折叠展开、390px 横向轨道与“打开本轮完整血缘”的精确 URL。 |
| `web/src/pages/frameflow/trajectory-view.tsx` | 既有实现（未修改） | 提供按轮次的横向卡片、窄屏滚动轨道、折叠 Prompt Diff 与 Run 血缘跳转。 |
| `canvas-agent/src/frameflow/auto-run-trajectory.ts`、`canvas-agent/src/frameflow/core.test.ts` | 既有实现（未修改） | 轨迹仅筛选同一 Auto Run 的 `auto_run.iteration_started` 事件；Core 真实临时工作区回归验证多轮的迭代顺序、Prompt Revision、图片与 Machine Review 血缘。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 09 项记为“自动化通过”，同步自动化通过数为 8 项、未验证数为 80 项和浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录 CLI 兼容性限制、隔离夹具、文件关联和门禁边界。 |

验证记录：用例在 1280px 下展示第 1 至第 3 轮的并排卡片、`Prompt r2` 和 `Codex 4/5 · 继续变体`；三张卡的顶边坐标一致。第二轮默认折叠的“查看 Prompt Diff 与规划依据”展开后显示真实规划依据及 `本轮：off-center`。在 390px 下，轨道外层的 `scrollWidth > clientWidth`，第二轮左边界仍位于视口内，保留下一轮可见提示；点击第二轮“打开本轮完整血缘”后 URL 精确包含同一 Auto Run 和 `run-traj-2`。初次断言误写 `vary` 的显示文案为“变化”，经实现核对后修正为实际的“继续变体”；第二次失败发现横向滚动属于外层容器而非 `ol`，修正后通过。完整 Web 门禁为 24 项 Playwright、15 个文件/50 项单元测试和生产构建通过；Canvas Agent 为 191 项测试与生产构建通过；Docs 内容、类型与生产构建通过。格式基线保持不改写用户或既有文件。

## 49. FrameFlow 跨轮总结生成、持久化与更新隔离回归（2026-08-28）

本切片关闭中文主清单第 10 项。既有 Core 使用临时工作区覆盖后台总结、不可变事件、重启持久化、证据轮次校验和 Preference DNA 隔离；新增浏览器夹具只返回内存轨迹与总结响应，不连接真实 Agent、3000/17371、外部 Provider、用户资产或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-trajectory.spec.ts` | 修改 | 新增跨轮总结闭环：两轮完整审图时生成总结、刷新仍保留；模拟追加第三轮后显示待分析，并以 `force=true` 更新到最新轮。 |
| `web/src/pages/frameflow/trajectory-view.tsx` | 既有实现（未修改） | 呈现持续改善、连续未解决、真实证据轮次、最佳轮次与新轮次待更新状态。 |
| `canvas-agent/src/frameflow/core.ts`、`canvas-agent/src/frameflow/core.test.ts` | 既有实现（未修改） | 只把完整 Machine Review 轮次交给总结器，验证引用轮次、写入 `auto_run.trajectory_summarized`、重启保留及不影响人工偏好。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 10 项记为“自动化通过”，同步自动化通过数 9、未验证数 79 与浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录隔离范围、测试失败诊断和回归证据。 |

验证记录：初次总结路由的精确 URL 模式未覆盖实际请求，页面按安全错误提示“本地 Agent 请求失败”停留；扩展为 Auto Run summarize URL 匹配后通过。用例在两轮完整审图时点击“生成跨轮总结”，显示“推荐第 2 轮”、改善项“主体层次”和持续问题“霓虹控制”；刷新后该总结仍由查询响应呈现。模拟第三轮完成后，旧总结明确标记“有新轮次待分析”；点击“更新到最新轮”后显示“推荐第 3 轮”、移除待分析标记，并记录请求参数顺序 `[false, true]`。完整质量门禁在提交前执行；格式基线继续保留既有 6 项，不改写用户文件。

## 50. FrameFlow 参考图隔离资产选择回归（2026-08-28）

`web/e2e/frameflow-reference-picker.spec.ts` 新增：在浏览器原生 IndexedDB 的 `infinite-canvas/app_state` 写入仅含 1×1 PNG 的合成资产，使 localForage/Zustand 正常水合；创建页打开“选择 FrameFlow 参考图”，选中“隔离参考图”并确认后，页面显示该缩略图。该夹具不访问真实资产、Agent、3000/17371 或 Docker。首次尝试 localStorage 回退未被 localForage 已选定的 IndexedDB 驱动读取；改用原生 IndexedDB 后通过。此证据只覆盖选择和回写，参考图上传校验、刷新恢复及重新填写仍待验收，主清单第 11 项继续保持“未验证”。

## 51. FrameFlow 受控参考图导入、绑定与刷新恢复隔离回归（2026-08-28）

本切片扩展第 50 节的浏览器夹具，但不关闭中文主清单第 11 项。它只通过 Playwright 路由返回内存响应，不访问真实 Canvas Agent、用户资产、3000/17371、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-reference-picker.spec.ts` | 修改 | 在合成 1×1 PNG 资产被选择后，验证浏览器以 `image/png` 调用参考图导入，后续 `brief.create` 输入绑定受控 Reference Asset ID，`round.plan` 得到同样绑定的 Prompt；刷新后由会话恢复 Brief、Prompt 和“已恢复/已绑定 1 张受控参考图”提示。 |
| `web/src/pages/frameflow/create-view.tsx` | 既有实现（未修改） | 负责浏览器资产 PNG 化、导入、Brief/Prompt 创建、会话写入及重载恢复。 |
| `web/src/services/api/frameflow.ts` | 既有实现（未修改） | 提供参考图导入、Brief/Prompt 命令与查询边界。 |
| `docs/session-development-record.md` | 修改 | 记录本次测试夹具、修正过的测试时序和验收边界，满足对话级可追溯要求。 |

验证记录：第一次扩展后，`/agent/frameflow/commands` 和 `/agent/frameflow/query` 的拦截模式错误地要求 URL 带查询字符串，造成请求没有命中、界面安全地吞下错误并停留在填写页；改为覆盖无查询参数路径后，发现原生 IndexedDB 写入与应用首次 localForage 水合的竞态。用例现先在页面内确认 `infinite-canvas/app_state` 的 `infinite-canvas:asset_store` 已存在，再重载后打开选择器，因此不把夹具初始化时序误判为产品缺陷。最终断言命令顺序为 `brief.create`、`round.plan`，并确认第一个命令的 `referenceImageIds` 为 `controlled-reference`；首次与刷新后的 Prompt 均显示受控绑定。目标用例和本文件格式检查通过。图片超过 20MB/非法格式、1–4 上限、搜索/取消/空资产、重新填写的全新幂等键，以及批准后真实 ImageGen 路径仍未覆盖，故第 11 项状态继续保持“未验证”，不将该隔离夹具外推为真实生成或生产部署验收。

## 52. FrameFlow 创建页参考图边界与新工作流隔离回归（2026-08-28）

本切片继续补齐第 11 项，但不改变其“未验证”状态。所有浏览器数据为 Playwright 的内存路由、浏览器 Canvas 生成的 1×1 WebP 或 Vite 隔离页面中直接设置的 Zustand 资产 store；不读取真实用户资产、不连接 3000/17371、不调用外部 Provider，也不使用 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-reference-picker.spec.ts` | 修改 | 将成功夹具改为浏览器 Canvas 生成的有效 WebP，导入拦截明确断言 `image/png` 内容类型和 PNG 文件头；覆盖 Brief/Prompt 受控 ID 绑定、刷新恢复及“重新填写”后第二次 `brief.create`/`round.plan` 使用不同工作流幂等键。 |
| `web/e2e/frameflow-reference-picker-limits.spec.ts` | 新增 | 在 Vite 浏览器页直接设置应用正在使用的 Zustand 资产 store，覆盖资产名称/标签搜索、取消不回写、选择上限 4 张和第五张禁用、解除一张后重新启用、空资产明确引导，以及 20MB 以上 PNG 在浏览器端阻断且不会调用参考图导入、Brief 或 Prompt 命令。 |
| `web/src/pages/frameflow/reference-asset-picker.tsx`、`web/src/pages/frameflow/create-view.tsx`、`web/src/lib/frameflow-reference.ts` | 既有实现（未修改） | 分别提供选择器边界、工作流重置和栅格图 PNG 化/20MB 限制。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 更新第 11 项当前已有证据和本次对话级可追溯记录。 |

验证记录：选择器夹具写入 5 张合成图片后，按“建筑”标签搜索仅显示“建筑光影”；连续选中 4 张时计数为 `4/4` 且第五张禁用，取消第 4 张后为 `3/4` 且第五张重新可选。点击 Modal 的取消按钮后创建页仍显示“未选择参考图”，重新打开计数回到 `0/4`；空资产单独显示“我的资产里还没有图片，请先到‘我的资产’导入”且确认按钮禁用。超大用例用路由返回 `20 * 1024 * 1024 + 1` 字节的 PNG，页面显示“转换后超过 20MB”，Prompt 不出现且所有 `/agent/frameflow/**` 请求数组为空。首次 WebP 夹具使用手写 Base64，Chromium 无法解码；改为浏览器 Canvas 生成有效 WebP 后，参考图导入路由接收到明确 PNG MIME 与 8 字节 PNG 签名。高并发复跑曾暴露 IndexedDB 预置与应用水合的夹具竞争；页面内直接写入又会在 localForage 已打开状态下悬挂。因此改为等待持久化水合结束后，直接设置 Vite 页面正在使用的 Zustand 资产 store：保留真实页面和组件交互，但不再依赖持久化层时序。该方式下完整 Playwright 29 项在 16 worker 下通过，文档内容检查也通过。非法图由 Agent 返回的验证错误、其他格式和真实已批准 Prompt 到 ImageGen 受控路径仍未被该夹具覆盖，主清单第 11 项继续保持“未验证”。

## 53. FrameFlow 待审人工反馈与删除语义隔离回归（2026-08-28）

本切片关闭中文主清单第 12 项。`web/e2e/frameflow-review-feedback.spec.ts` 以固定 1×1 PNG、内存队列和命令路由依次操作同一待审图片：点击“5 星：强化”后验证 `feedback.append/rating=5` 与检查器 `5 星` 回显；保存 Comment 后验证独立 `feedback.append/comment`；确认“不喜欢并学习”后页面显示“已隐藏”和恢复入口；最后确认“删除（不参与学习）”，仅发送 `image.delete`，队列变为空且显示“还没有可审核的 FrameFlow 图片”。既有 `frameflow-task-context.spec.ts` 继续覆盖隐藏后的恢复命令，Core 临时工作区测试覆盖评分、评论、隐藏与恢复的领域事件/偏好语义。全部为隔离路由，不访问真实 Agent、资产、3000/17371 或 Docker。矩阵第 12 项改为“自动化通过”，自动化通过数为 10、未验证数为 78；不将该证据外推为真实外部模型或生产部署验收。

## 54. FrameFlow 机器审图状态隔离回归（2026-08-28）

`web/e2e/frameflow-machine-review-state.spec.ts` 使用当前 `reviewing` Auto Run 的两张图片（一张尚未审完、一张已有 Machine Review）和一张历史图片。进入全部任务范围时，当前图片显示“Codex 审图中”及 `机器审图 1/2 张`；切换历史图片后不再显示该提示，明确回退为“无机器审图记录”。该夹具仅拦截请求并返回内存 PNG，不访问真实 Agent、用户资产、3000/17371 或 Docker。矩阵第 13 项改为“自动化通过”，自动化通过数为 11、未验证数为 77。

## 55. FrameFlow Preference DNA 证据与硬约束隔离回归（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-preference-dna.spec.ts` | 新增 | 以隔离路由和内存 PNG 验证 Preference DNA 的五项概览指标、强化/规避图片、评分、Comment 与不可变事实事件计数；未审核图片不得进入 DNA，页面必须声明同一需求隔离和硬约束保护。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 将主清单第 14 项标为“自动化通过”，并关联页面夹具与核心 Planner 证据。 |
| `docs/post-development-roadmap.md` | 修改 | 将持续验收债务从 77 项同步为 76 项。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关联、隔离范围与验证结论，满足仓库 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：新增浏览器夹具返回同一 Brief 的两条已审核反馈和一条未审核图片：DNA 为净权重 `+1`、有效样本 `2`、强化 `1`、规避 `1`、质量拒绝 `1`；强化/规避卡片分别显示图片、评分、Comment 与 `2/3` 条事实事件，未审核图片不会渲染为 DNA 证据。页面同时显示“严格按需求隔离”，明确偏好不能覆盖主体、用途、画幅与必须保留/避免等硬约束。对应 Core 用例“Codex Planner 只在同一 Creative Brief 内继承人工偏好证据”通过，验证下一次 `round.plan` 带入图片 ID、有符号权重、评分、Comment、Prompt Version 与原 Prompt 字段，并将另一 Creative Brief 的偏好完全排除。所有测试使用临时 Vite 4173、内存路由和系统临时 Core 工作区，不访问真实 Agent、用户资产、3000/17371、外部 Provider 或 Docker。矩阵第 14 项改为“自动化通过”，自动化通过数为 12、未验证数为 76。

## 56. FrameFlow 运行与血缘任务隔离、重试与取消回归（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-lineage.spec.ts` | 新增 | 隔离浏览器回归：当前 Auto Run 只显示其真实轮次批次；`autoRunId=all` 显示手动与归档运行；失败 slot 的重试只提交该 slot，成功图片保持且重试图片回显尝试次数；Decision/Diff 保持按需展开；取消运行后显示已取消 slot 与隔离区迟到文件。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 将主清单第 15 项更新为“自动化通过”，关联页面与 Core 证据。 |
| `docs/post-development-roadmap.md` | 修改 | 将持续验收债务从 76 项同步为 75 项。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关系、命令语义和隔离边界，满足 `AGENTS.md` 的记录要求。 |

验证记录：夹具先以一个当前任务的部分成功 Run、一条手动 Run 和一条归档 Run 进入运行与血缘页；当前任务范围只显示前者并统计 `1` 条，`autoRunId=all` 后显示三条。错误 slot 的“重试 1 个失败项”只发出 `run.retry(run-current, [slot-retry])`；页面随后保留第一张成功图片、显示第二张重试图片和“尝试 2 次”。展开“查看生成依据与 Prompt 变更”后可见 Agent Decision 与 Prompt Diff。另一夹具对运行中的 batch 确认取消，验证 `run.cancel`、slot 的“已取消”及 quarantine 提示。Core 定向用例验证指定失败 slot 重跑仍保留原成功图片，且取消后的迟到生成文件被移入 quarantine。均为 Vite 4173、内存路由和系统临时工作区，未访问用户资产、3000/17371、外部 Provider 或 Docker。矩阵第 15 项改为“自动化通过”，自动化通过数为 13、未验证数为 75。

## 57. FrameFlow 默认任务定位与全部范围刷新补强回归（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-task-context.spec.ts` | 修改 | 扩展同一隔离夹具：直接访问不带 `autoRunId` 的运行与血缘、待审均选择最新活动任务；访问 `autoRunId=all` 后确认旧任务批次出现并在刷新后保持全部范围。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 更新第 02 项的局部证据与未覆盖边界，状态仍为“未验证”。 |
| `docs/session-development-record.md` | 修改 | 保留本次验证路径、失败定位及边界，满足 `AGENTS.md` 的记录要求。 |

验证记录：该用例以两个 Auto Run（最新和旧任务）及对应的 Run/Review 夹具运行。先直达 `/frameflow?view=lineage`，页面将 URL 写为 `autoRunId=auto-run-new&runId=run-new`，且只显示“最新探索”；再直达 `/frameflow?view=review`，URL 同样保持最新任务且只显示最新图片。最后直达全部范围并刷新，`autoRunId=all` 不被默认选择逻辑回写，旧任务批次仍可见。一次尝试以键盘模拟 Ant Select 的切换未可靠触发选项提交，故不把这部分外推为下拉主动切换已验收；第 02 项继续保持“未验证”。所有数据为 Vite 4173 的内存路由夹具，不访问真实 Agent、用户资产、3000/17371、外部 Provider 或 Docker。

## 58. 浏览器回归基线计数同步（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `docs/post-development-roadmap.md` | 修改 | 将当前基线的 Playwright 总数从历史的 25 同步为当前全套 `bun run test:e2e` 已通过的 34，并补充新增 FrameFlow 覆盖范围。 |
| `docs/session-development-record.md` | 修改 | 记录该数字为当前基线更正，而非回改历史阶段性测试结论。 |

验证记录：在本次第 02、14、15 项补强后，Web `bun run test:e2e` 输出为 `34 passed`；文档内容检查继续验证中文主清单 95 项、英文摘要 25 项和状态矩阵 95 项。此更新仅校正路线图的“当前基线”描述，不把 34 项浏览器回归外推为 95 项验收全部完成。

## 59. 按需加载、标题 Token 与资产空态隔离回归（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/routes.spec.ts` | 修改 | 新增共享 Suspense 骨架、首页/工作台标题 token 的深浅主题样式和资产空态/筛选空态回归。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 为第 24 项补充已验证范围与未覆盖的 Agent 状态保持边界，状态继续为“未验证”。 |
| `docs/post-development-roadmap.md` | 修改 | 将当前完整 Playwright 基线同步为 37 项，并列出新增覆盖。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关系、浏览器夹具和剩余验收边界。 |

验证记录：通过延迟 Vite 的唯一 `/src/pages/not-found/index.tsx` 懒模块响应，首次访问该路由先出现 `aria-busy=true` 的共享加载骨架，模块完成后骨架消失并显示 404；该路由同样经 `lazyPage` 使用共享 Suspense fallback，避免并发测试已缓存配置模块造成的非确定性。首页 `h1.page-display` 计算样式为 `52px/700`；配置、提示词、资产、画布、生图、视频、室内和 FrameFlow 的 `h1.page-title` 均为 `32px/700`，从深色切换浅色后仍保持 700。资产夹具先验证空库“新增资产”，再注入一条内存文本资产、输入无匹配条件，显示“没有匹配条件的资产”和“清除筛选”。这些验证不访问真实资产、3000/17371、外部 Provider 或 Docker。顶部 Agent 打开后的连接、对话、历史和日志状态保持尚未由本节夹具覆盖，因此第 24 项仍为“未验证”；全套浏览器基线为 37 项。

## 60. 顶部 Agent 状态保持隔离回归（2026-08-28）

本切片关闭中文主清单第 24 项的最后一项可见行为。测试在 Vite 临时 4173 服务中拦截 Agent 历史、单线程快照、模型与 Skill 请求；不连接或读取真实 17371、3000、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/routes.spec.ts` | 修改 | 以预置的已连接 Agent store 和隔离 HTTP 响应，验证顶部“打开 Agent”显示既有对话与连接状态；“收起 Agent”后再次打开仍显示同一对话，并在历史、日志标签中显示原线程和日志。 |
| `web/src/stores/use-agent-store.ts` | 既有实现（未修改） | `closePanel` 仅关闭视觉面板、保留 `panelMounted` 和会话状态；该行为是回归断言的实现依据。 |
| `web/src/layouts/user-layout.tsx`、`web/src/components/agent/agent-panel.tsx` | 既有实现（未修改） | 惰性挂载 Agent 面板并在状态允许时保持面板实例，供顶部导航按钮重新打开。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 24 项更新为“自动化通过”，同步自动化通过数为 14、未验证数为 74 和浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录夹具边界、文件关系、失败定位及最终验证，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：第一版路由拦截使用 `**/agent/**`，意外匹配 `/src/components/agent/agent-panel.tsx` 的懒加载模块，浏览器报“Failed to fetch dynamically imported module”；已将范围收紧为 `http://127.0.0.1:4173/agent/**`，使接口夹具不会覆盖前端模块。随后以精确 accessible name 定位顶部“收起 Agent”，避免与面板内“收起 Agent 面板”重名。完整 16 并发回归还暴露原懒加载骨架断言的固定延迟竞态，现由夹具扣住模块响应、确认骨架可见后再放行。最终全套 `bun run test:e2e` 为 38 项通过，Web `bun run typecheck` 与文档内容检查也通过；不将隔离状态保持外推为真实 Agent 连接或外部模型验收。

## 61. 浏览器业务数据失败保护回归（2026-08-28）

本切片关闭中文主清单第 03 项。新增浏览器回归直接使用 Chromium 的 IndexedDB：不修改业务实现，不访问真实 3000、17371、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/prompt-dashboard-storage.spec.ts` | 新增 | 验证提示词知识库、PromptFill 自定义模板和图片反馈真实写入后刷新仍保持；在三者已建立的 IndexedDB 连接上拦截 `transaction` 并抛出 `QuotaExceededError`，验证保存拒绝不提交内存、读取拒绝不覆盖内存且仪表盘显示统一安全告警。 |
| `web/src/lib/persisted-state.ts`、`web/src/lib/persisted-state.test.ts` | 既有实现（未修改） | `persistBeforeCommit` 先等待浏览器存储成功，才提交 Zustand 内存；单元测试覆盖同一原子保证。 |
| `web/src/stores/use-prompt-knowledge-base-store.ts`、`web/src/stores/use-prompt-fill-store.ts`、`web/src/stores/use-image-feedback-store.ts` | 既有实现（未修改） | 三类业务 store 在保存/读取失败时保留现有内存并记录错误，供页面告警呈现。 |
| `web/src/pages/prompts/dashboard.tsx` | 既有实现（未修改） | 汇集三类 store 错误，并显示“浏览器数据未能安全保存或读取”。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 03 项标为“自动化通过”，同步自动化通过数为 15、未验证数为 73 和浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录真实浏览器存储夹具、失败诊断、文件关系和验证边界，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：首次精确文本断言失败，是因为仪表盘将来源 `manual` 与采集内容渲染在同一容器中，非持久化或状态错误；改为匹配可见内容后通过。第一条用例依次调用三个真实 store API，刷新后重新导入模块并确认知识库采集、PromptFill 模板和图片反馈仍在。第二条用例只在各 store 完成水合后替换现有 `IDBDatabase.prototype.transaction`，对 `prompt_knowledge_base` 与 `image_feedback` 对象仓库抛出 `QuotaExceededError`；三次保存均为 rejected，三个 Zustand 容器没有出现待写数据，三条错误均进入仪表盘告警。再预置内存数据并调用三类 `hydrate`，读取失败后内存数据保持且告警继续显示。目标两项浏览器回归和 Web 类型检查通过；全套浏览器基线将在提交前重新执行，不把此隔离 IndexedDB 夹具外推为其他业务存储或生产浏览器配额验收。

## 62. FrameFlow 默认任务主动范围切换回归（2026-08-28）

本切片关闭中文主清单第 02 项。测试延续既有 Vite 4173 内存路由夹具，只模拟两个活动 Auto Run 及其图片/批次；不访问真实 Agent、3000、17371、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/frameflow-task-context.spec.ts` | 修改 | 先验证待审和运行与血缘无 `autoRunId` 直达时自动定位最新任务；再实际点击两处 Ant Select 的可见浮层选项，选择“全部任务与手动生成”及“全部运行与手动生成”，确认旧图片/批次出现，刷新后均保持 `autoRunId=all`。 |
| `web/src/pages/frameflow/review-view.tsx`、`web/src/pages/frameflow/index.tsx` | 既有实现（未修改） | 分别提供待审任务范围与运行血缘任务范围的 Select、URL 写入及刷新读取逻辑。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 02 项标为“自动化通过”，同步自动化通过数为 16、未验证数为 72。 |
| `docs/session-development-record.md` | 修改 | 记录 Ant Select 的可访问性虚拟节点与可见浮层区分、真实交互方式及验证边界。 |

验证记录：首次尝试按全局 `role=option` 点击，命中了 Ant Select 为无障碍辅助渲染的隐藏虚拟 option；随后在组合框后代查找也失败，因为实际下拉浮层使用 portal。错误上下文显示真实可点击项位于可见 `.ant-select-dropdown`，而虚拟 listbox 只保留 `aria-label`/值。测试改为先滚动对应 combobox 入视口并打开，再限定 `.ant-select-dropdown:visible .ant-select-item-option` 按可见中文标签点击；该操作触发真实 `onChange` 与 URL 状态更新。目标用例通过，完整浏览器基线将在提交前重新执行；此证据仍不包括真实模型生成或跨浏览器差异。

## 63. Agent 模型与推理强度隔离回归（2026-08-28）

本切片关闭中文主清单第 26 项。测试在 Vite 临时 4173 服务中拦截 Canvas Agent HTTP 接口，使用仅供测试的模型清单和内存请求记录；不连接真实 17371、3000、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-model-controls.spec.ts` | 新增 | 覆盖模型清单过滤、模型切换后的推理强度联动、刷新持久化、发送载荷和本地“日志”回显。 |
| `web/src/components/agent/local-agent-panel.tsx`、`web/src/components/agent/agent-chat-composer.tsx` | 既有实现（未修改） | 前者从实际模型接口过滤内部审查/重复/无有效强度项、持久化选择并把模型与强度传给 turn 与日志；后者按当前模型渲染对应强度选项。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 26 项更新为“自动化通过”，同步未验证数为 71 和浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录模型筛选、UI 交互、请求和日志证据以及隔离边界，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：夹具返回内部 `codex-auto-review`、两个同名 Terra、Terra、Mini 以及仅支持无效 `auto` 强度的模型。页面只显示一项 Terra 与 Mini，内部/重复/无有效强度条目均不可选；选择 Mini 后，下拉只显示“轻度”和“极高”，不会遗留 Terra 的“中”。选择“极高”并刷新后，模型和强度仍是 Mini/极高。随后输入测试任务并发送，截获 `/agent/codex/turn` 载荷为 `model=gpt-5.4-mini`、`effort=xhigh`，右侧“日志”显示 `Mini · 极高 · 验证模型请求参数`。此前两次测试失败仅因选择了旧 placeholder 而该输入框使用 accessible name，以及日志页同时在摘要与详情渲染同一文本；改用 `role=textbox` 和精确文本的首个可见实例后通过。这些结论不外推为真实账号模型目录、真实 Codex 调用、SSE 流或跨浏览器兼容性验收。

## 64. Agent 新对话即时清空与线程隔离回归（2026-08-28）

本切片关闭中文主清单第 27 项。Vite 临时 4173 的测试夹具预置一个已经完成的旧会话，故意暂停 `/agent/codex/threads/reset` 响应，再以仅供测试的新会话响应恢复；不连接真实 17371、3000、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/local-agent-panel.tsx` | 修改 | `startNewThread` 发起重置前立即清空活动线程、消息、工具/审批与 token 使用量，并递增历史读取序列，使在途旧历史请求失效；会话进入准备态直到服务返回新会话。 |
| `web/e2e/agent-new-thread.spec.ts` | 新增 | 验证延迟重置期间旧消息立即消失；新会话准备完成后的首条任务带新线程 ID；历史列表不出现夹具的新空线程。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 27 项标为“自动化通过”，同步未验证数为 70 和浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录即时 UI 状态、异步历史失效、请求绑定和隔离边界，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：原实现先等待重置接口再应用会话状态，因此网络准备期间仍可能看到旧消息；同时在途历史读取没有被新对话操作明确作废。现在点击“新对话”同步设置空活动线程、空消息和 `preparing` 会话，随后异步重置；按钮运行时输入不可提交，服务返回 `thread-new` 后才恢复可发送状态。夹具首先确认“旧会话消息”已消失，再输入“只发送到新会话”，截获 `/agent/codex/turn` 的 `threadId=thread-new`；进入历史后仅显示旧会话，没有 `thread-new` 空历史条目。实现仅采用项目既有的 Zustand `setAgentState` 补丁和序列号失效机制；React 19.2 的状态批处理说明支持在事件处理器启动异步请求前先提交一致的 UI 状态（[React 官方文档](https://react.dev/learn/queueing-a-series-of-state-updates)）。未对真实多标签 SSE、实际 Codex 空线程目录或跨浏览器行为作外推。

## 65. Agent 读取画布卡片的历史恢复回归（2026-08-28）

本切片关闭中文主清单第 28 项。测试只构造 Canvas Agent 内存历史，不读取真实画布、用户资产、3000、17371、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/agent/codex-history.test.ts` | 修改 | 新增 `canvas_get_state` 历史投影回归，验证八类节点/连线精确计数、空画布和失败错误文本。 |
| `canvas-agent/src/agent/codex-history.ts` | 既有实现（未修改） | 从 MCP 历史结果解析画布节点与连线，并生成可在刷新后恢复的中文工具卡片摘要。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 28 项标为“自动化通过”，同步未验证数为 69 与 Canvas Agent 192 项测试基线。 |
| `docs/session-development-record.md` | 修改 | 记录测试数据、历史恢复范围与验证边界，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：同一已完成历史 turn 依次返回完整画布、空画布及失败读取。完整画布精确显示 `3 个文本、5 张图片、2 个配置、1 个视频、1 个音频、1 个分组、1 个其他节点、4 条连线`；空结果显示“当前画布为空”；失败项显示“读取画布超时”且 detail 状态为 `failed`。该路径经 `threadMessages` 投影，正是刷新或恢复历史对话使用的来源，因此证明摘要不会只存在于实时事件中。全量 Canvas Agent 测试为 192 项通过；不外推为真实 Agent 调用、可视化卡片布局或跨标签焦点选择验收。

## 66. Agent 首次发送与草稿恢复回归（2026-08-28）

本切片关闭中文主清单第 29 项。两条用例均在 Vite 临时 4173 中拦截 Agent HTTP，不连接真实 17371、3000、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-first-send.spec.ts` | 新增 | 隔离验证首次发送的乐观用户消息和输入清空、失败草稿恢复、以及请求在途新草稿的保留。 |
| `web/src/components/agent/local-agent-panel.tsx` | 既有实现（未修改） | 发送前先以 `clientMessageId` 加入用户消息并清空草稿；失败时移除待发送消息且仅在没有后续草稿时恢复初始输入。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 29 项标为“自动化通过”，同步未验证数为 68 和浏览器回归基线。 |
| `docs/session-development-record.md` | 修改 | 记录成功、失败及并发草稿三种状态的隔离验证范围，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：失败夹具返回 `500 / 测试发送失败`。点击发送后，用户消息先立即出现在对话中，失败处理移除该待发送消息、恢复“失败后应恢复的草稿”并显示真实错误文本。成功夹具则暂停 turn 响应：首条消息已显示而输入为空；随后模拟任务运行期间写入“运行中保留的新草稿”，再放行成功响应，草稿仍在。输入框是 contenteditable `textbox`，因此断言使用可访问角色及文本，而非 input value。两条定向浏览器回归通过；不外推为真实 SSE 思考动画、附件恢复、实际 Codex 线程创建或跨浏览器验收。

## 67. Agent 动态工具名称、失败与历史回归（2026-08-28）

本切片关闭中文主清单第 30 项。测试只使用格式化函数和 Canvas Agent 内存历史，不调用真实 Agent、3000、17371、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-event-formatters.ts` | 修改 | 将 `dynamic_tool_call` 纳入右侧事件日志，与 MCP 工具一样记录调用、完成/失败及真实错误。 |
| `web/src/components/agent/agent-event-formatters.test.ts` | 新增 | 验证实时动态工具卡片和日志均使用 `image_gen` 的具体名称，失败正文/详情/日志保留“图片服务不可用”。 |
| `canvas-agent/src/agent/codex-history.test.ts` | 修改 | 验证动态工具完成后恢复具体结果，失败历史仍有具体名称和错误详情。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 30 项标为“自动化通过”，同步未验证数为 67、Web 51 与 Agent 193 项测试基线。 |
| `docs/session-development-record.md` | 修改 | 记录实时/历史两个投影的测试关联与边界，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：实时 `dynamic_tool_call(image_gen)` 开始时卡片标题为“调用工具：image_gen”，失败时正文和 detail 输出均为“图片服务不可用”；右侧日志相应记录“调用工具”与“工具失败”，不再遗漏动态工具。历史 `dynamicToolCall` 完成时恢复“已生成 1 张图片”，失败时仍为同一具体工具标题和真实错误，不使用“工具操作已完成”之类的泛化文案。此前 `formatAgentEventLog` 只覆盖 `mcp_tool_call`，本次补齐这一可观察性缺口。定向 Web/Agent 测试通过；不外推为真实 ImageGen 调用、SSE 运输或所有第三方工具协议兼容性验收。

## 68. 窄 Agent 顶部栏可用性回归（2026-08-28）

本切片关闭中文主清单第 32 项。测试只在 Vite 临时 4173 服务中预置已连接的 Agent 状态和线程接口响应，将面板宽度固定为组件支持的最小 360px；不连接真实 17371、3000、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-panel-tabs.tsx` | 修改 | 为顶部栏和标签栏提供稳定测试标识，并将标签容器从裁剪改为 `overflow-x:auto`，以保留窄宽度下的横向访问路径。 |
| `web/src/components/agent/local-agent-panel.tsx` | 修改 | 保持垂直居中的“Agent”文字标题可见；连接、新对话和收起操作仍在同一行，窄宽度仅收起操作文字为图标。 |
| `web/e2e/agent-panel-header.spec.ts` | 新增 | 在最小宽度面板验证标题、连接设置、标签、新对话和收起操作均可见，标签栏可横向滚动，所有操作的垂直中心一致。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 32 项标为“自动化通过”，同步自动化通过 22 项、未验证 66 项与浏览器 45 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关系、隔离浏览器证据与未覆盖边界，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：原顶部栏在窄容器下隐藏文字“Agent”，标签栏使用 `overflow-hidden`，会把超出空间直接裁剪。现在标题在 360px 面板保持可见，四个标签仍属于可横向滚动的 `tablist`；连接设置、新对话和收起按钮均与标题/标签保持同一垂直中心。全量 Web 单测 51 项、TypeScript、生产构建、Chromium 浏览器回归 45 项，以及文档内容检查和生产构建均通过。格式门禁中，本切片新增用例已格式化；其余 7 个超出历史基线项为既有 `.playwright-cli` 记录、两个此前 Agent 用例和 CSP 脚本，未在本切片改动。该证据只覆盖隔离 Chromium、最小面板宽度和可访问名称，不外推为真实 Canvas Agent 连接、所有浏览器引擎或真实生图调用验收。

## 69. Agent 工具确认模式隔离 SSE 回归（2026-08-28）

本切片关闭中文主清单第 34 项。测试在页面加载前替换浏览器 `EventSource` 为内存实现，仍由 `LocalAgentPanel` 的真实 `hello`、`tool_call` 监听和工具处理函数消费事件；结果接口使用 Vite 临时 4173 路由夹具，不连接真实 17371、3000、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-tool-confirmation.spec.ts` | 新增 | 以 `canvas_apply_ops` 的真实前端事件路径验证默认自动确认立即调用 `canvasContext.applyOps` 并向 `/canvas/result` 回传；切换手动确认后验证等待确认卡片、拒绝操作和取消结果回传。 |
| `web/src/components/agent/agent-chat-composer.tsx`、`web/src/components/agent/local-agent-panel.tsx` | 既有实现（未修改） | 前者在输入框左下角提供确认模式菜单，后者按模式拦截画布写入工具或立即执行，并回传 Canvas Agent 结果。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 34 项标为“自动化通过”，同步自动化通过 23 项、未验证 65 项与浏览器 47 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录 SSE 夹具、真实事件路径、结果回传和隔离边界，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：默认模式的可访问名称为“选择工具确认模式，当前为 自动确认”，模拟 `tool_call(canvas_apply_ops)` 后获得一次带 Canvas 快照的 `/canvas/result` 回传，页面不出现等待确认卡片。打开菜单选择“手动确认”后，输入框模式立即更新，后续同一工具调用显示“等待确认”及“拒绝执行”；拒绝后回传 `requestId=tool-manual` 与“用户取消了画布工具调用”，卡片消失。初版网络 SSE 路由使用了错误的 `/agent/**` 前缀，后改为加载前内存 EventSource，使测试覆盖真实前端监听器而不受开发服务器 SSE 生命周期影响；结果接口实际为 `/canvas/result`，不是 `/agent/codex/tool-result`。全量 Web 单测 51 项、TypeScript、生产构建、Chromium 浏览器 47 项以及文档内容检查和生产构建均通过；格式门禁只剩此前已存在的 7 项 `.playwright-cli` 记录、两个 Agent 用例和 CSP 脚本，本切片新用例已格式化。该证据不外推为真实 Agent 服务、复杂 Canvas 变更、批准后执行或跨浏览器验收。

## 70. Canvas Agent 与 Codex 版本诊断回归（2026-08-28）

本切片关闭中文主清单第 35 项的版本诊断与基础运行契约。测试不启动 HTTP 服务、不会写入用户的 Canvas Agent 配置、不会占用 17371，也不访问 npm；版本来源、命令调用与 npm 查询都通过注入依赖在内存中验证。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/version-check.ts` | 修改 | 抽取启动版本日志和异步 npm 升级检查的可测试逻辑；保留 `checkVersions()` 的后台检查语义与既有日志文案。 |
| `canvas-agent/src/version-check.test.ts` | 修改 | 覆盖 Windows/Unix 本机 Codex 命令、Agent/内置 `0.146.0`/本机版本日志、缺失或不匹配提示、三类可升级提醒和 npm 离线后继续启动。 |
| `canvas-agent/src/agent/codex-client.test.ts`、`canvas-agent/src/canvas/session.test.ts` | 既有实现（未修改） | 前者覆盖同一运行线程的中断与随后 turn/start，后者覆盖网页连接目标、画布工具请求和结果回传。 |
| `canvas-agent/src/server/http.ts` | 既有实现（未修改） | 启动回调调用 `checkVersions()`；线程创建、恢复与 turn 路由保持现有协议。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 35 项标为“自动化通过”，同步自动化通过 24 项、未验证 64 项与 Canvas Agent 195 项测试基线。 |
| `docs/session-development-record.md` | 修改 | 记录版本诊断逻辑、运行边界、已有协议测试和验证命令，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：依赖清单把内置 `@openai/codex` 固定为 `0.146.0`。启动路径记录 Canvas Agent、内置 Codex 与本机 Codex 三种版本；未安装本机 Codex 时提示安装，版本不一致时提示两者同步升级。npm 返回较新 Agent、内置 Codex 或本机 Codex 时分别给出对应升级命令；npm 抛错时只记录“Unable to check the latest npm versions; startup will continue.”，不阻断启动。`codex-client.test.ts` 已证明 `interruptCurrentTurn` 只中断匹配的活跃线程，随后可以启动新 turn；`session.test.ts` 已证明浏览器连接、画布工具请求及结果只作用于正确客户端。定向版本检查、Canvas Agent 全量 195 项测试和生产构建通过。该证据不外推为实际全局 Codex 安装状态、真实 npm 可达性、真实 app-server 进程或跨进程恢复验收。

## 71. Canvas Agent Debug 日志隔离回归（2026-08-28）

本切片关闭中文主清单第 36 项。测试用 `Logger` 的受控输出流与系统临时目录验证日志行为；不启动 Canvas Agent、不读取用户配置、不写入真实用户主目录、不占用 3000/17371，也不使用真实凭据、图片、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/utils/logger.ts` | 修改 | 为 Logger 增加仅供受控关闭/测试的输出目录、日期和终端流注入入口；保持默认运行仍以进程 `--debug` 与用户主目录为准。普通与 Debug 两种输出都会压缩换行、遮蔽正文中的 Data URL 与凭据，Debug 文件仍按本地日期追加。 |
| `canvas-agent/src/utils/logger.test.ts` | 修改 | 通过内存 Writable 断言普通模式只输出 Info/Warn/Error；通过系统临时目录断言 Debug 同日三行追加文件、时间/级别格式以及正文/详情凭据与 Data URL 均不泄露。测试结束仅删除自己刚创建且经测试框架持有的临时目录。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 36 项更新为“自动化通过”，同步自动化通过 25 项、未验证 63 项与 Canvas Agent 197 项测试基线。 |
| `docs/session-development-record.md` | 修改 | 记录日志隔离、文件关联和验证边界，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：普通模式调用 `debug` 不写入终端，`info`、`warn` 与 `error` 产生 `YYYY-MM-DD HH:mm:ss LEVEL message` 单行；含 token 的详情为 `[REDACTED]`，正文中的 Data URL 为带长度的 `[DATA URL … chars]`。Debug 模式在同一固定日期先写入一条 Debug 和一条 Info，再由独立 Logger 追加一条 Warn，结果文件恰为三行，未出现任何虚构的图片内容或凭据。定向日志回归、Canvas Agent 全量 197 项测试、生产构建，以及文档内容检查和生产构建通过。此项不外推为真实 `npx -y @basketikun/canvas-agent --debug` 启动、真实 Codex stderr、部署日志采集或外部服务日志验收。

## 72. Canvas Agent Codex stderr 日志回归（2026-08-28）

本切片关闭中文主清单第 37 项。测试只输入内存中的 ANSI 与 UTC 前缀文本；不启动 Codex app-server、不读取真实 stderr、用户配置、Token、图片或端口 3000/17371，也不调用外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/agent/codex-client.ts` | 修改 | 将 Codex stderr 规范化提取为单一函数；子进程监听器只将去除 ANSI、上游 UTC ISO 时间和末尾换行的正文发送给公共 logger 与 `agent_log`。 |
| `canvas-agent/src/agent/codex-client.test.ts` | 修改 | 验证颜色控制符与 `2026-08-28T01:23:45.678Z` 不会进入规范化输出，网页事件可由既有 `addEventLog` 唯一追加本地时间。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 37 项更新为“自动化通过”，同步自动化通过 26 项、未验证 62 项与 Canvas Agent 198 项测试基线。 |
| `docs/session-development-record.md` | 修改 | 记录 stderr 文本边界、文件关联和验证范围，满足 `AGENTS.md` 的对话级可追溯要求。 |

验证记录：输入带黄色 ANSI 包装、UTC 时间与 CRLF 的 Codex stderr 后，输出只有“Codex 正在重试”；本地终端继续由 Logger 生成一次 `YYYY-MM-DD HH:mm:ss WARN`，网页 `addEventLog` 继续生成一次本地时间，故不会显示重复 ISO 时间或 ANSI 转义。定向回归、Canvas Agent 全量 198 项测试和生产构建，以及文档内容检查和生产构建通过。此项不外推为真实 Codex 子进程、生产终端或浏览器人工日志视图验收。

## 73. Agent HTTP Debug 过滤回归（2026-08-28）

本切片为中文主清单第 38 项增加 Agent 服务端的局部自动化证据，但不将其标记为完整通过：右侧日志时间线的去重、摘要和浏览器可见性仍需单独验收。测试不启动 HTTP 服务，因此不会读取或写入真实配置、占用 3000/17371 或访问真实 Agent、Token、图片、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/server/http.ts` | 修改 | 将 Debug HTTP 日志筛选抽为纯函数；成功的 `/health`、`/canvas/state`、`/canvas/activate` 和所有 OPTIONS 静默，错误响应和实际业务请求仍记录。 |
| `canvas-agent/src/server/http-log-filter.test.ts` | 新增 | 用虚构 method/path/status 覆盖上述静默规则、失败健康检查、工具结果冲突和 Codex turn 业务请求。 |
| `canvas-agent/package.json` | 修改 | 将 HTTP 过滤回归加入 Canvas Agent 的正式测试清单。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 更新 Canvas Agent 199 项测试基线，并记录局部证据与未覆盖边界。 |

验证记录：`GET /health 200`、`POST /canvas/state 200`、`POST /canvas/activate 200` 与 `OPTIONS` 都不输出 Debug HTTP 日志；`GET /health 500`、`POST /canvas/result 409` 和 `POST /agent/codex/turn 200` 均保留。定向测试和生产构建通过；完整 Canvas Agent、文档与浏览器门禁将在后续完整关闭第 38 项时复跑。

## 74. Agent 排查日志隔离浏览器回归（2026-08-28）

本切片关闭中文主清单第 39 项。Chromium 使用 Vite 临时 4173 与内存 Agent store/HTTP 夹具，不连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-log-diagnostics.spec.ts` | 新增 | 预置信息、连续警告和结构化错误日志后打开真实右侧面板；验证错误筛选、警告折叠为“重复 2 次”、详情、原始 JSON 与清空。 |
| `web/src/components/agent/agent-log-view.tsx` | 既有实现（未修改） | 提供固定连接摘要、筛选、聚合、详情、原始 JSON、复制和清空入口。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 39 项更新为“自动化通过”，同步自动化通过 27 项、未验证 61 项与浏览器 48 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录隔离浏览器范围、控件语义和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：面板启动会真实追加连接失败事件，故错误筛选显示 2 条而不是夹具的 1 条；测试以实际可见计数选择筛选。连续相同“模型正在重试”折叠为“重复 2 次”；展开错误可查看详情，原始 JSON 包含 `request-test`，清空后按钮禁用。定向 Chromium 回归通过；不外推为真实 Canvas Agent 网络、复制权限失败、长日志滚动跟随或跨浏览器验收。

## 75. Agent HTTP 诊断日志闭环（2026-08-28）

本切片完成中文主清单第 38 项的自动化闭环。服务端仍以纯函数验证 Debug HTTP 过滤；Chromium 使用 Vite 临时 4173、内存 Agent store、路由夹具和模拟 EventSource，从真实发送入口进入右侧日志，不监听或访问真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-event-formatters.ts` | 修改 | 删除线程启动日志中的 ID，开始处理不再显示 turn ID；完成摘要合并本轮输入、缓存、输出 Token 与耗时。流式增量仍只更新对话，不写入日志。 |
| `web/src/components/agent/agent-event-formatters.test.ts` | 修改 | 验证线程事件和流式更新不生成日志，完成事件仅生成精简生命周期摘要与格式化用量。 |
| `web/e2e/agent-http-diagnostics.spec.ts` | 新增 | 从真实发送输入框和按钮出发，经受控 SSE 发送 thread、turn、回复、用量和完成事件；验证右侧仅显示发送、开始、回复、完成用量，不显示线程 ID 或流式摘要。 |
| `canvas-agent/src/server/http-log-filter.test.ts` | 既有测试 | 继续验证成功健康检查、画布同步和 OPTIONS 不写 Debug HTTP 日志，失败和业务请求保留。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 38 项更新为“自动化通过”，同步自动化通过 28 项、未验证 60 项、Web 52 项和浏览器 49 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、证据边界和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：隔离 Chromium 页面发送“验证精简诊断日志”后，日志按“发送任务、开始处理、收到回复、处理完成”显示；完成摘要为“1.3 秒 · 输入 1,200 · 缓存 300 · 输出 45”。`thread.started` 和 `item.updated(agent_message)` 不进入日志。该结果不外推为真实网络 SSE、真实 Codex、剪贴板权限、跨浏览器或长日志跟随行为验收。

## 76. Agent 排查日志顺序与跟随（2026-08-28）

本切片关闭中文主清单第 40 项。Chromium 使用 Vite 临时 4173 与 60 条内存 Agent 日志，不连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-log-follow.spec.ts` | 新增 | 打开真实右侧日志面板，验证旧到新排列、进入日志时定位底部、向上滚动暂停跟随、两条新错误的浮动提示、点击后回到底部，以及切换错误筛选后仍定位最新记录。 |
| `web/src/components/agent/agent-log-view.tsx` | 既有实现（未修改） | 维护列表内部滚动、底部阈值、暂停/恢复跟随、新日志计数与最后一项展开后的定位。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 40 项更新为“自动化通过”，同步自动化通过 29 项、未验证 59 项与浏览器 50 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录隔离浏览器范围、文件关联和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：列表首尾分别为“日志 001”“日志 060”，初始和错误筛选后都处于底部。人工将列表滚到顶部后追加两条错误，页面显示“2 条新日志，查看最新日志”；点击后回到底部并隐藏提示。该结果不外推为跨浏览器视觉高度对齐、触屏滚动或真实 Agent 网络日志验收。

## 77. Agent 对话统计与简洁消息（2026-08-28）

本切片关闭中文主清单第 41 项。Chromium 使用 Vite 临时 4173、内存 Agent store 和受控会话路由夹具，不连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-chat-message.tsx` | 修改 | 用户和 Codex 消息不再渲染遗留 `meta` 字段，避免显示历史时间或 Token；用户已有右对齐、无气泡/头像的简洁排版保持不变。 |
| `web/src/components/agent/agent-chat.tsx` | 既有实现（未修改） | 在输入框上方居中显示最新一次调用的输入、缓存和输出 Token，并使用 Spring 平滑更新数值。 |
| `web/e2e/agent-chat-usage.spec.ts` | 新增 | 打开真实面板，验证两侧消息排版、无时间/Token 元数据、最新调用三项数值，以及触发“新对话”后清空旧消息与用量。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 41 项更新为“自动化通过”，同步自动化通过 30 项、未验证 58 项与浏览器 51 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、隔离范围和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：预置用户与 Codex 历史消息的 `meta` 为日期/Token 文本时，页面两侧均不显示；用户消息容器右对齐、无图片头像且不带气泡背景。最新调用显示“输入 1,200”“缓存 300”“输出 45”；点击“新对话”后旧消息和“最新调用”均清空。该结果不外推为逐帧动画曲线、跨浏览器渲染或真实 Codex 用量验收。

## 78. Agent 实时回复历史回补与失败收束（2026-08-28）

本切片关闭中文主清单第 42 项。Chromium 使用 Vite 临时 4173、真实右侧 `LocalAgentPanel`、内存 EventSource 和受控 Agent 历史接口；不会连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/local-agent-panel.tsx` | 修改 | 在收到非回放的 `turn.completed` 后请求同一线程的权威快照，并带入已结算 turn；当 SSE 未发送最终 `item.completed` 时，既有合并逻辑仍能以持久化历史替换临时流式片段。 |
| `web/e2e/agent-realtime-reply.spec.ts` | 新增 | 从真实输入框发送消息，验证“正在思考”、流式片段与 `turn.completed` 后自动回补完整回复；同一 EventSource 下再验证模型繁忙错误立即显示中文重试建议、停止等待，并只写入“处理失败”日志。 |
| `web/e2e/agent-http-diagnostics.spec.ts` | 修改 | 在等待内存 EventSource 建立后显式恢复已就绪会话，避免并行回归中历史读取短暂设置 `loadingThreads` 时把真实输入框保持为不可编辑。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 42 项更新为“自动化通过”，同步未验证 57 项与浏览器 52 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的事件顺序、文件关联、隔离边界与验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：页面发送“请完整同步回复”后，用户消息下方立即显示“正在思考”；受控 `item.updated` 显示“流式片段”。历史接口在此时仍为空，待 `turn.completed` 后才返回同一 turn 的用户消息和完整 Codex 回复；面板无需切换历史或日志即自动显示“这是一条完整同步回复。”，并移除临时片段。随后模拟 `selected model is at capacity`，对话显示“当前选择的模型请求量过大，暂时无法处理。请稍后重试，或切换其他模型后再试。”；store 中 `sending`/`waiting` 均为 `false`，唯一诊断条目为“处理失败”。新增回归暴露既有 HTTP 日志用例在全并发时过早填充被历史读取临时禁用的输入框，现以同一已就绪状态消除该竞态。全量 Chromium 52 项回归通过。该证据不外推为真实 Canvas Agent SSE、超过 30 秒等待提示、真实历史持久化、跨浏览器或真实 Provider 失败验收。

## 79. Agent 长回复流式交互性能（2026-08-28）

本切片关闭中文主清单第 43 项。Chromium 使用 Vite 临时 4173、真实右侧 `LocalAgentPanel`、内存 EventSource、80 条内存历史消息和受控线程历史接口；不会连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-streaming-performance.spec.ts` | 新增 | 在真实面板中验证历史行 `content-visibility` 隔离、120 段增量只更新一条当前流式消息、上滚后保持阅读位置、完成事件回补完整历史，以及全过程无 `/health` 请求。 |
| `web/src/components/agent/agent-chat.tsx`、`web/src/components/agent/agent-chat-message.tsx` | 既有实现（未修改） | 前者为非流式历史行设置 `content-visibility:auto` 并用动画帧合并滚动跟随；后者仅在 `streamId` 存在时启用 Streamdown 的词级动画。 |
| `web/src/components/agent/local-agent-panel.tsx` | 既有实现（未修改） | 继续把同一 `item.updated` 合并到作用域内唯一的流式消息，并在完成事件后发起权威历史同步。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 43 项更新为“自动化通过”，同步未验证 56 项与浏览器 53 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录流式性能夹具、已有实现关系、验证边界与结果，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：80 条历史消息全部使用 `content-visibility:auto`，连续发送 120 段“片段”后 store 仅新增一条带 `streamId` 的当前消息，历史总数不膨胀。滚动到时间线顶部后追加“继续流式更新”，阅读位置保持顶部而不被自动跟随覆盖。`turn.completed` 后线程接口返回“完整长回复”，当前消息自动切换为完整历史版本；从开始流式到完成均未出现 `/health` 请求。该证据覆盖隔离 Chromium 的 DOM/状态/网络契约，不把无硬件性能基准的结果外推为真实 Canvas 操作负载、跨浏览器帧率、真实 SSE 吞吐或真实 Agent 服务性能。

## 80. Agent 命令过程行预览（2026-08-28）

本切片修复中文主清单第 44 项中的单条命令过程行缺口，但不关闭整项。Chromium 使用 Vite 临时 4173、真实右侧 `LocalAgentPanel` 与受控历史线程响应；不会连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-chat-message.tsx` | 修改 | 为单条命令的折叠标题行增加截断的命令预览；状态计数和展开箭头保持同一行，展开后沿用既有详情区。 |
| `web/e2e/agent-process-timeline.spec.ts` | 新增 | 在真实面板验证折叠状态同时显示“已执行 1 条命令”和 `pnpm test`，展开后显示工作目录、耗时、退出状态及运行输出。 |
| `docs/session-development-record.md` | 修改 | 记录修复范围、文件关联、隔离边界与未关闭原因，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：旧实现的单命令折叠行只显示执行数量，无法在不展开详情时识别具体命令。现在预览以单行、截断且带完整 title 的代码样式显示；点击预览所在摘要行后，仍可查看 `F:/isolated/workspace`、`1.2 秒`、退出状态 `0` 与“全部通过”。定向 Chromium 回归通过。思考摘要、执行计划、文件/网页/画布工具事件顺序及历史恢复尚未在同一浏览器场景完整验收，第 44 项继续保留“未验证”。

## 81. Agent 完整过程时间线与历史恢复（2026-08-28）

本切片关闭中文主清单第 44 项。Chromium 使用 Vite 临时 4173、真实右侧 `LocalAgentPanel`、内存 EventSource 与受控线程历史接口；不会连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-process-timeline-live.spec.ts` | 新增 | 从真实前端事件监听器依次发送 reasoning、plan、command、file、web search 与 canvas 工具事件；验证同一计划更新不重复、中文化展示、摘要保留，并在完成后由历史快照恢复。 |
| `web/e2e/agent-process-timeline.spec.ts` | 既有新增用例 | 继续验证第 80 节修复的单命令预览与展开详情。 |
| `web/src/components/agent/local-agent-panel.tsx`、`agent-event-formatters.ts`、`agent-chat.tsx`、`agent-chat-message.tsx` | 既有实现（本切片未修改） | 分别负责事件归并与历史同步、事件中文投影、计划与时间线分区、以及摘要/命令/工具卡片渲染。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 44 项更新为“自动化通过”，同步未验证 55 项与浏览器 55 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录完整事件顺序、历史恢复、隔离边界及结果，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：实时事件先显示思考摘要、进行中 `1/2` 计划、单命令预览、文件修改、网页搜索和“画布操作”，不显示原始 `canvas_apply_ops`。思考摘要展开后仍显示原有 Markdown 列表内容，`item.completed(summary=已完成分析)` 不会覆盖；第二个 `plan.updated` 把同一计划更新为 `2/2`，页面仍仅有一个“任务进度”卡。`turn.completed` 后接口返回同一线程的权威历史，文件摘要、搜索摘要与完整计划继续可见。全量验收仍限于隔离 Chromium、受控 SSE 和受控历史数据，不外推为真实 Canvas Agent、真实网页搜索、跨浏览器或真实 Codex 执行验收。

## 82. Agent 权限控制与并发审批（2026-08-28）

本切片关闭中文主清单第 45 项。Chromium 使用 Vite 临时 4173、真实右侧 `LocalAgentPanel`、内存 EventSource 与受控审批 HTTP 接口；Canvas Agent 单测使用进程内伪 app-server stdin。两者都不会连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-permission-controls.spec.ts` | 新增 | 在真实面板验证“请求批准 / 自动审查 / 完全访问权限”选择，自动审查刷新保留、完全访问的显式风险确认，以及文件与网络两个并发审批卡的拒绝、本会话允许、SSE resolved 后逐一回收。 |
| `canvas-agent/src/agent/codex-client.test.ts` | 修改 | 验证请求批准 turn 使用 `on-request + workspaceWrite + 禁网`；自动审查线程额外携带 `approvals_reviewer=auto_review`；完全访问线程/turn 使用 `never + danger-full-access`。 |
| `web/src/components/agent/agent-chat-composer.tsx`、`web/src/components/agent/local-agent-panel.tsx`、`web/src/components/agent/agent-chat-message.tsx` | 既有实现（本切片未修改） | 分别提供权限菜单、完全访问二次确认/审批状态机，以及审批卡的三种决定按钮与目标信息。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 45 项更新为“自动化通过”，同步 Canvas Agent 200 项、浏览器 56 项与未验证 54 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、权限边界、隔离范围和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：初始模式为“请求批准”，切换“自动审查”后 `localStorage` 保存 `automatic` 并在刷新/重新打开面板后仍显示该模式。选择“完全访问权限”先显示“Codex 将不受沙箱限制，可访问互联网及本机任意文件”的风险确认，只有点击“启用完全访问”后才保存 `full`。回到请求批准后，受控 SSE 同时送达工作区外文件和网络访问两个审批请求；每张卡均提供“拒绝 / 允许一次 / 本会话允许”。拒绝网络请求只提交 `decline` 并在对应 resolved 后移除该卡，文件请求仍保持；再选择本会话允许只提交 `acceptForSession`，第二个 resolved 后才移除。Canvas Agent 协议单测额外证明三种选择会实际转为 app-server 的策略参数。该证据不外推为真实 Codex 对风险的分类质量、真实网络访问、真实文件改写、跨浏览器或生产权限审计。

## 83. Agent 历史卡片与批量删除（2026-08-28）

本切片关闭中文主清单第 46 项。Chromium 使用 Vite 临时 4173、真实 `AgentHistoryView` / `LocalAgentPanel`、内存 store 与受控 Agent HTTP 接口；不会连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-history-records.spec.ts` | 新增 | 验证历史卡片点击后直接恢复对应对话、不出现“进入”按钮；验证全选两条、确认后顺序调用归档删除接口，删除当前会话后清空活跃线程与聊天消息。 |
| `web/src/components/agent/agent-history-view.tsx`、`web/src/components/agent/local-agent-panel.tsx` | 既有实现（本切片未修改） | 前者负责可点击卡片与多选 UI；后者负责恢复、删除确认、线程缓存移除与刷新。 |
| `canvas-agent/src/agent/codex.ts`、`canvas-agent/src/server/http.ts` | 既有实现（本切片未修改） | 归档线程后清理计划、补充事件与附件元数据，并将活动线程切为空。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 46 项更新为“自动化通过”，同步浏览器 57 项与未验证 53 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、隔离范围和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：历史列表中“第二段对话”整张卡片可直接点击恢复，恢复后自动回到“对话”页并显示该线程的历史消息，页面没有额外“进入”按钮。返回历史后勾选全选框显示“已选 2 条”；确认删除后两个归档接口均被调用，列表显示“当前工作空间还没有对话记录”，store 的 `activeThreadId` 为空、`messages` 为零。夹具按真实服务端的单调会话 revision 模拟恢复与删除，避免把过期响应误判为前端状态问题。该证据不外推为真实 Codex 归档延迟、真实附件文件删除、跨浏览器或删除失败恢复验收。

## 84. Agent 默认新对话（2026-08-28）

本切片关闭中文主清单第 47 项。Chromium 使用 Vite 临时 4173、真实右侧 `LocalAgentPanel`、内存 EventSource 和受控 Agent HTTP 接口；不会连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-default-new-thread.spec.ts` | 新增 | 验证连接后的空会话输入可编辑、不会请求 reset 或自动显示旧历史，并确认首条发送以空 `threadId` 提交。 |
| `web/src/components/agent/local-agent-panel.tsx` | 修改 | 空闲会话成为可发送状态；连接 hello 不再自动重置/预建线程；服务端尚未返回真实线程 ID 时保留首发等待流式事件绑定。 |
| `canvas-agent/src/server/http.ts` | 修改 | 删除连接/新对话/恢复失败时的预热持久线程创建；仅允许空闲空会话的首条 turn 交给 `runCodexTurn` 懒创建线程，实际线程 ID 到达后再切换会话。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 47 项更新为“自动化通过”，同步浏览器 58 项与未验证 52 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的实现、隔离范围和证据边界，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：连接空闲 Agent 后，对话区不自动恢复“旧对话”历史，且不会向 `/agent/codex/threads/reset` 发请求；输入框可直接输入“第一条消息才建线程”，发送请求的 `threadId` 为空。服务端只接受这种 `idle + 空 threadId` 组合进入首次 turn，`runCodexTurn` 随后创建真实 Codex 线程并经事件切换会话，因此连接和未发送的新对话不产生持久历史记录。该证据不外推为真实 Codex App Server 的线程创建延迟、真实历史存储、断线重连或跨浏览器行为验收。

## 85. Agent 当前画布优先（2026-08-28）

本切片关闭中文主清单第 48 项。验证只使用 Canvas Agent 进程内会话和本地指令源，不连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/agent/agent-instructions.test.ts` | 新增 | 将实际注入 MCP Server 的 `AGENT_PROMPT` 固定为“当前已打开画布优先、先读状态、禁止无谓列举/导航、仅显式切换时例外”的契约。 |
| `canvas-agent/package.json` | 修改 | 把该指令契约加入默认 Canvas Agent 全量测试命令。 |
| `canvas-agent/agent-instructions.md`、`canvas-agent/src/canvas/session.test.ts` | 既有实现（未修改） | 前者为 Codex/MCP 提供当前画布优先决策规则；后者已经验证 turn 绑定发起标签后，焦点切到另一标签也不会让读取或写入越过原画布。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 48 项更新为“自动化通过”，同步 Canvas Agent 201 项与未验证 51 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录指令与会话路由的关联、隔离范围和证据边界，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：新测试直接读取运行时 `AGENT_PROMPT`，断言其要求当前已打开画布为默认目标、先调用 `canvas_get_state`、不得先调用 `canvas_list_projects` 或 `site_navigate`，且只有显式查看/选择/切换其他画布时才例外。既有多标签会话测试进一步证明，运行中的 turn 绑定发起标签后，即使焦点变化，`canvas_get_state` 和画布写操作仍只作用于发起标签。该证据固定指令和工具路由契约，不外推为真实模型在所有自然语言表述下的工具选择概率。

## 86. Agent 图片消息（2026-08-28）

本切片关闭中文主清单第 49 项。Chromium 使用 Vite 临时 4173、真实 `LocalAgentPanel`、内存 EventSource 和受控历史/图片资源接口；Canvas Agent 使用临时元数据目录。两者均不连接真实 3000/17371、用户资产、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-image-message.spec.ts` | 新增 | 从真实历史线程快照恢复携带 `agent-asset` 的用户图片消息，验证 40px 紧凑缩略图与“图片附件预览”弹层。 |
| `web/src/components/agent/agent-chat-message.tsx` | 既有实现（未修改） | 在用户消息后右对齐渲染可点击缩略图，并由 Ant Design Image 预览管理打开/关闭。 |
| `canvas-agent/src/agent/message-metadata.test.ts` | 既有测试 | 验证元数据重启恢复、预览资源随线程删除和输入尺寸保护。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 49 项更新为“自动化通过”，同步浏览器 59 项与未验证 50 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、隔离范围和证据边界，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：历史接口返回本地 `agent-asset` 后，真实 Agent 面板显示“请参考这张图”和 `参考图.png` 缩略图；缩略图使用 `size-10`（40px）紧凑样式，点击可打开带“图片附件预览”名称的预览弹层。服务端元数据单测已覆盖相同资源跨重启可读、删除线程时移除和超限拒绝。该证据不外推为真实网络下载、跨浏览器图片解码、正在生成时的真实 Codex 事件或用户手动删除失败恢复。

## 87. 画布文本复制保护（2026-08-28）

本切片为中文主清单第 50 项补充可回归的快捷键分支，不关闭该项的浏览器验收。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/lib/canvas/canvas-copy-shortcut.ts`、`canvas-copy-shortcut.test.ts` | 新增 | 固定“有文本选区时放行原生复制、无选区时继续节点复制”的最小判定。 |
| `web/src/pages/canvas/project.tsx` | 修改 | 页面级 `Ctrl/Cmd+C` 在调用 `copySelectedNodes` 前使用该判定，保留既有输入、文本域和 contenteditable 排除。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联与尚未关闭的浏览器证据边界。 |

验证记录：定向 Vitest 与 TypeScript 通过。尚未覆盖真实鼠标选区、系统剪贴板权限和节点复制的浏览器交互，因此第 50 项继续保持未验证。

## 88. Agent 工作目录指令（2026-08-28）

本切片关闭中文主清单第 51 项。测试只创建并清理系统临时目录，不连接真实 3000/17371、用户工作区、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/config.test.ts` | 新增 | 在隔离临时工作目录调用 `ensureSiteWorkspace`，验证启动初始化将独立维护源 `agent-instructions.md` 的运行时内容写入 `AGENTS.md`。 |
| `canvas-agent/src/agent/codex-client.test.ts` | 修改 | 验证 `turn/start` 的文本输入恰为本轮用户请求及其必要附件上下文，不会重复工作目录指令。 |
| `canvas-agent/package.json` | 修改 | 将工作目录初始化测试纳入默认 Canvas Agent 全量测试命令。 |
| `canvas-agent/agent-instructions.md`、`canvas-agent/src/config.ts`、`canvas-agent/src/agent/codex-client.ts` | 既有实现（未修改） | 前者是唯一工作目录指令源；配置初始化负责生成 `AGENTS.md`；Codex 客户端仅把调用方给出的本轮 prompt 转为 app-server 输入，工作目录规则由文件加载。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 51 项更新为“自动化通过”，同步 Canvas Agent 203 项与未验证 49 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、隔离范围和证据边界，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：临时目录中的 `AGENTS.md` 与运行时 `AGENT_PROMPT` 字节一致；受控 app-server JSON-RPC 的 `turn/start.input` 只有“请根据这张参考图整理当前画布中的节点。附件：参考图.png”，不包含完整工作目录指令。既有当前画布优先测试和会话工具路由测试继续覆盖工作目录规则加载后对画布工具的约束。该证据不外推为真实 Codex 对所有自然语言请求的遵循概率、真实 app-server 文件加载时序或跨平台工作目录权限。

## 89. 画布文本复制浏览器验收（2026-08-28）

本切片关闭中文主清单第 50 项。使用隔离 Vite 4173 与 Playwright Chromium 创建临时画布；未连接或停止真实 3000/17371、用户画布、Token、外部 Provider 或 Docker/容器。结束后已关闭本切片启动的浏览器和 Vite 实例。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/pages/canvas/project.tsx`、`web/src/lib/canvas/canvas-copy-shortcut.ts`、`canvas-copy-shortcut.test.ts` | 既有实现/测试（未修改） | 页面在有文字选区时放行浏览器原生复制；无选区时保留画布节点复制。单测固定最小分支。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 50 项更新为“人工通过”，同步未验证 48 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录隔离浏览器操作、结果和边界，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：临时画布创建“画布文本复制验证”文本节点后，DOM 文字选区保持该全文；发送 `Ctrl+C` 后选区仍存在，清除选区再粘贴没有生成“Copy”节点，证明不会落入画布内部节点复制。随后点击画布节点本体（而非带快捷键忽略标记的左侧节点列表），在无文字选区状态下发送 `Ctrl+C` + `Ctrl+V`，左侧节点计数由 1 变为 2，出现“文本 Copy”。该证据覆盖 Chromium 的 Ctrl 组合键；不外推为 macOS Cmd、系统剪贴板权限实现、触屏选择、跨浏览器或跨设备同步行为。

## 90. 画布文本设置验收（2026-08-28）

本切片关闭中文主清单第 52 项。浏览器使用隔离 Vite 4173 与 Playwright Chromium；未连接或停止真实 3000/17371、用户画布、Token、外部 Provider 或 Docker/容器。结束后已关闭本切片启动的浏览器和 Vite 实例。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/services/api/text-reasoning.test.ts` | 新增 | 固定节点值优先于全局默认值、OpenAI 自动档省略 `reasoning`、指定档位写入 `reasoning.effort`，以及自定义脚本读取 `reasoningEffort`。 |
| `web/src/lib/canvas/canvas-generation-helpers.ts`、`web/src/services/api/image.ts`、`web/src/services/api/model-plugin.ts`、相关画布设置组件 | 既有实现（未修改） | 分别合并节点配置、组装 OpenAI Responses、将变量传入自定义脚本，以及在文本节点和文本模式配置节点渲染五档设置。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 52 项更新为“人工通过”，同步未验证 47 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、隔离浏览器范围与验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：文本节点的“推理 · 自动”设置弹层显示自动、低、中、高、极高五档；选择“高”并刷新画布后，重新打开文本编辑仍显示“推理 · 高”。生成配置节点切换到“文本”后出现同一设置，选择“极高”并刷新后，模式仍为文本且显示“推理 · 极高”。新增单测同时验证自动档的 Responses 请求体没有 `reasoning`，高档为 `{ effort: "high" }`，自定义脚本可读取 `reasoningEffort`。该证据不外推为真实 API 密钥、真实 OpenAI 响应、跨浏览器/跨设备同步或所有用户自定义脚本的正确性。

## 91. 生图工作台参考图拖放（2026-08-28）

本切片关闭中文主清单第 53 项。Chromium 使用 Playwright 自管的隔离 Vite 4173；文件通过浏览器内存 `DataTransfer` 构造，不读取用户文件、真实 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/image-reference-drop.spec.ts` | 新增 | 在真实生图工作台验证参考图区的拖入提示/高亮、两张 PNG 上传和缩略图渲染、文本文件忽略以及 drop 后状态复位。 |
| `web/src/pages/image/index.tsx` | 既有实现（未修改） | `addReferences` 仅保留 `image/*`；拖放区阻止浏览器默认导航，维护嵌套拖入深度并显示可见高亮。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 53 项更新为“自动化通过”，同步浏览器 60 项与未验证 46 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、隔离范围和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：初始参考图区显示“暂无参考图，可将图片拖到这里”。内存 PNG 拖入后边框变为高亮并显示“松开即可添加参考图”；随后一次 drop 两张 PNG 和一份 `text/plain`，页面显示“参考一.png”“参考二.png”缩略图，未显示“忽略.txt”，高亮状态移除。该证据不外推为操作系统文件拖放、超大图片、剪贴板输入、网络图片解码或跨浏览器行为。

## 92. 视频创作台参考资产拖放（2026-08-28）

本切片关闭中文主清单第 54 项。Chromium 使用 Playwright 自管的隔离 Vite 4173；所有文件均由浏览器内存 `DataTransfer` 构造，不读取用户文件、真实 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/video-reference-drop.spec.ts` | 新增 | 在真实视频创作台验证从任一参考区混合投放后，图片、MP4/MOV 与 WAV 自动进入各自列表，文本忽略，当前区高亮并在 drop 后复位，以及视频 3 个数量上限。 |
| `web/src/pages/video/index.tsx`、`web/src/lib/seedance-video.ts` | 既有实现（未修改） | `addReferences` 按类型和大小分流并截断到图片 9、视频 3、音频 3；拖放区阻止默认导航并维护当前目标高亮。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 54 项更新为“自动化通过”，同步浏览器 61 项与未验证 45 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、隔离范围和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：先向“参考视频”区域拖入内存 MP4，边框高亮并显示“松开即可上传参考资产”。随后一次 drop PNG、4 个 MP4/MOV、WAV 和 `text/plain`：图片缩略图出现在参考图区，视频区只出现 3 个视频元素，音频区出现 WAV 文件名，文本没有渲染，视频区高亮解除。该证据不外推为真实媒体可解码性、文件大小/时长边界的操作系统文件拖放、剪贴板输入、跨浏览器或外部生成服务行为。

## 93. 画布组装提示词滚动与输入回写（2026-08-28）

本切片关闭中文主清单第 55 项，并修复回归中暴露的无限更新。Chromium 使用 Playwright 自管的隔离 Vite 4173，新建的画布和配置节点只存在于隔离浏览器存储；不读取用户文件、真实 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/canvas/canvas-config-composer.tsx` | 修改 | 仅在内容序列化结果变化时向父级回写，防止编辑器同步同值内容造成 React 更新深度循环。 |
| `web/e2e/canvas-config-composer-scroll.spec.ts` | 新增 | 新建真实画布配置节点，写入 120 段文本，验证正文高度受限、滚轮只滚动正文，以及标题/关闭按钮位置稳定。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 55 项更新为“自动化通过”，同步浏览器 62 项与未验证 44 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、缺陷修复、隔离范围和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：首次测试在向组装器写入内容后出现 React “Maximum update depth exceeded”。修复后，120 段文本使编辑器 `scrollHeight` 大于 `clientHeight`；鼠标滚轮后 `scrollTop` 增大，而编辑器顶部及关闭按钮的视口坐标保持不变。该证据不外推为触屏惯性滚动、所有浏览器的原生 contenteditable 行为、引用 Chip 的完整编辑路径或真实生成请求。

## 94. 画布节点提示词滚动与输入回写（2026-08-28）

本切片关闭中文主清单第 56 项，并修复节点提示词输入的同值更新循环。Chromium 使用 Playwright 自管的隔离 Vite 4173；新建画布和图片节点只存在于隔离浏览器存储，不读取用户文件、真实 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/canvas/canvas-prompt-chip-input.tsx` | 修改 | 利用现有 `lastEmittedRef` 跳过相同文本的重复父级回写，避免 React 更新深度循环。 |
| `web/e2e/canvas-node-prompt-scroll.spec.ts` | 新增 | 新建真实图片节点并写入 120 段提示词，验证输入区内部滚动且画布 transform 不变。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 56 项更新为“自动化通过”，同步浏览器 63 项与未验证 43 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、缺陷修复、隔离范围和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：首次测试写入长提示词后出现 React “Maximum update depth exceeded”。修复后，输入区 `scrollHeight` 大于 `clientHeight`，鼠标滚轮使输入区 `scrollTop` 增大，而画布 `.absolute.origin-top-left` 的 style transform 保持原值。该证据不外推为触屏滚动、所有浏览器的 contenteditable 行为、放大编辑弹窗、引用 Chip 的完整编辑路径或真实生成请求。

## 95. 画布批量结果提示词回显（2026-08-28）

本切片关闭中文主清单第 57 项。Chromium 使用 Playwright 自管的隔离 Vite 4173，并在隔离 IndexedDB 的 `app_state` 中预置批量图片项目；不读取用户文件、真实 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-batch-prompt-recall.spec.ts` | 新增 | 预置真实画布批量图片根节点，验证初始提示词回显、展开图片组、子图设为主图和再次选择根节点后仍回显原生成提示词。 |
| `web/src/pages/canvas/project.tsx`、`web/src/components/canvas/canvas-node.tsx` | 既有实现（未修改） | 根节点在 `metadata.prompt` 保存生成提示词；批量子图是 `images` 槽位，展开后通过“设为主图”切换，不创建独立画布节点。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 57 项更新为“自动化通过”，同步浏览器 64 项与未验证 42 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片的文件关联、架构边界、隔离范围和验证结论，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：预置根节点与两个成功图片槽位后，选择根节点即可看到完整生成提示词；展开“2 张”图片组，将另一张子图设为主图后，提示词不变；再次选择根节点后仍为同一提示词。该证据不外推为真实 ImageGen 多图生成、每个槽位存储独立提示词（当前模型为根节点单一生成提示词）、跨浏览器同步或用户导入的历史畸形数据。

## 96. 画布生成配置提示词与模型解析（2026-08-28）

本切片关闭中文主清单第 58 项。验证仅调用纯生成上下文和配置解析函数，不访问真实 3000/17371、用户画布、Token、外部 Provider 或 Docker/容器；完整 Web 门禁中的 Playwright 由自身隔离 Vite 4173 启动并关闭。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/canvas/canvas-node-generation.test.ts` | 新增 | 以隔离配置节点、上游文本节点和连线固定连续首发/失败重试上下文相同，上游文字只出现一次；同时固定 image/video/text/audio 四种生成模式解析对应模型。 |
| `web/src/components/canvas/canvas-node-generation.ts`、`web/src/lib/canvas/canvas-generation-helpers.ts`、`web/src/pages/canvas/project.tsx` | 既有实现（未修改） | 前者从当前节点和连线重建请求上下文；中者按模式选择能力匹配模型；页面在首发和重试时直接消费这两个结果。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 58 项更新为“自动化通过”，同步 Web 19 文件/59 项测试与未验证 41 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片文件关联、隔离范围、验证和不外推边界，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：同一 `composerContent` 在首发与模拟失败重试的两次 `buildNodeGenerationContext` 调用返回完全相同结果，包含的上游文本仅出现一次；`buildGenerationConfig` 在 image、video、text、audio 模式分别解析为当前对应的 imageModel、videoModel、textModel、audioModel。Web 全量单测为 19 个文件 59 项通过，TypeScript、生产构建与 64 项 Playwright 回归通过。该证据不外推为真实外部 Provider 的响应、实际密钥有效性、请求网络重试策略、用户填写无效模型时的服务端兼容性或跨设备配置同步。

## 97. 画布左侧元素列表定位与预览（2026-08-28）

本切片关闭中文主清单第 59 项。Chromium 使用 Playwright 自管的隔离 Vite 4173，在 IndexedDB 中预置单个远处图片节点；不读取用户文件、真实 3000/17371、Token、外部 Provider 或 Docker/容器，结束后由测试关闭服务。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-side-panel-focus-preview.spec.ts` | 新增 | 验证左侧图片元素的独立预览仅打开大图、不触发画布定位；点击元素整行则将原本不在视口的节点定位进视口并进入选中态。 |
| `web/src/components/canvas/canvas-side-panel.tsx`、`web/src/pages/canvas/project.tsx` | 既有实现（未修改） | 前者将行点击和预览按钮分为两个事件入口；后者以 450ms 缓动聚焦节点、更新选择集，并由预览状态打开图片详情弹窗。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 59 项更新为“自动化通过”，同步浏览器 65 项与未验证 40 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本切片文件关联、隔离范围、验证与不外推边界，满足 `AGENTS.md` 的对话级记录要求。 |

验证记录：远处图片节点初始未渲染在可视画布 DOM；点击“放大预览”后显示标题和图片的详情弹窗，节点仍未进入 DOM，证明预览没有触发定位。关闭弹窗后点击带“定位到节点”标题的元素整行，节点出现于视口并带选中层级。Web 全量单测 19 个文件 59 项、TypeScript、生产构建和 65 项 Playwright 回归通过。该证据不外推为多选/批量导出模式、视频/音频预览、触屏交互、跨浏览器动画曲线或用户导入的异常节点数据。

## 98. 配置与用户偏好导入导出（2026-08-28）

本切片关闭中文主清单第 60 项。测试以测试进程内的 Zustand 状态和内存 JSON 文件运行；不会读取、写入或导出用户浏览器中的真实 API Key、WebDAV 凭据、提示词来源或 Docker/容器配置。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/services/config-file.test.ts` | 新增 | 固定导出内容含完整 AI 配置、WebDAV 和提示词来源；固定变更后的导入恢复；固定错误 JSON 拒绝且保留原状态。 |
| `web/src/services/config-file.ts`、`web/src/components/layout/app-config-modal.tsx` | 既有实现（未修改） | 前者组装和校验配置文件并写回两个配置存储；后者提供导入/导出按钮，导入失败时显示错误消息。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 60 项更新为“自动化通过”，同步 Web 20 文件/62 项与未验证 39 项基线，并记录文件关联。 |

验证记录：内存导出 JSON 含应用标识、版本、渠道/默认模型/生成偏好、WebDAV 和提示词来源计划；修改状态后导入精确恢复；`{invalid` 被拒绝且现有 API Key 不变。定向 Vitest 为 3 项通过。该证据不外推为浏览器下载权限、操作系统文件选择器、真实凭据有效性或 WebDAV 网络连接。

## 99. 模型渠道方舟协议与参考限制（2026-08-28）

本切片关闭中文主清单第 61 项。测试使用内存渠道、图片 Data URL 和 Axios 拦截器，不请求真实方舟、真实 API Key、用户媒体、3000/17371 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/lib/ark-channel-protocol.test.ts` | 新增 | 验证方舟默认基址、任意模型名按 `apiFormat=ark` 分流、1080p 和参考视频边界；拦截图片 JSON 请求、视频任务创建和查询。 |
| `web/src/stores/use-config-store.ts`、`web/src/services/api/image.ts`、`web/src/services/api/video.ts`、`web/src/lib/seedance-video.ts` | 既有实现（未修改） | 分别提供方舟地址/渠道解析、JSON 图片请求、方舟视频任务协议和参考媒体边界。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 61 项更新为“自动化通过”，同步 Web 21 文件/66 项与未验证 38 项基线，并记录关联证据。 |

验证记录：自定义“任意生图模型”和“任意视频模型”在方舟渠道下均走 `api/v3`：生图请求 `images/generations` 使用 JSON `image` 数组，视频请求 `contents/generations/tasks` 并查询同一任务 ID；1080p 不依赖 `fast` 命名，200MB、15 秒与 1280×720 参考视频通过，3840×2161 被像素上限拒绝。Web 全量单测 21 个文件 66 项、TypeScript 与生产构建通过。该证据不外推为真实方舟鉴权、服务端模型可用性、真实视频下载或浏览器渠道编辑抽屉的逐控件可用性。

## 100. 提示词中心布局与搜索防抖（2026-08-28）

本切片关闭中文主清单第 63 项。Chromium 使用 Playwright 自管的隔离 Vite 4173，在浏览器本地存储写入一个禁用内置来源、启用本地路由夹具的提示词来源；不访问真实远程来源、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/prompt-library-layout.spec.ts` | 新增 | 以两条内存提示词和 48 个长标签，验证提示词中心标题/数量、约 300ms 搜索防抖、桌面独立侧栏滚动、搜索框后的卡片、窄屏单列与无横向溢出；并验证“加入资产”直接写入资产库且无“我的提示词”Tab。 |
| `web/src/pages/prompts/index.tsx`、`web/src/components/prompts/use-prompt-list.ts` | 既有实现（未修改） | 前者提供居中标题、响应式两栏、桌面 sticky 纵向侧栏和直接资产收藏；后者以 300ms 定时器延迟查询关键字。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 63 项更新为“自动化通过”，同步矩阵为 49 项自动化通过、37 项未验证，并记录文件关联与隔离边界。 |

验证记录：桌面 1440px 下，标题“提示词中心”和“当前共 2 条提示词”均可见；输入无匹配词后 220ms 仍保留旧卡片，随后显示空态，证明查询未在连续输入时立即提交。48 个长标签使左侧栏产生独立纵向滚动，滚动侧栏不改变主内容滚动位置；右侧搜索框下直接出现提示词卡片。390px 窄屏变为单列、侧栏位于搜索区上方且根文档无横向溢出。点击“加入资产”后，隔离资产库立即出现对应文本资产，页面没有“我的提示词”Tab。Web 全量门禁为 21 个 Vitest 文件 66 项、TypeScript、生产构建与 66 项 Playwright 回归通过。该证据不外推为真实远程来源网络、历史缓存迁移、触屏惯性滚动、所有设备断点或跨设备资产同步。

## 101. 提示词详情弹窗固定区与滚动区（2026-08-28）

本切片关闭中文主清单第 64 项。Chromium 使用 Playwright 自管的隔离 Vite 4173，在浏览器本地存储写入一个禁用内置来源、启用本地路由夹具的提示词来源；不访问真实远程来源、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/prompt-detail-dialog.spec.ts` | 新增 | 用带封面、两张参考图与 120 段正文的内存提示词，验证中间内容独立滚动、上方媒体和底部复制/加入资产操作固定，以及桌面和窄屏的视口边界。 |
| `web/src/pages/prompts/components/prompt-detail-dialog.tsx` | 既有实现（未修改） | 上方媒体区与底部操作区为 `shrink-0`，中间标签/描述/预览/正文区域独占 `overflow-y-auto`，Modal body 高度受 85vh 限制。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 64 项更新为“自动化通过”，同步矩阵为 50 项自动化通过、36 项未验证，并记录文件关联与隔离边界。 |

验证记录：在 1280×900 下，滚动中间区域后 `scrollTop` 大于 0，而封面和“复制提示词”按钮的坐标保持不变。切换至 390×520 后弹窗四边均处于视口内，底部操作仍可见。夹具最初使用 SVG Data URL，项目既有 URL 安全策略按预期降级为占位图；改为允许的 PNG Data URL 后得到实际媒体固定区证据。Web 全量门禁为 21 个 Vitest 文件 66 项、TypeScript、生产构建与 67 项 Playwright 回归通过。该证据不外推为真实远程图片加载、动画以外的浏览器渲染差异、触屏惯性滚动、系统剪贴板权限或跨设备资产同步。

## 102. 提示词远程缩略图与旧缓存降级（2026-08-28）

本切片关闭中文主清单第 65 项。Chromium 使用 Playwright 自管的隔离 Vite 4173，浏览器本地存储仅启用一个路由夹具来源，并在隔离 IndexedDB 的 `prompt_cache` 写入一小时前的原始缓存；不访问真实远程来源、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/prompt-thumbnail-fallback.spec.ts` | 新增 | 写入含 Linux.do 拒绝嵌入地址和 Banana Prompt Quicker 已失效参考图的一小时前缓存，验证提示词卡片、来源内容表格和详情弹窗都降级为占位图，且不发起坏图请求。 |
| `web/src/services/api/prompt-image-url.ts`、`web/src/services/api/prompts.ts` | 既有实现（未修改） | 前者集中屏蔽已知无法嵌入/已失效缩略图；后者无论远程首读还是缓存读都再次调用过滤器后再向三处 UI 提供数据。 |
| `web/src/components/prompts/prompt-card.tsx`、`web/src/components/layout/prompt-source-content-modal.tsx`、`web/src/pages/prompts/components/prompt-detail-dialog.tsx` | 既有实现（未修改） | 三处在过滤后空 `coverUrl` 时渲染各自的占位图，不再创建图片元素。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 65 项更新为“自动化通过”，同步矩阵为 51 项自动化通过、35 项未验证，并记录文件关联与隔离边界。 |

验证记录：一小时前的 `prompt_cache` 原始记录仍带两种坏 URL；加载页面时 `withSourceMeta` 再次过滤，提示词卡片没有带该标题的图片元素。打开详情、进入配置页来源内容表格及其嵌套详情后，各区域均没有图片元素；浏览器对两条坏地址的请求列表为空。Web 全量门禁为 21 个 Vitest 文件 66 项、TypeScript、生产构建与 68 项 Playwright 回归通过。该证据覆盖已知拒绝跨域嵌入与已失效资源及旧缓存，不外推为任意未知站点的网络故障、真实 CDN 可用性、浏览器离线模式或跨设备缓存同步。

## 103. 提示词来源默认集、筛选与失败恢复（2026-08-28）

本切片关闭中文主清单第 66 项。实时只读读取 Image Prompts 统一仓库后，六个当前默认来源数量依次为 323、494、53、76、126、129；已不再把数量为 535 的 Freestylefly 作为新默认来源。所有浏览器验证使用 Playwright 自管的隔离 Vite 4173 和路由夹具；不写入真实来源配置、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/services/api/prompt-source-presets.ts` | 修改 | 默认来源从七项收敛为当前清单指定的六个统一仓库 JSON URL。 |
| `web/src/services/api/prompt-source-presets.test.ts` | 新增 | 固定默认来源数量、顺序、启用状态和统一仓库 URL。 |
| `web/src/stores/use-prompt-source-store.ts`、`web/src/stores/use-prompt-source-store.test.ts` | 修改、新增 | 将历史保存的 Freestylefly 内置来源无损迁移为自定义来源，保留 URL、启用状态和用户可删除性。 |
| `web/e2e/prompt-source-data.spec.ts` | 新增 | 以六条路由夹具验证独立启用、来源与标签筛选；以两个自定义 JSON 来源验证非数组及 503 后仍显示失败且保留可查看缓存。 |
| `web/e2e/prompt-library-layout.spec.ts`、`web/e2e/prompt-detail-dialog.spec.ts`、`web/e2e/prompt-thumbnail-fallback.spec.ts` | 修改 | 更新隔离持久化夹具，使其与六个默认来源集一致。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 66 项更新为“自动化通过”，同步矩阵为 52 项自动化通过、34 项未验证和当前质量门禁数量。 |

验证记录：实时来源读取确认六个文档指定数量为 323、494、53、76、126、129；默认来源单测固定同一顺序和 URL。隔离浏览器先显示 6 条一来源一夹具的提示词，按“香蕉标签”和 Banana 来源可收敛到 1 条；关闭 Banana 后刷新，合计为 5 条。两个标准 JSON 自定义来源初次均可查看内容，之后一个返回对象根、另一个返回 503，均显示“失败”，但再次“查看内容”仍保留原缓存。迁移单测确认旧 Freestylefly 内置来源不会消失，而会成为启用状态不变的自定义来源。Web 全量门禁为 23 个 Vitest 文件 68 项、TypeScript、生产构建与 70 项 Playwright 回归通过。该证据不外推为未来上游条目数量、真实公网连续可用性、所有未知 JSON 格式或跨设备来源同步。

## 104. 提示词来源界面可读性（2026-08-28）

本切片关闭中文主清单第 67 项。Chromium 使用 Playwright 自管的隔离 Vite 4173 与两个本地 JSON 路由夹具；不写入真实来源配置、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/prompt-source-data.spec.ts` | 修改 | 在既有来源数据夹具中新增卡片布局和操作可读性测试：验证开关位于来源标题左侧、初始数量/状态、四个带文字操作按钮、刷新后的数量/正常/上次成功，以及定时拉取区的独立边框。 |
| `web/src/components/layout/config-prompt-sources.tsx` | 既有实现（未修改） | 以圆角边框来源卡片呈现左侧开关、状态信息和文字按钮，并使用单独边框 `section` 承载定时拉取。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 67 项更新为“自动化通过”，同步矩阵为 53 项自动化通过、33 项未验证。 |

验证记录：自定义来源卡片初始显示左侧开关、`0 条`和“尚未拉取”，并提供“查看内容”“立即拉取”“编辑来源”“删除”四个文字按钮；开关的视口 x 坐标小于标题，确认其位于左侧。点击“立即拉取”后，卡片更新为 `1 条`、`正常`和“上次成功”时间。定时拉取标题的父区有非零边框。当前代码版本的完整 Playwright 为 71 项通过；第 66 项已验证的 Web 23 个 Vitest 文件 68 项、TypeScript 与生产构建未发生业务实现变更。该证据不外推为长来源列表虚拟化、网络慢速状态、所有主题细节、删除确认后的永久配置变化或跨设备同步。

## 105. 画布提示词库直接搜索与插入标题（2026-08-28）

本切片关闭中文主清单第 68 项。Chromium 使用 Playwright 自管的隔离 Vite 4173：本地存储禁用六个内置来源，仅启用一个内存路由的公开提示词来源；审核提示词通过浏览器内存导入。测试不读取或写入用户资产、真实 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-prompt-library.spec.ts` | 新增 | 验证公开库没有“我的提示词”分组，输入来源关键字无需展开来源即可显示匹配项；导入审核运行时库后点击“插入画布”，从真实导航后的 Zustand 画布状态断言文本节点类型、标题、正文、提示词和成功状态。 |
| `web/src/lib/canvas/prompt-library.ts` | 修改 | 创建文本节点后显式将调用方传入的提示词标题写入 `CanvasNodeData.title`，避免仅保留默认“文本”节点标题。 |
| `web/src/pages/prompts/index.tsx`、`web/src/pages/prompts/dashboard.tsx` | 既有实现（未修改） | 前者提供公开来源直接搜索与无“我的提示词”分组的入口；后者从审核通过的运行时词库调用 `insertPromptIntoCanvas` 并导航到目标画布。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 68 项更新为“自动化通过”，同步矩阵为 54 项自动化通过、32 项未验证及浏览器 72 项回归基线。 |

验证记录：公开库加载单一内存来源后，页面没有“我的提示词”Tab；输入“无需展开来源”直接显示“无需展开来源的画布搜索命中”。导入审核迁移夹具后，运行时词库中的“QA 雨夜肖像”点击“插入画布”即导航到新画布，状态中的节点为 `text`，标题仍为“QA 雨夜肖像”，`content` 和 `prompt` 均为 `cinematic street portrait in neon rain, natural pose`，状态为 `success`。Web 全量门禁为 23 个 Vitest 文件 68 项、TypeScript、生产构建与 72 项 Playwright 回归通过。该证据不外推为真实远程来源持续可用、未审核个人内容、跨设备同步、所有历史损坏项目数据或真实生成服务。

## 106. 全站 Agent 生成任务状态（2026-08-28）

本切片关闭中文主清单第 69 项。验证仅使用 Zustand 内存工作台任务、内存画布快照和 Canvas Agent 的伪 SSE 响应，不启动真实 Codex、真实生成服务、3000/17371、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/lib/agent/agent-site-tools.test.ts` | 新增 | 发起两次生图、两次视频工作台命令，验证每次运行都返回 `taskId`；覆盖排队、运行、成功和失败四种任务状态、按 `taskId` 精确查询，以及以当前画布 `nodeIds` 查询生成节点。 |
| `web/src/lib/agent/agent-site-tools.ts`、`web/src/stores/use-workbench-agent-store.ts` | 既有实现（未修改） | 前者将工作台命令导航到生图/视频页面并创建可追踪任务，后者以本页内存任务表保存状态。 |
| `web/src/components/agent/local-agent-panel.tsx`、`web/src/services/api/canvas-agent.ts` | 既有实现（未修改） | 页面在获得焦点或重新可见时调用 `/canvas/activate`，并以各自 `clientId` 上报/接收工具请求。 |
| `canvas-agent/src/canvas/session.ts`、`canvas-agent/src/canvas/session.test.ts` | 既有实现（未修改） | 服务端以最近活动的 `clientId` 为未绑定工具的目标；单测验证 `generation_get_status` 只发送给当前激活网页，另一网页没有收到工具请求。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 69 项更新为“自动化通过”，同步矩阵为 55 项自动化通过、31 项未验证，以及 Web 24 个文件/69 项测试基线。 |

验证记录：隔离生图和视频提交均返回形如 `image-N`、`video-N` 的 `taskId`；同一任务表中可汇总 `queued=1`、`running=1`、`succeeded=1`、`failed=1`，并以 `taskId` 仅返回目标运行中生图任务。向 `generation_get_status` 提交当前画布的 `nodeIds` 时，只返回该画布的 `loading→running` 配置节点及其项目 ID，不混入其他节点或工作台任务。Canvas Agent 的两客户端测试激活第二页后，状态查询工具仅发送给第二页，第一页没有收到调用。Web 全量测试为 24 个 Vitest 文件 69 项、TypeScript 通过；Canvas Agent 203 项测试通过。该证据不外推为真实模型队列、跨浏览器本地状态复制、真实多窗口焦点事件或生产 Agent 服务可用性。

## 107. 本地 Agent 多标签页画布隔离（2026-08-28）

本切片关闭中文主清单第 70 项。验证使用 Canvas Agent 的两至三条伪 SSE 连接和内存画布快照，不启动浏览器真实 Agent、Codex、用户画布、3000/17371、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/canvas/session.test.ts` | 既有实现（已复核） | 两客户端分别上报不同画布，验证焦点切换后的读取/写入目标；turn 绑定首个客户端后切换焦点，读取和文本创建仍只访问首个客户端；关闭活动页回退到最近仍连接页；绑定页断开时拒绝操作而不转投另一页；另一页返回同一请求 ID 被拒绝。 |
| `canvas-agent/src/canvas/session.ts`、`canvas-agent/src/server/http.ts` | 既有实现（已复核） | `activeClientId` 根据焦点维护，`boundClientId` 覆盖当前 turn 的工具目标；HTTP 在 turn 启动时绑定发起 `clientId`，完成或失败后释放。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 70 项更新为“自动化通过”，同步矩阵为 56 项自动化通过、30 项未验证。 |

验证记录：两个客户端分别保存 `canvas-first`、`canvas-second` 后，焦点切换让读取按活动页返回，文本写入只向第二页发送；turn 绑定第一页后即使焦点改到第二页，读取和创建操作仍只抵达第一页，释放绑定后才返回第二页。活动页关闭后读取回退到尚连接页面；绑定页关闭时请求报“当前没有已连接画布”，第二页没有收到工具调用，重连同一 clientId 后才恢复。对同一 requestId，第二页回传返回 `false`，只有请求第一页可结算结果。Canvas Agent 203 项测试已通过。该证据不外推为真实浏览器窗口焦点 API、网络重连时序、跨设备连接或真实 Codex 执行。

## 108. 本地 Agent 多标签页会话同步（2026-08-28）

本切片关闭中文主清单第 71 项。测试使用两条伪 SSE 连接和内存 Agent 会话状态，不启动真实 Codex、浏览器、用户项目、3000/17371、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/canvas/session.test.ts` | 修改 | 新增两客户端回归：共享会话切换、同线程用户消息与运行状态同时广播；运行中写操作锁拒绝，结束后回到 `ready` 并可重新取得写锁。 |
| `canvas-agent/src/canvas/session.ts`、`canvas-agent/src/server/http.ts` | 既有实现（已复核） | 会话、线程和消息事件站点级广播；`codexMutation` 统一保护新建、恢复、删除和发送端点，忙碌时返回 `CONVERSATION_BUSY`。 |
| `web/src/components/agent/local-agent-panel.tsx` | 既有实现（已复核） | 接收会话/工作空间/聊天广播，按当前线程过滤输出，并在运行时禁用发送、新建、恢复和删除。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 71 项更新为“自动化通过”，同步矩阵为 57 项自动化通过、29 项未验证及 Agent 204 项测试基线。 |

验证记录：两个客户端均收到 `thread-shared` 的工作空间事件、同一 `turn-shared` 用户消息及 `{ busy: true }` 状态；会话状态为 `running` 时无法取得任何 Codex 写锁，模拟发送、新建、恢复或删除都会在 HTTP 统一守卫中得到 `CONVERSATION_BUSY`。将运行状态置回结束后，会话恢复 `ready` 且可再次取得写锁。前端对非当前 threadId 的聊天和 Agent 事件提前返回，不渲染到当前对话。Canvas Agent 全量 204 项测试通过。该证据不外推为真实多窗口浏览器网络、实际 Codex 输出或跨设备一致性。

## 109. 本地 Agent 跨标签运行状态与完成语义（2026-08-28）

本切片关闭中文主清单第 72 项。Chromium 使用 Playwright 自管的隔离 Vite 4173、同一浏览器上下文的两个真实页面和每页独立内存 EventSource；不连接真实 Canvas Agent、Codex、用户项目、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| web/e2e/agent-cross-tab-running.spec.ts | 新增 | 第一个页面在工具完成后保持运行；第二个页面随后打开并从 hello 当前状态立即收到忙碌 turn，验证输入不可编辑、发送替换为停止；两页同时收到结束事件后恢复输入，并各自日志记录“本轮完成”。 |
| web/src/components/agent/agent-event-formatters.test.ts | 修改 | 固定工具完成与整轮完成是两个不同的日志生命周期：MCP 工具的 item.completed 仅显示“工具完成”，turn.completed 才显示“本轮完成”。 |
| web/src/i18n/locales/zh-CN.ts、web/src/i18n/locales/en-US.ts | 修改 | 将完成轮次日志分别统一为“本轮完成”与 “Turn completed”，避免与单个工具完成混淆。 |
| canvas-agent/src/canvas/session.ts、web/src/components/agent/local-agent-panel.tsx | 既有实现（已复核） | hello 含当前 codex 快照，SSE codex_state 逐页更新等待/发送状态；面板在 waiting 时禁用输入和发送。 |
| docs/frameflow-acceptance-matrix-2026-08-28.md、docs/post-development-roadmap.md、docs/session-development-record.md | 修改 | 将第 72 项更新为“自动化通过”，同步矩阵为 58 项自动化通过、28 项未验证，以及当前 Web/浏览器质量基线。 |

验证记录：第一页收到 mcp_tool_call(item.completed) 后日志仅有“工具完成”，没有提前出现“本轮完成”。第二页在此之后建立 EventSource 连接，hello.codex 的 busy、threadId 和 turnId 使其进入运行态，文本框为 contenteditable=false，发送被停止按钮替代。两页再收到 conversation_changed(ready)、turn.completed 与 codex_state(busy:false) 后，两个文本框均恢复可输入，且两页日志各出现一次“本轮完成”。该证据不外推为真实跨设备 SSE、浏览器崩溃恢复、真实 Codex 长任务或网络中断重连。

## 110. 本地 Agent 图片附件画布写入的前端子证据（2026-08-28）

本切片补强中文主清单第 73 项的前端附件落画布链路，仍不把该项标为完整通过。Chromium 使用 Playwright 自管的隔离 Vite 4173、内存 EventSource、内存 Agent 附件响应和浏览器本地图片存储；不连接真实 Agent、Codex、用户画布、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| web/e2e/agent-attachment-nodes.spec.ts | 修改 | 触发真实前端 canvas_create_attachment_nodes 与 canvas_apply_ops 分支，验证附件图片、分析文本、生成配置及文本/图片各一条入配置连线按序写入并逐次回传成功。 |
| web/e2e/canvas-attachment-persistence.spec.ts | 新增 | 在真实 Zustand 画布项目中写入同一类 image 节点，等待项目状态落盘后按节点 storageKey 从浏览器图片存储读取原图，补强附件节点的项目/二进制存储关联。 |
| web/src/components/agent/local-agent-panel.tsx | 既有实现（已复核） | attachmentNodeOps 按 clientId 获取附件、上传图片、按原尺寸比例生成 image 节点和 imageMetadata，再交给发起画布的 applyOps。 |
| canvas-agent/src/canvas/session.test.ts | 既有实现（已复核） | 已覆盖附件仅能由发起标签页读取和落画布，另一标签页或附件不存在时拒绝。 |
| docs/session-development-record.md | 修改 | 记录本次前端子证据和未覆盖边界，满足 AGENTS.md 的文件关联记录要求。 |

验证记录：隔离工具请求携带 attachment-1、标题“商品参考.png”和位置 (120, 80)；页面只请求当前 clientId 的附件端点，得到 1×2 PNG 后写入一条 image add_node 操作，尺寸为 1×2，metadata 状态为 success 且含 naturalWidth、naturalHeight、mimeType 和持久化 storageKey，并得到同一 requestId 的成功回传。随后模拟 Codex 调用 canvas_apply_ops 创建“商品分析提示词”文本、“商品主图生成”配置，写入文本→配置与图片→配置两条连接，并取得第二次成功回传。新增项目存储回归创建真实画布项目，写入同规格图片节点并等待画布状态持久化，随后通过该节点 storageKey 成功读取 1×2 PNG。当前仍未自动覆盖真实 Codex 根据商品信息创建文本提示词、生成配置与连线，以及真实画布刷新后再次参与生成；第 73 项继续保持未验证。

## 111. Agent 对话滚动的局部浏览器证据（2026-08-28）

本切片补强中文主清单第 74 项的长对话滚动行为，仍不把该项标为完整通过。Chromium 使用 Playwright 自管的隔离 Vite 4173 和内存 Agent 会话/历史响应；不连接真实 Canvas Agent、Codex、用户会话、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-chat-follow.spec.ts` | 新增 | 以 60 条隔离历史消息验证对话初始自动定位底部；手动回到顶部后显示“查看最新消息”，第 61 条消息到达不会强制滚动，点击该按钮后恢复到底部跟随。 |
| `web/src/components/agent/agent-chat.tsx` | 既有实现（已复核） | 以 `followMessagesRef` 记录用户是否位于底部；消息和内容尺寸变化时仅在跟随状态自动滚动，反之展示统一的 `AgentScrollToBottom` 入口。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 将第 74 项的已获自动化子证据写入状态矩阵及本会话文件关联记录，但保持“未验证”状态。 |

验证记录：60 条消息初始渲染后滚动容器与底部的距离不超过 2px。将 `scrollTop` 设为 0 并触发滚动事件后出现“查看最新消息”；写入第 61 条助手消息后滚动位置仍为 0，说明新消息没有中断上翻阅读。点击入口后滚动容器再次回到距底部不超过 2px，按钮消失。当前尚未覆盖从日志切回对话、恢复另一会话的自动定位，及对话与日志入口的像素级样式同构和底部留白；第 74 项继续保持未验证。

## 112. Agent 消息布局的局部浏览器证据（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-message-layout.spec.ts` | 新增 | 以隔离会话验证用户长文本右侧透明布局、助手左侧 Markdown、双图片附件与错误消息；切换深浅主题后检查无横向溢出。 |
| `web/src/components/agent/agent-chat-message.tsx` | 既有实现（已复核） | 按角色渲染用户右对齐、助手开放 Markdown、错误红色文本和紧凑附件。 |

验证记录：长用户消息所在行含 `justify-end` 且内容容器没有气泡背景/圆角类；助手行含 `justify-start`，错误文本计算色为 `rgb(220, 38, 38)`，两张附件均可见。切换浅色、深色主题后页面 `scrollWidth` 不超过 `clientWidth`。当前未覆盖所有屏幕宽度、复杂 Markdown 表格和真实网络图片失败；第 75 项继续保持未验证。

## 113. 画布工具模式的局部浏览器证据（2026-08-28）

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-tool-mode.spec.ts` | 新增 | 从真实画布库创建隔离项目，精确定位工具栏“选择”按钮，验证切至移动后的 `grab` 光标、空格按住时临时变为选择光标、松开后恢复移动。 |
| `web/src/components/canvas/infinite-canvas.tsx`、`web/src/components/canvas/canvas-toolbar.tsx` | 既有实现（已复核） | 前者按空格/Ctrl 临时反转工具，后者仅切换持久选择/移动模式。 |

验证记录：点击工具栏精确 `aria-label="选择"` 后，画布光标为 `grab`；按住空格为 `auto`，松开后回到 `grab`，证明临时切换未改写工具栏的持久移动状态。当前未覆盖框选虚线缩放、Ctrl 临时反转、节点上拖动画布、焦点控件空格语义和追加选择；第 76 项继续保持未验证。

## 114. 国际化基础框架的局部浏览器证据（2026-08-28）

本切片补强中文主清单第 78 项，但不将该项标为完整通过。Chromium 使用 Playwright 自管的隔离 Vite 4173 和独立浏览器存储；不访问真实用户配置、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/i18n-basic.spec.ts` | 新增 | 从真实顶部语言按钮切换中文/英文，验证首页导航、设置弹层标题/Provider Tab/新增 Provider 按钮、图片工作台 Model 组合框的即时翻译，以及两个方向刷新后仍保持所选语言。 |
| `web/src/i18n/index.ts` | 既有实现（已复核） | 以 `infinite-canvas:locale` 作为 locale 的本地持久化键，并在写入后调用 i18next 切换。 |
| `web/src/components/layout/user-status-actions.tsx` | 既有实现（已复核） | 根据当前语言计算下一语言的可访问名称，供顶部按钮切换并让 React/i18next 驱动页面重新渲染。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 记录第 78 项的自动化子证据、完整回归基线与未覆盖范围，满足 `AGENTS.md` 的本次文件关联记录要求。 |

验证记录：从中文首页点击“切换到 English”后，顶部“我的画布”即时变为 `My Canvases`，按钮变为“Switch to 简体中文”；设置弹层即时显示 `Settings & Preferences`、`Providers` 与 `Add provider`，图片工作台显示名为 `Model` 的组合框。刷新页面后英文仍保持。再切回中文并刷新，按钮恢复为“切换到 English”。定向 Playwright 为 1 项通过，随后完整 Playwright 为 79 项通过；Web TypeScript 与文档内容检查也通过。该证据不外推为版本发布弹层、移动端导航、渠道编辑器、所有模型下拉项、全部路由/提示词/错误文案或文档站的中英文搜索保持；第 78 项继续保持未验证。

## 115. 文档站国际化路由与搜索（2026-08-28）

本切片关闭中文主清单第 77 项。使用 Next 生产构建和隔离 Playwright CLI 浏览器，服务仅绑定 `127.0.0.1:4302`；不访问用户配置、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `docs/src/lib/i18n.ts` | 修改 | 固定英文与简体中文均使用显式 URL 前缀，避免默认英文路径被 Next/Fumadocs 双向重定向而循环；`localizePath` 同步生成 `/en/...` 或 `/zh-CN/...`。 |
| `docs/src/lib/layout.shared.tsx` | 修改 | 将文档导航改为统一 locale 路径，并用当前 Fumadocs 16 实际注册的翻译键翻译语言选择、搜索触发器/弹层、空结果、移动端菜单及目录标题。 |
| `docs/AGENTS.md`、`docs/CLAUDE.md` | 新增（Next 16 自动生成） | `next dev` 自动写入的版本规则入口与其别名；规则要求随文档站工作提交，避免下次启动重复产生未跟踪文件。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 77 项标为人工通过，更新当前文档站质量结论，并记录本次文件关联和验证边界。 |

验证记录：修复前访问 `/en` 会重定向到 `/`，而 `/` 又重写到 `/en`，浏览器报重定向循环。修复后生产服务根路径仅 307 至 `/en/`；`/en/docs/overview/quick-start` 与 `/zh-CN/docs/overview/quick-start` 均为 200。浏览器从英文“Choose a language”切换“简体中文”后，同一页面转为中文 URL、标题“快速开始”、中文导航与“搜索文档”；输入“画布”得到中文结果。切回英文后回到 `/en/docs/overview/quick-start`，输入 `canvas` 得到英文结果；中文路径刷新后仍保持中文。`npm run types:check`、`npm run build` 与内容检查通过，生产浏览器为 0 个 console error。生产环境另有远程首页预加载图片未使用的浏览器 warning，未影响路由或搜索结果；该项不外推为全部文档正文的翻译完整性、远程图片可用性或 Docker 部署。

## 116. 全局设置弹层主题的局部浏览器证据（2026-08-28）

本切片补强中文主清单第 79 项，但不将该项标为完整通过。Chromium 使用 Playwright 自管的隔离 Vite 4173 与独立浏览器本地存储；不读取用户配置、用户资产、真实 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/global-modal-theme.spec.ts` | 新增 | 从真实首页“配置”入口打开 Ant Design 设置弹层；浅色读取容器/边框/正文计算色，关闭后通过真实主题切换按钮进入深色并重开，验证颜色均非透明且与浅色结果不同。 |
| `web/src/components/layout/app-providers.tsx`、`web/src/lib/app-theme.ts` | 既有实现（已复核） | `AppProviders` 根据持久化主题向全局 Ant Design `ConfigProvider` 传入亮/暗 algorithm；主题适配器同时覆盖通用 token 和组件 token。 |
| `web/src/components/layout/app-config-modal.tsx`、`web/src/components/ui/animated-theme-toggler.tsx` | 既有实现（已复核） | 前者是实际 `Modal` 入口，后者在根节点、`color-scheme` 与主题 store 间同步真实点击切换。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 在第 79 项写入已获得的自动化子证据、当前 80 项浏览器基线及未覆盖边界，满足 `AGENTS.md` 的对话级文件关联记录要求。 |

验证记录：测试从浅色存储状态进入首页，设置弹层的 `.ant-modal-content` 容器、边框和正文均获得非透明计算色；按 Escape 关闭后，点击“切换到深色主题”使根节点进入 dark 状态，重新打开同一设置弹层后这三项计算色与浅色结果不同。定向 Playwright、完整 80 项 Playwright 回归与 Web TypeScript 均通过。当前未覆盖版本发布弹层、渠道编辑抽屉、Select/Popover、图片编辑器、移动端及像素级对比，故第 79 项继续保持未验证。

## 117. 画布缩放稳定性的局部浏览器证据（2026-08-28）

本切片补强中文主清单第 80 项，但不将该项标为完整通过。Chromium 使用 Playwright 自管的隔离 Vite 4173 与新建的浏览器本地画布；不读取用户项目、用户资产、真实 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-zoom-stability.spec.ts` | 新增 | 从真实画布页新建隔离画布，连续将 `range` 缩放设为 5%–500% 的交错值，逐次断言受控 value，再重置为 100%，并捕获 React 循环类浏览器错误。 |
| `web/src/pages/canvas/project.tsx`、`web/src/components/canvas/canvas-zoom-controls.tsx` | 既有实现（已复核） | `setZoomScale` 将比例夹在 0.05–5 并以当前视口中心换算位置；缩放控件把同一受控比例投影到 5–500 的滑杆和百分比显示。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 在第 80 项写入已有自动化子证据、当前 81 项浏览器基线和边界，满足 `AGENTS.md` 的对话级文件关联记录要求。 |

验证记录：隔离新画布中的滑杆依次接受 65、140、35、275、5、500、100、175、45、100，并且每一次都回显对应受控值；点击“重置视图”后回到 100%。全过程没有捕获 `Maximum update depth`、`Too many re-renders` 或 hooks 数量变化类 pageerror。定向用例、完整 81 项 Playwright 回归与 Web TypeScript 均通过。当前未覆盖滚轮手势、节点尺寸拖拽、缩放时的选区/连线命中、极端视口和真实用户历史项目，故第 80 项继续保持未验证。

## 118. Agent MCP 初始化状态（2026-08-28）

本切片关闭中文主清单第 81 项。浏览器部分使用 Playwright 自管的隔离 Vite 4173、内存 EventSource 和 Agent HTTP 路由夹具；服务端部分使用 Canvas Agent 内存会话单测；均不连接真实 Codex、用户会话、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-mcp-initialization.spec.ts` | 新增 | 在真实右侧 Agent 面板注入 preparing 会话和 MCP 状态，验证服务启动提示、输入/发送阻断；再投递可选服务失败的 warning 会话，验证失败服务可见且输入恢复发送。 |
| `canvas-agent/src/canvas/session.test.ts` | 既有实现（已复核） | 验证对话 revision 单调递增、全部 MCP 终态前保持 preparing、可选 MCP 失败进入 warning，以及必需 Infinite Canvas MCP 缺失或失败进入 failed。 |
| `web/src/components/agent/local-agent-panel.tsx`、`web/src/components/agent/agent-chat.tsx` | 既有实现（已复核） | 前者将会话状态映射为 bootstrap 状态并以 preparing/warning 决定 composer 可用性，后者只在无用户/助手消息时显示 MCP 初始化进度与每项服务状态。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 81 项升级为自动化通过，同步未验证项、浏览器基线和对话级文件关联记录。 |

验证记录：准备态显示“正在启动 MCP 服务”和 `infinite-canvas`，输入为 contenteditable=false、发送禁用。投递 `infinite-canvas=ready`、`notion=failed` 的 warning 后，页面显示“部分 MCP 服务初始化失败”和 `notion`，输入恢复可编辑且填入消息后“发送”可用。服务端会话单测进一步固定：清单未完成或有 starting 服务时不能离开 preparing；可选失败为 warning，但 Infinite Canvas MCP 缺失或 notLoggedIn 会带错误进入 failed。定向浏览器、完整 82 项 Playwright 与 Canvas Agent 204 项测试均通过。

## 119. Agent 输入区窄面板布局（2026-08-28）

本切片关闭中文主清单第 82 项。Chromium 使用 Playwright 自管的隔离 Vite 4173、Agent HTTP 路由夹具和内存 Agent store；不连接真实 Canvas Agent、Codex、用户会话、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-composer-narrow-layout.spec.ts` | 新增 | 在真实右侧 Agent 面板固定 360px，再切为 700px；验证输入提示、上传图片、工具确认、权限模式和发送的可访问名称/可见性、草稿发送语义及面板横向溢出。 |
| `web/src/components/agent/agent-chat-composer.tsx`、`web/src/components/agent/agent-chat-prompt-input.tsx` | 既有实现（已复核） | 输入区将操作控制设为固定收缩项，面板宽度不足时以图标形式保留可访问名称；长宽度再通过 container query 展示文字。 |
| `web/src/components/agent/agent-panel.tsx` | 既有实现（已复核） | 面板宽度限制为 360–760px，并将实际宽度传给具有 container query 的输入区。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 82 项更新为自动化通过，并同步当前浏览器基线、未验证数量和文件关联记录。 |

验证记录：360px 时输入提示与上传、自动确认、请求批准、发送图标均可见，空草稿发送禁用；输入“窄面板输入仍可发送”后发送启用，面板 `scrollWidth <= clientWidth`。切换为 700px 后输入仍可编辑，全部操作保持可见/可访问且无横向溢出。定向浏览器与完整 83 项 Playwright 回归均通过。

## 120. Agent 持久化图片附件刷新后参与生成（2026-08-28）

本切片关闭中文主清单第 73 项。Chromium 使用 Playwright 自管的隔离 Vite 4173、隔离 IndexedDB、受控 Canvas Agent HTTP 路由夹具；不连接真实 Canvas Agent、Codex、用户项目、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-attachment-reload-generation.spec.ts` | 新增 | 在与产品同构的 `app_state`/`image_files` IndexedDB 数据中预置含 `storageKey` 的图片、文本和生成配置节点；启动后写入真实图片 Blob，刷新项目页，再通过真实配置节点“开始生成”入口拦截 Canvas Agent 请求，验证恢复后的参考图进入 `attachments` 且成功图节点回写。 |
| `web/e2e/agent-attachment-nodes.spec.ts`、`web/e2e/canvas-attachment-persistence.spec.ts` | 既有实现（未修改） | 前者覆盖 Agent 附件工具创建图片/文本/配置/连线并回传结果，后者覆盖图片节点的项目存储键读取；共同组成第 73 项完整前端证据。 |
| `canvas-agent/src/canvas/session.test.ts` | 既有实现（未修改） | 覆盖发起网页归属、关闭发起页的工具失败和不回退到另一画布。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 73 项更新为自动化通过，并同步浏览器 84 项、自动化通过 60 项、未验证 25 项的当前基线。 |
| `docs/session-development-record.md` | 修改 | 记录此次对话的文件关联、隔离边界与验证结果，满足根 `AGENTS.md` 的要求。 |

验证记录：先以同页面读取的存储测试尝试跨文档跳转，发现其仅证明当前页面上下文而不能可靠构造下一次启动数据；因此用现有画布 E2E 相同的 IndexedDB 预置方式作为刷新起点，且只在首次加载写入。项目加载后将 1×2 PNG 写入 `image_files`，刷新页面后由 `storageKey` 重新取回，并从真实“商品主图生成”配置节点点击“开始生成”。路由夹具实际收到一条 `/agent/codex/canvas-images` 请求，其中 `attachments[0]` 带原图片 Data URL；返回的图片经真实上传路径回写为成功图片节点。定向浏览器用例通过；该证据不声称真实 Codex/外部 ImageGen 的可用性或用户凭据有效性。

## 121. 全局设置弹层主题回归定位兼容（2026-08-28）

第 73 项新增回归纳入全量并发浏览器门禁后，既有第 79 项用例暴露出 Ant Design 当前 Modal 结构已使用 `.ant-modal-container`：ARIA `dialog` 下不再存在旧的 `.ant-modal-content` 后代。此修复只更新测试定位，不改动应用样式或业务代码。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/global-modal-theme.spec.ts` | 修改 | 将浅深主题计算色读取目标从失效的 `.ant-modal-content` 改为实际的 `.ant-modal-container`，继续以真实设置弹层验证容器、边框和正文颜色。 |
| `docs/session-development-record.md` | 修改 | 记录门禁失败诊断、测试兼容修正及其文件关联，满足根 `AGENTS.md` 的要求。 |

验证记录：第一次 16 并发完整回归为 83 通过、该单项超时；单独重跑同样失败，排除单纯资源争用。检查可见 `dialog` 的 DOM class 后确认它含 `ant-modal-container` 而不含旧内容类。定位修正后单项通过，重新执行 `npx playwright test --reporter=dot` 获得 84 passed（37.3s）。

## 122. Agent 对话滚动完整验收（2026-08-28）

本切片关闭中文主清单第 74 项。Chromium 使用 Playwright 自管的隔离 Vite 4173、内存 Agent store、历史和 HTTP 路由夹具；不连接真实 Canvas Agent、Codex、用户会话、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-chat-follow.spec.ts` | 修改 | 在既有长会话跟随回归上补充居中向下按钮的 32px 尺寸/绝对定位、底部无额外留白，以及由“日志”切回“对话”后自动定位到最新消息。 |
| `web/e2e/agent-history-records.spec.ts` | 修改 | 将恢复的第二会话扩展为 60 条消息，并在真实历史卡片恢复入口后断言对话时间线自动定位底部。 |
| `web/src/components/agent/agent-scroll-to-bottom.tsx` | 既有实现（未修改） | 聊天与日志共同复用的居中圆形向下按钮，固定尺寸、左侧居中和主题样式。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 74 项更新为自动化通过，并同步自动化通过 61 项、未验证 24 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录此次对话的文件关联、隔离边界与验证结果，满足根 `AGENTS.md` 的要求。 |

验证记录：60 条历史消息初始打开时位于底部；手动置顶后显示 32×32、绝对定位且水平居中的“查看最新消息”圆形按钮，新到达的第 61 条消息不改变阅读位置。点击该按钮后重新贴底，内容末项到内容容器底边的空隙不超过 1px。再次上翻后切换至“日志”并切回“对话”，对话时间线自动回到最新。历史页点击“第二段对话”后，真实恢复接口返回另一条 60 消息会话，时间线同样自动贴底。两项定向浏览器用例通过；该证据不外推为真实 Agent 网络抖动、超长富媒体消息或不同浏览器的滚动曲线验收。

## 123. Agent 消息布局与 Markdown 验收（2026-08-28）

本切片关闭中文主清单第 75 项。Chromium 使用 Playwright 自管的隔离 Vite 4173、内存 Agent 会话和 HTTP 路由夹具；不连接真实 Canvas Agent、Codex、用户会话、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-message-layout.spec.ts` | 修改 | 在既有双主题消息布局回归中补充 Markdown 标题语义和粗体计算字重断言，防止渲染器退化为纯文本。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 75 项更新为自动化通过，并同步自动化通过 62 项、未验证 23 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录此次对话的文件关联、隔离边界与验证结果，满足根 `AGENTS.md` 的要求。 |

验证记录：隔离会话中同时放入长用户文本、两张 PNG 附件、带二级标题和粗体的助手 Markdown，以及错误消息。实际页面显示用户在右、助手在左，用户容器没有圆角/背景气泡，助手标题以 heading 渲染、强调文本字重不低于 600，错误正文为红色。两次真实主题切换后，所有消息和附件仍可见，根文档没有横向溢出。定向浏览器用例通过；不外推为真实外部 Markdown 内容的所有 HTML 边界或屏幕阅读器专项验收。

## 124. 画布选择与平移交互补强（2026-08-28）

本切片关闭中文主清单第 76 项。Chromium 使用 Playwright 自管的隔离 Vite 4173 和启动前写入的双文本节点 IndexedDB 项目；不读取或写入用户画布、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-tool-interactions.spec.ts` | 新增 | 验证节点拖动、Shift 追加选择、框选虚线在 100%/175% 缩放下按反比写入 SVG 参数、左键/节点/中键平移、Control 临时反转、普通文本按钮的 Space 不重触发、真实“编辑文本”输入空格、slider、配置 Radio 及 Agent Tab 的空格键。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 76 项更新为自动化通过，并同步自动化通过 63 项、未验证 22 项和浏览器完整回归 85 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录此次对话的文件关联、隔离边界与未外推范围，满足根 `AGENTS.md` 的要求。 |

验证记录：预置节点 A/B 后，节点 A 可拖动且内联位置改变；按 Shift 选中 B 后两者同时带选择层级。空白区域拖动显示选择框，在 100% 时 `stroke-dasharray=6 4`、`stroke-width=1`，175% 时分别为 `6/1.75 4/1.75` 与 `1/1.75`，经画布缩放后保持物理虚线长度、间距和粗细。切到移动模式后左键拖动、从节点 A 拖动和中键拖动均改变世界 transform，节点上的平移不改变节点自身位置；按 Control 临时回到选择框且释放后恢复移动。普通“文本”按钮获焦后按 Space 不新增节点而仅临时反转工具，缩放 slider 获焦后保持自身值且不临时反转；通过节点“编辑文本”入口打开 textarea 后，Space 真实写入正文。创建配置节点后聚焦隐藏原生 Radio 按 Space 可切换“文本”模式而不改变画布工具；打开真实 Agent 面板后聚焦“日志”Tab 按 Space 可切换标签而不改变画布工具。定向浏览器用例通过，故第 76 项更新为自动化通过。

## 125. 国际化基础框架与移动端顶部栏（2026-08-28）

本切片关闭中文主清单第 78 项。Chromium 使用 Playwright 自管的隔离 Vite 4173 和独立浏览器存储；不读取或写入用户配置、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/i18n-basic.spec.ts` | 修改 | 扩展现有双向语言切换回归：增加中文/英文版本发布弹层字段、渠道编辑抽屉字段，及 390px 移动导航抽屉的标题和主要链接。 |
| `web/src/components/layout/user-status-actions.tsx` | 修改 | 修复 390px 下右侧操作区覆盖导航菜单的问题：小屏保留 Agent 与语言入口，文档、设置、主题、版本和 GitHub 等重复入口在桌面断点显示；设置仍可从移动导航进入。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 78 项更新为自动化通过，同步自动化通过 64 项、未验证 21 项和浏览器 86 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录此次会话的测试、修复、文件关联、隔离范围和未外推边界，满足根 `AGENTS.md` 要求。 |

验证记录：初始中文首页打开“查看版本更新”后显示“版本更新 / 当前版本 / 最新版本”；切换 English 后同一真实弹层显示 `Release updates / Current version / Latest version`。设置弹层中的 `Add provider` 打开渠道编辑抽屉，显示 `Edit provider / Provider name / Provider models / Select models`。390px 下首次点击移动菜单曾被右侧“打开 Agent”覆盖，浏览器点击日志确认是布局碰撞；修复后“打开导航菜单”可实际点击，抽屉在中文显示“导航 / 我的画布 / 生图工作台”，切至 English 后显示 `Navigation / My Canvases / Image Studio`。两条定向 Playwright 用例通过；随后完整浏览器回归 86 项通过，Web TypeScript 与文档内容检查通过（英文摘要 25 项、中文权威清单与状态矩阵各 95 项）。该证据不外推为每条业务错误、动态 Provider 返回或文档正文的逐字翻译验收。

## 126. Agent 本地 Skill 管理增强验收（2026-08-28）

本切片增强中文主清单第 83 项，但不将该项标为完整通过。浏览器使用 Playwright 自管的隔离 Vite 4173、内存 EventSource 和 Agent HTTP 路由夹具；Skill 存储单测使用系统临时工作区。两者均不连接真实 Codex、用户工作区、用户 Skill、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-skill-management.spec.ts` | 新增 | 真实技能面板覆盖项目/个人/系统/管理员范围、关键词与来源筛选、可滚动加载错误详情、启停、托管 Skill 的新建/编辑/删除、外部 Skill 不显示编辑删除入口，以及两个已连接页面接收同一 `skills_changed` 后的列表同步。 |
| `canvas-agent/src/skills/store.test.ts` | 既有实现（复核） | 11 条存储层测试验证托管目录创建、revision 冲突拒绝覆盖或删除、清空显示元数据时保留图标/品牌色、校验失败不提前写入、原子更新不遗留临时文件及安全路径边界。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 为第 83 项补充可复核证据，并同步浏览器回归基线至 88 项；状态仍为未验证。 |
| `docs/session-development-record.md` | 修改 | 记录此次会话的文件关联、隔离范围、验证结果和未覆盖边界，满足根 `AGENTS.md` 要求。 |

验证记录：技能面板首先显示项目托管 Skill、个人/系统/管理员外部 Skill 和 1 条加载错误；错误详情在真实 Modal 内显示。关键词“个人”和“个人”来源筛选均只保留个人 Skill；外部 Skill 没有编辑/删除操作。托管 Skill 从“已启用”切换为“已停用”，随后可由真实“创建 Skill”表单创建、编辑显示名称并在确认框中删除。第二页同时连接后，模拟服务端向两个 SSE 连接广播 `skills_changed`，两页均重新读取并显示新增的 `shared-skill`。定向浏览器 2 项与存储层 11 项均通过；随后完整浏览器回归 88 项、Web TypeScript 和文档内容检查均通过。当前尚未以断开/切换 Agent 的迟到读请求、外部编辑器在编辑中的冲突、真实 Codex 发现结果和全部草稿来源完成端到端验收，因此第 83 项保持未验证。

## 127. 全局弹层主题完整回归（2026-08-28）

本切片关闭中文主清单第 79 项。Chromium 使用 Playwright 自管的隔离 Vite 4173、独立浏览器本地存储、内存 EventSource 和 Agent HTTP 路由夹具；不读取或写入用户配置、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/lib/app-theme.ts` | 修改 | 补齐全局 Ant token：浅色浮层白底、轻灰悬停/选中态；深色浮层深底、低对比悬停/选中态。修复 Dropdown 实际读取 `controlItemBgHover`、而非仅读取 `Menu.itemHoverBg` 的设计系统遗漏。 |
| `web/e2e/global-modal-theme.spec.ts` | 修改 | 在既有设置 Modal 主题回归基础上，增加真实渠道编辑 Drawer 与首个 Select 浮层的浅深主题计算色和交互态覆盖。 |
| `web/e2e/agent-skill-management.spec.ts` | 修改 | 增加真实“创建 Skill” Dropdown/Menu 回归，确认菜单表面色及“空白创建”菜单项的真实悬停色随主题切换改变。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 79 项更新为自动化通过，并同步浏览器 90 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本对话的实现、测试、范围和文件关联，满足根 `AGENTS.md` 要求。 |

验证记录：先在浅色主题打开设置 Modal，读取容器、边框和正文的计算色；再通过渠道编辑入口打开 Drawer 和 Select，读取浮层表面及首项悬停色。关闭后切换深色主题，三类浮层均获得不同且非透明的真实计算色。Skill 面板的“创建 Skill”菜单进一步证明 Dropdown 的表面与“空白创建”菜单项悬停态实际读取全局 token。源码检索未发现 Cascader 或 TreeSelect 实例。定向浏览器 5 项通过；完整浏览器、类型检查和文档检查的结果以本节后的最终门禁为准。此证据不声称真实外部 Agent/Provider 可用，也不外推为当前不存在组件的行为。

## 128. 画布节点四角缩放稳定性（2026-08-28）

本切片关闭中文主清单第 80 项。浏览器测试使用 Playwright 自管的隔离 Vite 4173 与预置 IndexedDB 画布；不读取或写入用户配置、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/canvas/canvas-node.tsx` | 修改 | 为四个既有节点缩放控制柄增加稳定的 `data-node-resize-handle` 标记，不影响渲染或交互；用于可靠回归定位与调试。 |
| `web/e2e/canvas-zoom-stability.spec.ts` | 修改 | 保留滑杆跨范围稳定性测试，并新增预置文本节点的四角真实拖拽：断言缩放过程中工具条隐藏、节点内联尺寸/位置变化、松开后工具条恢复和零 React 循环错误。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 80 项更新为自动化通过，并同步浏览器 91 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本对话的实现、隔离测试与文件关联，满足根 `AGENTS.md` 要求。 |

验证记录：隔离项目的选中文本节点依次从左上、右上、左下、右下控制柄向外拖拽。每次按下并移动后，“编辑文本”节点工具条立即卸载，节点 style 已实时发生变化；松开鼠标后工具条重新出现。原有用例还将缩放滑杆按 65、140、35、275、5、500、100、175、45、100 的顺序交错设置并重置 100。两项定向测试均未捕获 `Maximum update depth`、`Too many re-renders` 或 hooks 数量变更错误；完整门禁结果以本节后的最终检查为准。

## 129. Agent Skill 断连迟到请求验收（2026-08-28）

本切片关闭中文主清单第 83 项。浏览器使用 Playwright 自管的隔离 Vite 4173、内存 EventSource、受控 Agent HTTP 路由和独立浏览器存储；不连接真实 Codex、用户工作区、用户 Skill、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-skill-management.spec.ts` | 修改 | 为 Skill GET 列表和详情路由加入可控延迟，并验证断连重置后即使旧响应迟到，也不会重新写回列表或打开编辑器。 |
| `web/src/stores/use-agent-skill-store.ts`、`web/src/components/agent/agent-skills-view.tsx` | 既有实现（复核） | 前者以 `loadSequence` 和 `connectionRevision` 丢弃过期列表，后者在详情读取、保存、删除、启停和草稿操作前后核对连接修订、URL 与 Token。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 83 项更新为自动化通过，并同步浏览器 92 项基线。 |
| `docs/session-development-record.md` | 修改 | 记录本对话的延迟夹具、验证边界和文件关联，满足根 `AGENTS.md` 要求。 |

验证记录：先完成正常 Skill 列表读取，再让手动“重新读取 Skill”的下一次列表响应阻塞。断连并重置后释放旧响应，页面未恢复 `product-grid`。重新连接并完成当前列表读取后，再让“编辑 product-grid”的详情响应阻塞；断连并重置后释放旧详情，列表仍为空且未出现编辑 Modal。该用例与既有搜索、范围筛选、错误详情、启停、托管读写、字段清空/revision 冲突和双标签同步回归共同覆盖第 83 项；完整门禁结果以本节后的最终检查为准。

## 130. Agent Skill 草稿入口补强（2026-08-28）

本切片为中文主清单第 84 项增加浏览器子证据，不将该项标为完整通过。测试使用 Playwright 自管的隔离 Vite 4173、内存 EventSource 和受控 Agent HTTP 路由；不连接真实 Codex、用户工作区、用户 Skill、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-skill-management.spec.ts` | 修改 | 覆盖三种创建入口中空上下文的两个草稿入口禁用、对话/画布草稿请求的 `source`、`threadId`、`clientId` 绑定，以及 Escape 取消草稿后零 Skill 写入；画布路径同时覆盖 `/canvas/state` 同步前置请求。 |
| `canvas-agent/src/agent/codex-client.test.ts`、`canvas-agent/src/agent/codex.ts`、`canvas-agent/src/server/http.ts` | 既有实现（复核） | 覆盖静默结构化 turn、不广播/不写历史、全局 Skill 变更通知、权限请求拒绝、画布源脱敏、普通斜杠文本保留、敏感草稿拒绝与断开客户端返回冲突。 |
| `docs/session-development-record.md` | 修改 | 记录本轮草稿入口的实现关联、隔离边界和未覆盖范围，满足根 `AGENTS.md` 要求。 |

验证记录：空对话、空画布时，“从当前对话生成草稿”和“从当前画布生成草稿”均为禁用菜单项。注入已完成对话和可用画布后，两个真实入口分别向 `/agent/codex/skills/draft` 提交 `conversation`/`canvas`，对话请求携带当前 `thread-draft`，两个请求均有当前 `clientId`；画布路径先成功同步 `/canvas/state`。返回草稿后打开可编辑表单，按 Escape 取消后没有创建 `draft-flow`，夹具内 Skill 列表仍为空。Skill 页面 5 项浏览器回归通过；Canvas Agent 静默草稿/会话专项 73 项通过；完整浏览器 93 项、Web TypeScript 和文档内容检查通过。运行中前端统一拒绝与多标签外部 MCP 焦点仍待浏览器专项验收，因此第 84 项保持未验证。

## 131. Agent Skill 调用正文 token 回归（2026-08-28）

本切片为中文主清单第 85 项增加浏览器子证据，不将该项标为完整通过。测试使用 Playwright 自管的隔离 Vite 4173 与受控 Agent HTTP 路由；不连接真实 Codex、用户工作区、用户 Skill、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-first-send.spec.ts` | 修改 | 在既有首次发送夹具中提供隔离 `product-grid` Skill，覆盖输入 `/`、候选菜单、回车选择、正文原子 token、失败保留选择和重试成功清除选择；两次请求均校验 `$product-grid` 文本标记及结构化 `skill.name/path`。 |
| `web/src/components/agent/agent-chat-prompt-input.tsx`、`web/src/components/agent/local-agent-panel.tsx` | 既有实现（复核） | 前者将候选 Skill 作为 contenteditable 内的 `data-agent-token-kind=skill` token 插入，并同步选择；后者发送时将选择写入消息元数据及 `/agent/codex/turn` 的结构化 Skill 输入，只在服务成功接受后按 revision 清除。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 为第 85 项添加局部证据，将浏览器用例数量更新为 94，并如实记录本轮完整并发运行的既有节点缩放时序失败及单文件重试结果。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关系、隔离边界、验证结果和仍待关闭的场景，满足根 `AGENTS.md` 要求。 |

验证记录：在真实右侧 Agent 面板输入“请整理产品信息 /”后，候选菜单显示“产品九宫格”；按 Enter 后该 Skill 出现在输入正文的 `data-agent-token-kind=skill` 原子 token 内，而不在输入框外另列。第一次受控发送返回 `500 / Skill 发送失败`：token 与选择保留，截获请求精确包含 `prompt: 请整理产品信息 $product-grid` 和 `{ name: product-grid, path }`。第二次放行后，同样的结构化输入再次发送成功，选择清空且输入区为空。定向浏览器回归 3 项、Web TypeScript 与文档内容检查通过。完整 94 项回归的并发执行曾在既有“节点四角反复缩放”用例出现一次工具条卸载时序失败；该文件单独重试 2 项通过，故不能把本轮记录为一次完整无干扰全绿。新建对话、断开连接、Skill 停用/删除后的失效清理，以及历史刷新后的 token 位置仍未完成专门浏览器验收，因此第 85 项保持未验证。

## 132. Agent 画布快捷引用正文 token 回归（2026-08-28）

本切片为中文主清单第 86 项增加浏览器子证据，不将该项标为完整通过。测试使用 Playwright 自管的隔离 Vite 4173、内存 Agent store 与受控 Agent HTTP 路由；不连接真实 Codex、用户画布、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-first-send.spec.ts` | 修改 | 注入独立文本节点，在真实 Agent 输入框覆盖 `@` 候选、Tab 选择、内嵌 `data-agent-token-kind=resource` token、精确请求元数据和发送后用户消息的可访问引用标签。 |
| `web/src/components/agent/agent-chat-prompt-input.tsx`、`web/src/components/agent/local-agent-panel.tsx`、`web/src/components/agent/agent-chat-message.tsx` | 既有实现（复核） | 分别负责把画布资源候选插入 contenteditable、以 `nodeId` 汇总结构化发送元数据，以及在用户消息内还原为引用标签。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 为第 86 项添加局部证据，将浏览器用例数量更新为 95，并保留并发完整回归的既有节点缩放时序风险。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关系、隔离边界、验证结果和仍待关闭的引用场景，满足根 `AGENTS.md` 要求。 |

验证记录：注入标题“产品说明”、内容“适合夏季通勤的轻量防晒衣”的文本节点后，在真实右侧 Agent 面板输入“请改写 @”，候选菜单出现“产品说明”；按 Tab 后 token 出现在输入正文且显示 `@文本1`。发送请求的 `messageText` 保持正文顺序，`messageMetadata.canvasReferences` 精确携带 `reference-text`、`文本1`、标题、`text` 类型和原始文本；用于 Codex 的 prompt 亦含同一 `mention`、`nodeId`、标题与类型。发送成功后用户消息仍显示带“产品说明”可访问名称的引用标签。定向浏览器回归共 4 项通过。多引用按光标插入、Backspace/Delete 整块删除、图片/视频/音频预览与刷新恢复仍未完成专门浏览器验收，因此第 86 项保持未验证。

## 133. Agent 历史消息元数据还原回归（2026-08-28）

本切片为中文主清单第 87 项增加浏览器子证据，不将该项标为完整通过。浏览器使用 Playwright 自管的隔离 Vite 4173 与受控历史 HTTP 路由；元数据存储测试使用系统临时目录。两者均不连接真实 Codex、用户工作区、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-history-records.spec.ts` | 修改 | 在既有 60 条隔离历史夹具中给靠近末尾的用户消息提供 Skill 与文本画布引用，覆盖恢复后用户消息正文、可访问引用标签和 Skill 路径标题均可见。 |
| `canvas-agent/src/agent/message-metadata.test.ts` | 既有实现（复核） | 覆盖元数据跨重启、按 `threadId`/`turnId` 而非仅 `clientMessageId` 匹配、线程删除隔离、预览资产随线程删除、未知版本/缺失 manifest 拒绝覆盖和超大预览拒绝。 |
| `web/src/components/agent/agent-chat-message.tsx`、`web/src/components/agent/local-agent-panel.tsx` | 既有实现（复核） | 前者按恢复的 `canvasReferences` 与 Skill 元数据解析用户消息 token；后者读取并标准化历史消息。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 为第 87 项添加可复核的前后端证据和未覆盖边界，满足根 `AGENTS.md` 要求。 |

验证记录：恢复“第二段对话”后，带有 `请改写 @文本1 $product-grid` 的历史用户消息仍显示正文、名称“历史产品说明”的画布引用标签以及 `product-grid` Skill 的路径标题；历史列表保持自动定位末尾。Agent 元数据单测覆盖持久化重启、精确身份匹配及删除隔离。真实 Canvas Agent 重启后经服务端历史接口恢复、图片附件悬浮预览、跨页面恢复与删除线程后的完整前端资产清理仍未完成专项浏览器验收，因此第 87 项保持未验证。

## 134. Agent 实时完成事件幂等回归（2026-08-28）

本切片为中文主清单第 88 项增加浏览器子证据，不将该项标为完整通过。测试使用 Playwright 自管的隔离 Vite 4173、内存 EventSource 和受控历史 HTTP 路由；不连接真实 Codex、用户工作区、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-realtime-reply.spec.ts` | 修改 | 在已有流式片段→权威历史同步夹具中重复发送 `turn.completed` 与空闲 `codex_state`，断言完整回复只保留一条，store 最终只含同一 turn 的一条用户消息和一条助手消息。 |
| `canvas-agent/src/agent/codex-history.test.ts` | 既有实现（复核） | 覆盖终态 turn 选择、标准历史与补充事件去重/排序/字段补全，以及补充事件在 Agent 重启后的 JSON 恢复。 |
| `web/src/components/agent/local-agent-panel.tsx` | 既有实现（复核） | 对实时事件按 thread/turn 过滤并在终态触发权威历史回读、合并而非盲目追加。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 为第 88 项添加幂等性证据和清晰未覆盖边界，满足根 `AGENTS.md` 要求。 |

验证记录：受控 turn 先显示“流式片段”，完成事件触发历史接口后替换为“这是一条完整同步回复。”；再次发送同一 turn 的完成/空闲事件后，完整回复仍只显示一条，store 精确为该 turn 的一条用户消息和一条助手消息。失败事件仍可收束为明确错误并清除 sending/waiting 状态。真实浏览器刷新、第二页面中途打开、发起页断线后画布工具归属与相同页面身份重连，仍未完成专项浏览器验收，因此第 88 项保持未验证。

## 135. 工作台历史媒体引用安全回收（2026-08-28）

本切片修正中文主清单第 89 项的本地文件回收路径，但不将该项标为完整通过。未读取或写入用户生成记录、用户素材、用户画布、3000/17371、Token、外部 Provider 或 Docker/容器；仅改动浏览器端存储服务与工作台删除回调。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/services/file-storage.ts` | 修改 | `cleanupUnusedMedia` 现在同时扫描图像与视频生成记录中的媒体 `storageKey`，避免画布/素材清理将历史视频、视频参考或音频参考误判为无引用。 |
| `web/src/pages/image/index.tsx`、`web/src/pages/video/index.tsx` | 修改 | 删除生成记录时先移除记录，再调用既有全局引用清理；不再直接删除记录列出的结果键，因此只有未被素材、画布或其他记录使用的专属文件才会被回收。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 记录修复范围、验证证据和仍缺少的浏览器验收，满足根 `AGENTS.md` 要求。 |

验证记录：Web TypeScript、生产构建和 `git diff --check` 通过。曾尝试以 Playwright 隔离 IndexedDB 验证“记录持有媒体时保留、记录删除后回收”，但测试夹具在页面 localforage 与独立 IndexedDB 连接间出现等待，未保留为不稳定用例，也不把该尝试当作通过证据。仍需以同一应用 localforage 驱动的隔离浏览器路径覆盖素材删除、节点/画布清空或删除后的历史缩略图、结果与参考图显示，以及删除记录后的专属媒体回收，因此第 89 项保持未验证。

## 136. 画布多图图片组交互验收（2026-08-28）

本切片关闭中文主清单第 90 项。测试使用 Playwright 自管的隔离 Vite 与预置 IndexedDB 画布；未读取或写入用户项目、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。端口检查仅确认已有监听进程，测试没有接管或停止它们。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/canvas/canvas-node.tsx` | 修改 | 为既有图片组根图、展开子槽位及折叠背板补充稳定的 `data-*` 标记，仅供浏览器回归定位；不改变图片组布局或交互逻辑。文件中已有的四角缩放标记保留为此前修改，未覆盖。 |
| `web/e2e/canvas-batch-prompt-recall.spec.ts` | 修改 | 在既有提示词回显用例旁新增四图图片组场景：验证收起的三张背板与“4 张”计数、展开后的成功/生成中/失败槽位、展开时隐藏节点工具栏、设为主图以及点击画布空白处收起。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 90 项更新为自动化通过，并将浏览器回归基线更新为 96 项；仍不将该计数表述为一次完整无干扰全绿。 |
| `docs/session-development-record.md` | 修改 | 记录本次实现关联、验证范围与边界，满足根 `AGENTS.md` 的对话级记录要求。 |

验证记录：`npm exec playwright test e2e/canvas-batch-prompt-recall.spec.ts --reporter=line` 通过 2 项。新场景先选择根节点，确认常规“移除节点”工具栏可见；展开后该工具栏卸载，四图根节点的 3 层背板、成功子图、生成中槽位和包含“第 4 张生成失败”的失败槽位均按各自状态显示。将成功子图设为主图后，根图的 `data-batch-primary` 更新为目标 ID，原主图进入展开列表；随后点击画布空白处，按钮恢复“图片组已收起”。同一场景将 320×240 横向根图切换为自然尺寸 900×1600 的纵向子图，根节点按最大边等比得到 180×320，内联画布坐标从 `(120,80)` 变为 `(190,40)`，中心均为 `(280,200)`。页面初始化期间视口恢复会改变瞬时屏幕位置，因此测试固定画布坐标中心而非瞬时 `getBoundingClientRect()`。该证据不外推为第 92 项的失败重试与删除语义、第 93 项的收起后尺寸调整，或真实外部模型的并发生成。

## 137. 画布多图主图切换几何回归（2026-08-28）

本切片关闭中文主清单第 91 项。复用第 90 项的 Playwright 隔离 Vite 与预置 IndexedDB 画布；不连接用户项目、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-batch-prompt-recall.spec.ts` | 修改 | 将图片组中的主图换成自然尺寸不同的纵向子图，读取根节点内联画布位置与尺寸，固定“等比适配、中心不漂移”的行为。 |
| `web/src/pages/canvas/project.tsx`、`web/src/lib/canvas/canvas-node-size.ts` | 既有实现（复核） | 前者按旧节点中心重算主图切换后的 `position`，后者以当前节点最大边为上限进行等比适配。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 将第 91 项更新为自动化通过，并记录为何断言画布坐标而非视口恢复期间的瞬时屏幕坐标。 |

验证记录：定向 Playwright 2 项通过。初始根图为 320×240，横向主图自然尺寸为 1600×900；选择 900×1600 的纵向成功子图后，根节点为 180×320，内联位置从 `(120,80)` 调整为 `(190,40)`，前后中心均为 `(280,200)`。该项不涉及失败子图的重试/删除、自由缩放模式、动画完成后的视觉截图，或真实 Provider 返回的图片尺寸。

## 138. 画布多图失败槽位回归（2026-08-28）

本切片关闭中文主清单第 92 项。浏览器使用隔离 Vite、预置 IndexedDB 和受控 `127.0.0.1:4173/agent/**` 路由；页面内只写入测试 token，不连接真实 17371、用户项目、用户资产、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-batch-prompt-recall.spec.ts` | 修改 | 新增三图根节点与两张失败槽位：通过受控 Canvas ImageGen 成功响应，验证单槽位重试、未重试槽位保持失败以及删除失败槽位后的计数。 |
| `web/src/pages/canvas/project.tsx` | 既有实现（复核） | `retryBatchImage` 将目标 `imageId` 传入重试流程；`deleteBatchImage` 仅过滤目标子图、更新 count，并在仅剩非组数量前保留展开状态。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 将第 92 项更新为自动化通过，并记录隔离服务边界。 |

验证记录：`npm exec playwright test e2e/canvas-batch-prompt-recall.spec.ts --reporter=line` 共 3 项通过。点击第二张失败槽位的“重试”后，受控 `/agent/codex/canvas-images` 只收到 `count: 1`；本地图片响应完成后，该槽位出现“设为主图”，第三张仍显示“第三张失败”。随后删除第三张，目标槽位从 DOM 移除，图片组按钮仍为“图片组已展开 / 2 张”。该证据不外推为网络中止、重复点击重试、持久化后刷新、已删除文件的物理回收，或真实 Canvas Agent 的鉴权与模型返回。

## 139. 画布多图收起后尺寸调整回归（2026-08-28）

本切片关闭中文主清单第 93 项。复用第 90–92 项的隔离 Vite 和 IndexedDB 图片组场景，不读取或写入用户项目、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-batch-prompt-recall.spec.ts` | 修改 | 在横图切竖图、点击画布空白收起之后，选择根节点并拖拽右下角真实缩放控制柄，验证尺寸变化、当前主图比例和收起状态。 |
| `web/src/components/canvas/canvas-node.tsx` | 既有实现（复核） | 图片节点默认缩放时按当前 `naturalWidth/naturalHeight` 保持比例；既有 `data-node-resize-handle` 为稳定的浏览器定位标记。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 将第 93 项更新为自动化通过，并记录隔离范围与未覆盖边界。 |

验证记录：定向 Playwright 3 项通过。纵图主图自然尺寸为 900×1600，根节点收起后拖拽右下角控制柄 36px，节点内联尺寸发生变化，`height / width` 保持 `1600 / 900`，按钮仍为“图片组已收起”。该证据不外推为自由缩放模式、其余三个角的纵图图片组拖拽、刷新持久化后的尺寸、缩放动画的视觉连续性或触摸交互。

## 140. 本地存储设置统计回归（2026-08-28）

本切片关闭中文主清单第 94 项。浏览器使用 Playwright 的独立 profile 与本地 IndexedDB；不读取、覆盖或删除用户浏览器数据、用户项目、用户资产、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/config-local-storage.spec.ts` | 新增 | 打开真实设置 Modal 的“本地存储”标签，验证 IndexedDB 主数据库与应用状态仓库统计；刷新期间切换到偏好设置再返回，确认弹层保持可操作。 |
| `web/src/components/layout/config-local-storage.tsx`、`web/src/services/local-storage-usage.ts` | 既有实现（复核） | 前者只在激活标签首次读取或点击刷新时请求统计，并单独维护 loading/error；后者并行读取浏览器配额及仓库游标统计，按字节数排序返回。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 94 项更新为自动化通过，将浏览器回归基线更新为 97 项，并记录本对话的文件关系。 |

验证记录：`npm exec playwright test e2e/config-local-storage.spec.ts --reporter=line` 通过 1 项。打开本地存储标签后显示“IndexedDB 存储使用情况”“Infinite Canvas 主数据”“应用状态”，点击“刷新统计”后立即切到“偏好设置”并返回，统计仍显示且刷新按钮恢复可用。该证据不外推为浏览器配额耗尽、IndexedDB 被拒绝时的错误呈现、超大 Blob 统计性能、跨浏览器配额差异或存储清理操作。

## 141. Agent 命令记录聚合与恢复回归（2026-08-28）

本切片关闭中文主清单第 95 项。浏览器使用隔离 Vite、内存 EventSource 与受控 Agent 历史接口；不连接真实 Codex、用户工作区、用户画布、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-process-timeline-live.spec.ts` | 修改 | 将既有单命令实时过程夹具扩展为两条连续命令，验证聚合摘要、用户展开、第二条输出，以及 `turn.completed` 后由权威历史恢复该过程记录。 |
| `web/src/components/agent/agent-chat-message.tsx`、`web/src/components/agent/agent-event-formatters.ts` | 既有实现（复核） | 前者按连续命令归并为折叠摘要并可展开，后者将命令、工作目录、退出状态和聚合输出投影为用户可见详情。 |
| `canvas-agent/src/agent/codex-history.test.ts` | 既有实现（复核） | 覆盖标准历史遗漏命令时由补充事件恢复完整命令卡片，以及标准/补充事件重复时去重。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 将第 95 项更新为自动化通过，并记录隔离范围与证据边界。 |

验证记录：`npm exec playwright test e2e/agent-process-timeline-live.spec.ts --reporter=line` 通过 1 项。实时事件先后完成 `pnpm test` 与 `git status --short`，页面显示“已执行 2 条命令”；点击摘要后两条命令均可见，第二条可展开显示 ` M src/demo.ts`。完成事件读取受控权威历史后，仍显示同一聚合摘要与第二条命令。该证据不外推为跨刷新本地持久化、超长命令输出分页、命令中止、权限审批或真实 Codex 进程执行。

## 142. 工作台历史媒体回收服务验证（2026-08-28）

本切片关闭中文主清单第 89 项的核心回收语义。此前浏览器夹具将页面 localforage 与独立 Vite 依赖入口混用，后者请求 IndexedDB 版本 4 而应用数据库已为版本 5，因而抛出 `VersionError`；该临时浏览器文件已删除，未保留不稳定测试。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/services/file-storage.test.ts` | 新增 | 模拟同一 localforage 数据库中的 `media_files`、`image_generation_logs` 和 `video_generation_logs`，验证两类生成记录均能保留引用媒体，孤立媒体被回收，移除记录后才可回收。 |
| `web/src/services/file-storage.ts` | 既有实现（复核） | `cleanupUnusedMedia` 先递归收集调用方数据、图片记录和视频记录中的 `storageKey`，再仅删除未被任一来源引用的媒体。 |
| `web/src/pages/image/index.tsx`、`web/src/pages/video/index.tsx` | 既有实现（复核） | 删除记录后调用全局 `cleanupImages`，该入口同时调用媒体回收，不再直接删除记录列出的媒体键。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 将第 89 项更新为自动化通过，并说明浏览器版本冲突没有被误报为成功。 |

验证记录：`npm exec vitest run src/services/file-storage.test.ts` 通过 1 项。图片历史记录引用 `video:from-image-history`、视频历史记录引用 `video:from-video-history` 时，两者均在清理后保留；没有引用的 `video:orphan` 被回收；清空两类记录后两条原先保留的媒体均被回收。该证据使用服务层 localforage mock，不外推为真实 IndexedDB 版本迁移、工作台可见卡片的点击流程、浏览器对象 URL 生命周期或多标签并发删除。

## 143. 验收矩阵状态汇总同步（2026-08-28）

第 89 至 95 项的定向回归完成后，矩阵表格状态已先于“当前结论”汇总更新。为避免旧的 64 项自动化、6 项人工通过、21 项未验证结论误导后续开发，本次仅按表格的 95 行状态同步汇总，不改变任何业务实现或验收状态。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 将当前结论同步为 75 项自动化通过、8 项人工通过、10 项未验证、2 项 Docker/容器范围阻塞，并列出十项未验证编号。 |
| `docs/post-development-roadmap.md` | 修改 | 将阶段 B 的剩余验收债务从过时的 21 项更新为当前 10 项，保留“不把局部证据外推为完整验收”的边界。 |
| `docs/session-development-record.md` | 修改 | 记录本次会话中的状态汇总来源和文档关联，满足根 `AGENTS.md` 的可追溯要求。 |

验证记录：以矩阵 95 行状态逐项聚合，得到自动化通过 75 项、人工通过 8 项、未验证 10 项、阻塞 2 项；未验证项为 11、22、31、33、62、84、85、86、87、88。该同步不代表十项未验证已通过，也不改变 Docker/容器部署不在当前范围的结论。

## 144. Agent Markdown 样式隔离浏览器回归（2026-08-28）

本切片关闭中文主清单第 33 项。测试运行于 Playwright 自管的隔离 Vite 4173、内存 Agent 会话及受控本地文件定位接口；不连接真实 Canvas Agent、Codex、用户工作区、用户文件、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-markdown-style.spec.ts` | 新增 | 驱动真实 Agent 消息渲染，覆盖长 Markdown 的代码块尺寸/正文、内联代码、复制控件焦点显示、外链确认、本地路径定位和深浅主题无横向溢出。 |
| `web/src/components/agent/agent-chat-message.tsx`、`web/src/styles/globals.css` | 既有实现（复核） | 前者将 Streamdown 链接交由中文确认 Modal 处理，并把本地绝对路径转换为文件管理器定位请求；后者提供紧凑代码块、隐藏语言标题与弱化操作控件样式。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 33 项更新为自动化通过，汇总同步为 76 项自动化通过、8 项人工通过、9 项未验证、2 项阻塞，浏览器回归计数更新为 98。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关联、隔离边界和验证证据，满足根 `AGENTS.md` 的可追溯要求。 |

验证记录：`npm exec playwright test e2e/agent-markdown-style.spec.ts --reporter=line` 通过 1 项。真实消息中的代码块全宽、代码正文紧凑且无语言标题；复制按钮初始弱化、键盘聚焦后显示。安全链接以按钮触发中文确认弹窗；外部 URL 显示确认提示，`/Users/...` 路径显示“在文件管理器中显示”并只向受控 `/agent/local-file/reveal` 发出该路径。切换深浅主题后页面仍无横向溢出。本项不外推为所有 Markdown 扩展语法、真实系统文件管理器响应、复制剪贴板权限失败或外部浏览器实际打开。

## 145. 图片编辑器连续缩放与遮罩同步回归（2026-08-28）

本切片关闭中文主清单第 62 项。测试运行于 Playwright 自管的隔离 Vite 4173 和测试页即时生成的 PNG，仅写入隔离浏览器 IndexedDB；不读取用户图片、用户画布或本机媒体，不连接 3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-image-editors.spec.ts` | 新增 | 预置真实图片节点并从其工具栏进入遮罩、裁剪和切图；连续滚轮缩放后检查三类覆盖层与同一 stage/图片同步，并验证 Alt 调整笔刷直径时圆心跟随鼠标。 |
| `web/src/components/canvas/canvas-node-mask-edit-dialog.tsx`、`canvas-node-crop-dialog.tsx`、`canvas-node-split-dialog.tsx`、`use-image-editor-viewport.ts` | 既有实现（复核） | 三个编辑器分别负责遮罩、裁剪和网格覆盖层，并共享以指针为锚点的滚轮缩放与平移视口逻辑。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 将第 62 项更新为自动化通过，汇总同步为 77 项自动化通过、8 项人工通过、8 项未验证、2 项阻塞，浏览器回归计数更新为 99。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关联、隔离边界和验证证据，满足根 `AGENTS.md` 的可追溯要求。 |

验证记录：`npm exec playwright test e2e/canvas-image-editors.spec.ts --reporter=line` 通过 1 项。局部遮罩、裁剪和切图三个真实弹窗均从 100% 连续滚轮缩放到 144%；遮罩 canvas 与图片边界重合，裁剪框仍在图片内，切图竖线仍以 stage 中心定位并覆盖其高度。Alt+拖动把笔刷直径调大时，笔刷预览圆心精确到最终鼠标位置。本项不外推为真实 AI 局部编辑请求、最终子节点生成、触摸手势、所有超大图片性能或跨浏览器渲染差异。

## 146. Agent Skill 失效选择回归（2026-08-28）

本切片补强中文主清单第 85 项，但不改变其“未验证”状态。测试使用 Playwright 自管的隔离 Vite 4173、受控 Skill 列表和内存 Agent 会话；不连接真实 Canvas Agent、Codex、用户工作区、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-first-send.spec.ts` | 修改 | 在真实 Agent 输入框中选择 Skill 后，模拟服务端重新读取时该 Skill 被停用；验证正文 token 与 `selectedSkill` 同时清理，同时验证新对话清空选择。 |
| `web/src/stores/use-agent-skill-store.ts`、`web/src/components/agent/local-agent-panel.tsx` | 既有实现（复核） | 前者在重新读取结果不再包含启用的同一 Skill 时清理选择与其 marker；后者创建新对话前主动清理 Skill 选择。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 记录第 85 项的新增局部证据，浏览器回归计数更新为 100，状态仍为未验证。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关联、隔离边界和验证证据，满足根 `AGENTS.md` 的可追溯要求。 |

验证记录：`npm exec -- playwright test e2e/agent-first-send.spec.ts --grep "新对话" --reporter=line` 通过 1 项。先选择 `product-grid` Skill，服务端重读将其标为停用后，输入框中的原子 token 和状态层 `selectedSkill` 均被清除，普通正文“请执行”保留；重新启用并再次选择后，点击“新对话”也清空 `selectedSkill` 和已卸载的 token。本项仍未覆盖断连、托管 Skill 删除、历史恢复后的 token 位置，因此第 85 项不提升状态。

## 147. Agent 多媒体画布引用与键盘删除回归（2026-08-28）

本切片补强中文主清单第 86 项，但不改变其“未验证”状态。测试使用 Playwright 自管的隔离 Vite 4173、内存 Agent 会话和隔离画布快照；不连接真实 Canvas Agent、用户画布、用户媒体、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-first-send.spec.ts` | 修改 | 从图片、视频、音频节点连续选择 `@` 引用，验证三类 token 与悬浮预览；在 token 相邻光标位置用 Backspace/Delete 删除并检查引用状态层同步。 |
| `web/src/components/agent/agent-chat-prompt-input.tsx`、`agent-canvas-reference-preview.tsx` | 既有实现（复核） | 前者按光标插入资源 token、对相邻 token 执行原子删除并同步引用元数据；后者按资源类型显示图片、视频或音频预览。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md` | 修改 | 记录第 86 项的新增局部证据，浏览器回归计数更新为 101，状态仍为未验证。 |
| `docs/session-development-record.md` | 修改 | 记录本次文件关联、隔离边界和验证证据，满足根 `AGENTS.md` 的可追溯要求。 |

验证记录：`npm exec -- playwright test e2e/agent-first-send.spec.ts --grep "多媒体" --reporter=line` 通过 1 项。输入框按当前光标连续插入图片、视频、音频三个资源 token；分别悬浮后显示对应预览。把光标置于视频 token 后按 Backspace、置于音频 token 前按 Delete，两个 token 均整块删除，`canvasReferences` 依次精确收敛为图片/音频和仅图片。本项仍未覆盖浏览器刷新后的编辑器 token 恢复，因此第 86 项不提升状态。

## 148. Agent 画布生图工作区与工具契约回归（2026-08-28）

本切片补强中文主清单第 31 项，但不改变其“未验证”状态。测试只创建系统临时目录与内存 SSE 连接；不连接真实 Canvas Agent、Codex、用户工作区、用户画布、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/config.test.ts` | 修改 | 覆盖旧版自动生成的 `AGENTS.md` 更新为当前独立指令源，同时严格保留不以 `# Infinite Canvas Agent` 开头的用户自写指令。 |
| `canvas-agent/src/canvas/session.test.ts` | 修改 | 通过真实 `CanvasSession` 发起 `canvas_generate_image`，验证当前激活画布收到提示词节点、图片配置节点、引用连线、选中配置和立即执行的 `run_generation` 批量操作。 |
| `canvas-agent/src/config.ts`、`canvas-agent/src/canvas/operations.ts` | 既有实现（复核） | 前者仅更新自身生成的默认工作区指令，后者将 `canvas_generate_image` 归一为图片生成流程并启用自动运行。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/session-development-record.md` | 修改 | 记录第 31 项新增的 Agent 端证据及其尚未覆盖的端到端边界，满足根 `AGENTS.md` 的可追溯要求。 |

验证记录：`npm exec -- tsx --test src/config.test.ts src/canvas/session.test.ts` 通过 33 项，`npm run build` 通过。尝试对两份既有测试文件执行全文件 Prettier 检查时发现仓库原有排版不符合当前默认规则，因此已恢复原有排版且不把该格式基线记为通过。旧版默认指令会被刷新为 `AGENT_PROMPT`，而“用户自己的工作约定”字节内容保持不变；`canvas_generate_image` 只向当前激活客户端发出 `canvas_apply_ops`，其中包含两个节点、参考连线和以图片模式执行的 `run_generation`。该证据不外推为真实 Codex ImageGen 图片落盘、网页上传与等比节点写回、真实 Agent 回复文本，或无生成结果时的 UI 防误报，因此第 31 项保持未验证。

## 149. Agent 画布引用刷新恢复回归（2026-08-28）

本切片关闭中文主清单第 86 项。测试使用 Playwright 自管的隔离 Vite 4173、内存 EventSource 与受控 Agent 历史接口；只写入 Playwright profile 的连接信息，不连接真实 Canvas Agent、Codex、用户工作区、用户画布、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-reference-history-refresh.spec.ts` | 新增 | 模拟已连接 Agent 的权威线程历史，验证首次连接与完整 `page.reload()` 后都自动重连、读取同一线程，并把图片画布引用恢复为用户消息中的紧凑标签和可悬浮预览。 |
| `web/src/components/agent/local-agent-panel.tsx`、`agent-chat-message.tsx` | 既有实现（复核） | 前者在连接后读取当前线程的权威历史，后者把 `canvasReferences` 解析为紧凑标签并使用历史保留的 `previewUrl` 展示预览。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 86 项提升为自动化通过，汇总同步为 78 项自动化通过、8 项人工通过、7 项未验证、2 项范围阻塞，并记录浏览器回归基线为 102。 |

验证记录：`npm exec -- playwright test e2e/agent-reference-history-refresh.spec.ts --reporter=line` 通过 1 项。隔离页面先由本地连接信息自动连接并读取 `thread-reference-refresh`，用户消息“请继续参考 @图片1 调整构图”显示“历史参考图片”标签，悬浮出现图片预览；完整刷新后，新的 Zustand 状态再次自动连接并从相同权威历史恢复同一标签和预览，线程历史端点至少读取两次。与既有 `agent-first-send.spec.ts` 的 `@` 候选、Tab 选择、多媒体预览和 Backspace/Delete 原子删除用例共同覆盖第 86 项。本项不外推为真实 Agent 进程、断线期间编辑器草稿恢复、损坏媒体 URL、触摸键盘或跨浏览器差异。

## 150. Agent Skill 删除、断连与历史 token 回归（2026-08-28）

本切片关闭中文主清单第 85 项。测试使用 Playwright 自管的隔离 Vite 4173、内存 EventSource、受控 Skill 管理和权威历史接口；不连接真实 Canvas Agent、Codex、用户工作区、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-skill-selection-lifecycle.spec.ts` | 新增 | 从真实 Skill 管理页“使用”已启用托管 Skill，验证删除该 Skill 或点击“断开”后，输入框原子 token 与 `selectedSkill` 同时清空。 |
| `web/e2e/agent-reference-history-refresh.spec.ts` | 修改 | 让同一权威历史用户消息同时带 Skill 和画布图片引用，验证完整刷新前后正文顺序保持为“先执行 /产品九宫格，再参考 @图片1 调整构图”。 |
| `web/src/components/agent/agent-skills-view.tsx`、`local-agent-panel.tsx`、`agent-chat-message.tsx` | 既有实现（复核） | 删除已选托管 Skill 时调用 `clearSelection`，断连的连接 effect 清空 Skill store；历史消息按结构化 `skill` 和 `canvasReferences` 渲染正文 token。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 85 项提升为自动化通过，汇总同步为 79 项自动化通过、8 项人工通过、6 项未验证、2 项范围阻塞，并将浏览器回归基线更新为 105。 |

验证记录：`npm exec -- playwright test e2e/agent-skill-selection-lifecycle.spec.ts --reporter=line` 通过 2 项；`npm exec -- playwright test e2e/agent-reference-history-refresh.spec.ts --reporter=line` 通过 1 项。删除已选的“产品九宫格”后，列表、正文 token 和 `selectedSkill` 均消失；实际点击“断开”后也发生同样收束。权威历史消息在刷新前后均恢复 Skill 标签与图片标签，且标签与普通正文顺序一致。既有 `agent-first-send.spec.ts` 同时覆盖 `/` 候选、发送成功/失败、停用 Skill 和新对话。本项不外推为真实 Agent 进程离线、外部/只读 Skill 删除、未知历史协议版本或跨浏览器差异。

## 151. 浏览器回归稳定性修正与完整门禁复核（2026-08-28）

本切片只修正隔离 Playwright 断言的精度假设，并复核本轮完整门禁；不读取、覆盖、移动或删除用户项目、资产、运行记录、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/prompt-detail-dialog.spec.ts` | 修改 | 保留详情弹窗滚动前后媒体与操作栏位置稳定的验收意图，但以 0.1px 容差比较浏览器布局浮点值，避免 CSS 亚像素取整造成无意义的失败。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将当前实测的 Web 25 文件/71 项、Canvas Agent 206 项和浏览器 105 项基线同步，并记录完整运行中的时序与断言结果。 |

验证记录：Web `npm test` 通过 25 个文件、71 项；`npm run typecheck` 与 `npm run build` 通过。Canvas Agent `npm test` 通过 206 项，`npm run build` 通过。Docs 内容检查、类型检查和生产构建通过。并行完整浏览器运行得到 103/105 通过，图片组收起和节点缩放两项在隔离复跑时分别 3/3、2/2 通过。随后单 worker 完整运行将提示词详情断言暴露为 224 与 223.9488px 之类的亚像素取整差异；定向修正后 `npm exec -- playwright test e2e/prompt-detail-dialog.spec.ts --reporter=line` 通过 1 项。最终执行 `npm run test:e2e -- --workers=1 --reporter=dot` 完成，105 项全部通过且未留下 `test-results` 失败产物。

## 152. Agent Skill 草稿双页面运行锁回归（2026-08-28）

本切片关闭中文主清单第 84 项。测试使用 Playwright 自管的隔离 Vite 4173、内存 EventSource 和受控 Agent HTTP 路由；不连接真实 Codex、用户工作区、用户 Skill、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-skills-view.tsx` | 修改 | 以同一个 `draftActionsDisabled` 条件控制创建下拉入口及按钮；Skill 的使用、编辑、删除在草稿生成或共享 Codex 运行态时同样禁用，避免表面可操作但服务端互斥拒绝。 |
| `web/e2e/agent-skill-management.spec.ts` | 修改 | 延迟草稿接口响应，验证当前页生成期间的操作锁；再向第二个已打开的真实 Agent 面板发送 `codex_state busy`，验证其同步禁用并在完成后恢复。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 84 项提升为自动化通过，汇总同步为 80 项自动化通过、8 项人工通过、5 项未验证、2 项范围阻塞，浏览器用例总数更新为 106。 |

验证记录：`npm exec -- playwright test e2e/agent-skill-management.spec.ts --reporter=line` 通过 6 项；`npm run typecheck` 通过。草稿 POST 被延迟期间，发起页的创建入口和托管 Skill 编辑均禁用；第二页收到同一线程的 `codex_state busy` 后，创建与编辑同样禁用，且不会新增第二个草稿请求。发送 `busy: false` 并释放第一个请求后，发起页打开可编辑草稿表单，第二页入口恢复。本项不外推为真实 Codex 草稿内容质量、服务端进程崩溃、跨设备网络延迟或真实外部 MCP 的业务结果。

## 153. 当前工作树可恢复检查点只读分类（2026-08-28）

本切片仅读取 Git 工作树和文件元数据；不提交、推送、清理、重置、覆盖、移动或删除任何文件。

| 分类 | 精确范围 | 关联与用途 | 检查点建议 |
| --- | --- | --- | --- |
| 运行源码 | `web/src/components/agent/agent-skills-view.tsx`、`web/src/components/canvas/canvas-node.tsx`、`web/src/components/layout/user-status-actions.tsx`、`web/src/lib/app-theme.ts`、`web/src/pages/image/index.tsx`、`web/src/pages/video/index.tsx`、`web/src/services/file-storage.ts` | 画布节点、Agent Skill 草稿运行锁、主题/布局和工作台媒体回收实现。 | 候选纳入；须连同对应测试一起保存。 |
| Agent 合约测试 | `canvas-agent/src/canvas/session.test.ts`、`canvas-agent/src/config.test.ts` | 工作区指令迁移和 `canvas_generate_image` 的画布写入/运行请求契约。 | 候选纳入。 |
| 浏览器与服务测试 | `web/e2e/` 下当前 20 个已修改或未跟踪的 `agent-*`、`canvas-*`、`config-local-storage.spec.ts` 文件，以及 `web/src/services/file-storage.test.ts` | 106 项浏览器回归与媒体回收单测所需夹具/覆盖；其中 `agent-skill-management.spec.ts`、`canvas-attachment-reload-generation.spec.ts`、`canvas-tool-interactions.spec.ts` 在本次开始前已未跟踪，需用户确认是否一并作为工程基础设施保存。 | 其余新增/修改测试可纳入；三项既有未跟踪测试单列待确认。 |
| 开发与验收文档 | `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 95 项状态矩阵、后续路线和本会话文件/证据关系。 | 候选纳入。 |
| 用户验收资产与历史报告 | `99_PERCENT_ACCEPTANCE.md`、`design-qa.md`、`artifacts/` 下 15 个 PNG/HTML/MD 文件 | 设计对比、截图、负反馈样本和历史验收记录；共约 19.3 MiB。 | 明确排除，保持未跟踪和原路径。 |

验证记录：`git diff --name-status` 显示 23 个已跟踪修改；`git ls-files --others --exclude-standard` 显示 26 个未跟踪路径。`git diff --check` 没有空白错误，仅报告 7 个既有/当前文本文件的 CRLF 将转换为 LF 提示。上述分类不代表已提交，也不授予提交或推送权限。

## 154. 上游 v0.15.1 可见行为兼容回归（2026-08-28）

本切片关闭中文主清单第 22 项。测试使用 Playwright 自管的隔离 Vite、受控远程来源响应和隔离浏览器数据；不访问真实 Prompt 来源、用户画布、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/prompt-source-data.spec.ts` | 修改 | 将 v0.15.1 默认来源迁移为自定义来源的 Freestylefly 记录写入隔离持久化状态，验证仍向历史 URL 拉取、在提示词页显示并可按来源筛选，配置页保持启用状态。 |
| `web/e2e/canvas-batch-prompt-recall.spec.ts` | 修改 | 将空白画布点击从不稳定的页面固定坐标改为真实画布容器内的空白位置，保留多图主图切换/收起/缩放交互的验收含义。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 22 项提升为自动化通过，汇总同步为 81 项自动化通过、8 项人工通过、4 项未验证、2 项范围阻塞，浏览器用例总数更新为 107。 |

验证记录：`npm exec -- playwright test e2e/prompt-source-data.spec.ts e2e/canvas-batch-prompt-recall.spec.ts e2e/canvas-node-prompt-scroll.spec.ts e2e/agent-skill-management.spec.ts e2e/i18n-basic.spec.ts e2e/config-local-storage.spec.ts --reporter=line` 首次得到 16/17 通过，失败仅为图片组测试使用页面固定坐标点击未落到画布空白。定位修正后 `npm exec -- playwright test e2e/canvas-batch-prompt-recall.spec.ts --reporter=line` 通过 3 项；`npm run typecheck` 通过。最终执行 `npm run test:e2e -- --workers=1 --reporter=dot`，107 项全部通过且未留下 `test-results` 失败产物。既有 `canvas-image-generation.test.ts` 覆盖单图初始主图与配置归并，Agent 图片预览、引用、语言和本地存储由对应已通过专项覆盖。本项不外推为第三方源在线可用性、历史源码逐字节一致或真实 Agent/ImageGen 调用。

## 155. Agent 长任务刷新与首发页断线回归（2026-08-28）

本切片关闭中文主清单第 88 项。测试使用 Playwright 自管的隔离 Vite、内存 EventSource 与受控 Agent 历史接口；不连接真实 Canvas Agent、Codex、用户工作区、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/agent-running-reconnect.spec.ts` | 新增 | 首发页接收流式片段，第二页接入同一长任务并在真实 `page.reload()` 后重新打开 Agent；首发页关闭后，第二页以终态事件触发权威历史读取，验证最终内容唯一、流式残片被替换且输入恢复。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 88 项提升为自动化通过，汇总同步为 82 项自动化通过、8 项人工通过、3 项未验证、2 项范围阻塞，浏览器用例总数更新为 108。 |

验证记录：`npm exec -- prettier --check e2e/agent-running-reconnect.spec.ts` 通过；`npm exec -- playwright test e2e/agent-running-reconnect.spec.ts --reporter=line` 通过 1 项；`npm run typecheck` 通过。该路径验证的是网页端协议恢复与去重，不外推为真实 App Server 的进程崩溃恢复、网络分区、跨设备事件投递或真实模型输出。

## 156. Agent 消息元数据重启、预览与删除闭环复核（2026-08-28）

本切片关闭中文主清单第 87 项。复核只使用 Canvas Agent 的临时目录测试、Playwright 自管的隔离 Vite 4173、内存 EventSource 与受控 Agent HTTP 路由；不连接真实 Canvas Agent、Codex、用户工作区、用户附件、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/agent/message-metadata.test.ts` | 既有测试（执行） | 验证持久化元数据经重新打开后仍按 thread/turn 精确匹配，删除某线程只移除该线程元数据和预览资产，且未知/缺失版本不被覆盖。 |
| `web/e2e/agent-image-message.spec.ts` | 既有测试（执行） | 验证权威历史中的图片附件显示紧凑缩略图，并能打开“图片附件预览”弹窗。 |
| `web/e2e/agent-history-records.spec.ts` | 既有测试（执行） | 验证切换历史会话后结构化用户元数据仍渲染，并通过真实历史页全选、确认删除当前工作空间的对话记录。 |
| `web/e2e/agent-running-reconnect.spec.ts` | 既有测试（执行） | 验证跨页长任务在刷新、首发页断线和终态事件后由第二页读取权威历史收束，补足重启恢复的网页协议路径。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 将第 87 项提升为自动化通过，汇总同步为 83 项自动化通过、8 项人工通过、2 项未验证、2 项范围阻塞。 |

验证记录：`canvas-agent` 中的 `npm exec -- tsx --test src/agent/message-metadata.test.ts` 通过 7 项；`web` 中的 `npm exec -- playwright test e2e/agent-image-message.spec.ts e2e/agent-history-records.spec.ts e2e/agent-running-reconnect.spec.ts --reporter=line` 通过 3 项。四组证据分别覆盖存储重启与精确身份、预览资产删除、网页附件预览和全量删除，以及跨页面刷新/断线后的权威历史恢复。本项不外推为真实 App Server 崩溃、真实磁盘损坏恢复、跨设备同步、浏览器缓存损坏或外部模型输出。

## 157. 浏览器回归稳定性收束与 108 项完整门禁（2026-08-28）

本切片只修正隔离 Playwright 的定位和布局断言，不改业务实现；不读取、覆盖、移动或删除用户项目、资产、运行记录、3000/17371、Token、外部 Provider 或 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/canvas-batch-prompt-recall.spec.ts` | 修改 | 不再按固定比例猜测空白位置；在画布容器内排除节点、连线和控件后动态选取真实背景点，验证点击背景会收起图片组。 |
| `web/e2e/prompt-detail-dialog.spec.ts` | 修改 | 保留媒体和操作栏滚动前后固定的验收意图，把浮点边界比较明确为不超过 1 CSS 像素，避免渲染取整的伪失败。 |
| `web/e2e/frameflow-preview.spec.ts` | 修改 | 预览关闭统一按可访问名称精确定位 Ant Image 的 `close` 控件，避免动画期间“第一个按钮”匹配到非关闭操作。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 记录两次失败定位、三处最小修正、定向验证和最终 108 项完整浏览器门禁。 |

验证记录：首次串行完整回归为 106/108，图片组空白点击未触发背景收起、详情弹窗出现 0.104px 浮点边界差；修正后两文件定向回归 4/4 和 TypeScript 通过。第二次串行完整回归为 106/108，FrameFlow 预览关闭的按钮选择在动画中不稳定、详情弹窗最大浮点差约 0.438px；修正后两文件定向回归 3/3 和 TypeScript 通过。第三次执行 `npm run test:e2e -- --workers=1 --reporter=dot`，108/108 通过，`test-results/.last-run.json` 为 `passed` 且没有失败目录。该记录不外推为跨浏览器、真实外部服务、真机触摸或生产网络环境验收。

## 158. 真实 Codex ImageGen 的隔离人工闭环（2026-08-29）

用户明确批准使用当前 Codex 账户进行一次真实 ImageGen 验收。为不接触用户日常 Agent 配置、用户资产和正在运行的 3000/17371 服务，Canvas Agent 新增可选的 `CANVAS_AGENT_CONFIG_DIR` 配置目录覆盖，并在系统临时目录启动独立 Agent 与独立 Web（127.0.0.1:4174）。本次仅使用一枚无文字、无标识、无水印的青绿色陶瓷球测试提示词；没有读取、上传、覆盖、移动或删除用户图片、画布、运行记录或端口服务。

| 文件 / 证据 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/config.ts` | 修改 | 导出 `resolveConfigDir`，支持可选 `CANVAS_AGENT_CONFIG_DIR`；默认路径保持用户目录，临时 Agent 可将自己的配置与 Codex 工作区完全落到临时目录。 |
| `canvas-agent/src/config.test.ts` | 修改 | 验证显式临时配置目录与空值回退默认用户目录；定向测试 3/3 和 Agent 生产构建通过。 |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 将第 11 项 FrameFlow 创建页和第 31 项 Agent 画布生图由“未验证”提升为“人工通过”；后续第 159 节按用户决定将 Docker 项改为已失效。 |
| `docs/post-development-roadmap.md` | 修改 | 同步真实临时 Agent/浏览器闭环边界与最新矩阵汇总。 |
| `docs/session-development-record.md` | 修改 | 记录本次授权范围、隔离方式、文件关联、可复核结果与仍不外推的边界，满足根 `AGENTS.md` 的对话记录要求。 |
| `web/.playwright-cli/` | 新增运行证据（未跟踪） | Playwright CLI 的本次快照、控制台与截图；其中快照可能含一次性连接 token，不纳入任何检查点，不移动或删除。 |
| 系统临时目录中的 Agent 配置、响应 JSON 与 PNG | 新增运行证据（仓库外） | 保存真实 FrameFlow Run、图片元数据与浏览器隔离环境的原始证据；包含一次性 token，不纳入仓库或提交范围。 |

验证记录：真实 Agent 的 `/agent/codex/canvas-images` 在低质量、1:1、count=1 下返回有效 PNG 候选；FrameFlow 依次完成 `brief.create → round.plan → prompt.approve → run.start`，最终 Run 为 succeeded，只有 1 个 slot、1 次尝试和 1 个图片 ID。图片文件为 1254×1254 PNG，SHA-256 已随隔离 Agent 元数据保存；可见 FrameFlow“运行与血缘”页显示“成功”“1/1 张已生成”、结果图片和 Prompt/Brief 血缘。随后在隔离 Web 空画布通过“生成配置”选择“低 · 1:1 · 1 张”发起同一类真实请求；页面先插入生成中节点，网络中 `canvas-images` 与 `local-image` 均为 200，最终只回写 1 个可预览的方形图片节点。原生端在 count=1 时给出两个候选文件路径，但两条产品流程均按请求数量稳定落地一张，不把额外候选误写为多个节点。

边界：这是当前账户、本机网络、临时 Agent 和 Chromium 可见页面上的一次人工验收，不能证明所有 Codex 账户、模型版本、浏览器、网络错误、断网重试、并发生成或生产部署的行为。隔离临时进程和证据保持原处；没有提交、推送、清理或删除任何用户文件。

## 159. Docker/容器部署需求移除（2026-08-29）

用户明确确认本项目不需要 Docker/容器部署。因此不再把原中文主清单第 01 项“Docker 当前源码部署”和第 18 项中的 Docker/容器启动验收视为阻塞或后续工作。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `docs/frameflow-acceptance-matrix-2026-08-28.md` | 修改 | 将 01、18 改为“已失效”，保留其历史来源及干净 Web 安装证据，但移除容器验收义务。 |
| `docs/post-development-roadmap.md` | 修改 | 将容器部署从“当前阶段外、可恢复”改为已从项目需求移除；总览不再显示 Docker 阻塞。 |
| `docs/session-development-record.md` | 修改 | 记录用户决定与文件关联，满足根 `AGENTS.md` 的对话追溯要求。 |

验证记录：本次只更新需求边界和验收状态，不运行 Docker、Compose、容器镜像构建或部署命令，也不修改任何 Docker/容器配置。矩阵总数仍为 95 项：83 项自动化通过、10 项人工通过、0 项未验证、2 项已失效。

路线图同步：阶段 B 已改为“已完成”；原先仍写作 P0 风险或“6 项未验证”的历史状态已改为当前可复核结论。阶段 C（核心模块进一步解耦）与阶段 D（CSP 强制策略等）仍按各自 P1 退出条件保留为后续工作，不能因 Docker 需求移除而被误标为完成。

## 160. FrameFlow Run 收尾结果计划解耦与跨日门禁稳定性（2026-08-29）

本切片继续阶段 C 的单一职责拆分：将生成图片后的槽位成功/失败事件、Run 完成状态以及 Auto Run 审图转交判断从 `FrameFlowCore` 迁为纯领域函数。Core 保留异步生成、资产导入与隔离、事件日志写入、投影持久化和实际审图调度。本次不修改 Docker/容器部署，也不读取或改写用户运行中的 3000/17371 服务、资产或 Agent 配置。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/run-finalization.ts` | 新增 | 纯函数统一计算新图片登记、缺失 slot 失败、Run 的成功/部分成功/失败状态，以及自动跑继续审图与状态事件的边界。 |
| `canvas-agent/src/frameflow/run-finalization.test.ts` | 新增 | 覆盖已有成功加缺失结果、完整补齐及已暂停自动跑仍需审图但不得重写其状态三种领域语义。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 委托结果计划函数；保持 journal、投影、quarantine 与 `launchMachineReview` 的原有职责和调用时序。 |
| `canvas-agent/package.json` | 修改 | 将新的纯领域回归纳入正式 `npm test` 门禁。 |
| `canvas-agent/src/utils/logger.test.ts` | 修改 | 将 Debug 文件日志的行时间断言改为合法日期时间格式；按日文件名仍固定验证，避免真实写入时钟跨日时错误期待测试夹具日期。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步当前 210 项 Agent 测试基线、阶段 C 拆分进度及本次文件关联。 |

验证记录：新模块缺失时先运行定向测试，得到预期 `ERR_MODULE_NOT_FOUND`。首次接入后，既有“ImageGen 期间停止”特征测试暴露暂停状态仍应启动机器审图的原有时序；补充暂停态用例并恢复该行为后，`run-finalization.test.ts` 与 `core.test.ts` 共 48 项通过、TypeScript 构建通过。完整 Agent 测试初次运行仅失败于既有日志测试把 2026-08-28 的文件夹日期错误地当作写入行时间；修正后 `logger.test.ts` 3/3、完整 `npm test` 210/210 与 `npm run build` 均通过。没有提交、推送、清理、移动或删除用户文件。

## 161. FrameFlow 提交后异步动作决策解耦（2026-08-29）

本切片继续阶段 C：把已提交事务后应取消 Run、启动图片生成、启动机器审图或继续 Auto Run 规划的判定从 `FrameFlowCore` 迁为纯函数。Core 仍负责从当前投影取 Prompt/Run/Brief、组装受控参考文件、执行 AbortController 和发起异步服务，事件格式、HTTP 契约与存储格式不变。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/post-commit-effect.ts` | 新增 | 根据命令、事务事件及当前 Auto Run 状态返回唯一的后提交动作：取消、生成、重试生成、机器审图或继续规划。 |
| `canvas-agent/src/frameflow/post-commit-effect.test.ts` | 新增 | 验证审图事件优先级、排队 Run 的生成动作、无 Run 的继续规划、取消及失败 slot 重试的稳定映射。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 委托纯动作判定后继续执行原有副作用；重试路径仍从既有 Run 读取 Prompt Version，避免把普通 `run.queued` 的数据假设错误套用于重试。 |
| `canvas-agent/package.json` | 修改 | 将新纯函数测试纳入完整 Agent 门禁。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 212 项 Agent 测试基线、阶段 C 当前边界和本次关联文件。 |

验证记录：新模块缺失时先运行定向测试，得到预期 `ERR_MODULE_NOT_FOUND`。首次接入后，`core.test.ts` 的两条 `run.retry` 特征测试超时，准确指出重试没有像普通新 Run 一样在事件中携带 Prompt ID；Core 恢复从持久化 Run 读取该 ID 后，定向 `post-commit-effect.test.ts`、`run-finalization.test.ts` 与 `core.test.ts` 共 50 项通过，构建通过。完整 `npm test` 最终为 212/212 通过。未运行 Docker/Compose，未提交、推送、清理、移动或删除用户文件。

## 162. FrameFlow 提示词参考图路径解析解耦（2026-08-29）

本切片继续阶段 C：把 Prompt 内参考图 ID 到受控本地文件路径的解析从 `FrameFlowCore` 提取为独立的纯函数。解析保持既有语义：按 Prompt 原有顺序输出，导入的 Reference Asset 优先于同 ID 的已生成图片；两种资产均不存在时，仍由 Core 返回原有 409 领域错误。没有改变 HTTP/API、存储、图片生成调度或用户资产，也没有运行 Docker/容器。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/reference-files.ts` | 新增 | 纯函数统一解析提示词参考图到本地路径，接收由调用方提供的资源索引、路径解析器与缺失错误工厂，避免耦合资产存储或领域异常实现。 |
| `canvas-agent/src/frameflow/reference-files.test.ts` | 新增 | 覆盖 Prompt 顺序、Reference Asset 优先级和缺失引用由调用方拒绝的公开语义。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 委托路径解析函数；继续拥有资产存储调用与 409 `FrameFlowDomainError` 的产品语义。 |
| `canvas-agent/package.json` | 修改 | 将新纯函数的两项回归纳入正式 `npm test` 门禁。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 214 项测试基线、阶段 C 的当前拆分边界和本次文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/reference-files.test.ts`，模块尚不存在时得到预期 `ERR_MODULE_NOT_FOUND`。补齐最小实现并接入 Core 后，`reference-files.test.ts` 与 `core.test.ts` 共 47/47 通过，`npm run build` 通过。后续全量 Agent 测试、文档内容检查、类型检查与生产构建将在本切片末尾复核。未提交、推送、清理、覆盖、移动或删除任何用户文件；3000 与 17371 的现有服务不受影响。

## 163. FrameFlow 生成 Run 排队事件统一构造（2026-08-29）

本切片继续阶段 C：普通 Prompt 生成与 Auto Run 迭代此前分别构造相同的 `run.queued`、`run.started` 事实事件。现在将这一可重放事件对收束为单一纯函数；生成数量、slot ID、事件 ID、发生时间和事件顺序保持原有合约。没有改变生成调度、HTTP/API、投影、资产、用户服务或 Docker/容器范围。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/generation-run-events.ts` | 新增 | 以显式输入构造一对 `run.queued` 和 `run.started` 领域事件，供手动 Run 与 Auto Run 复用。 |
| `canvas-agent/src/frameflow/generation-run-events.test.ts` | 新增 | 以固定事件 ID、slot 和时间验证事件字段与先后顺序，形成不依赖 Core 内部实现的纯领域契约。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 普通 `run.start` 与 `autoRunIterationEvents` 委托同一构造函数；仍由 Core 生成 ID、校验状态并启动实际 ImageGen。 |
| `canvas-agent/package.json` | 修改 | 将新增事件契约测试纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 215 项测试基线、阶段 C 拆分进度和本次文件用途。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/generation-run-events.test.ts`，模块尚不存在时得到预期 `ERR_MODULE_NOT_FOUND`。补齐最小模块并迁移两处调用后，`generation-run-events.test.ts` 与 `core.test.ts` 共 46/46 通过，`npm run build` 通过。完整 Agent 与文档门禁将在该文档更新后复核。未提交、推送、清理、覆盖、移动或删除用户文件；未运行 Docker/Compose，也未影响 3000/17371 服务。

## 164. Vercel 静态安全响应头门禁（2026-08-29）

本切片继续阶段 D。只读审计确认根目录 `vercel.json` 已有 CSP 报告模式，GitHub fork 没有可用部署记录，因而无法把本地配置推断为生产响应头观察，也不把 CSP 切换为强制模式。应用源码未使用摄像头、麦克风或定位 API；因此在不改变 CSP 来源白名单、Provider/Agent/WebDAV 连通性、插件 Blob 模块或用户模型脚本的前提下，补充静态安全响应头及其本地防回退门禁。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `vercel.json` | 修改 | 继续使用 `Content-Security-Policy-Report-Only`，并为所有 Vercel 路径添加 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、受限 Referrer 与禁用摄像头/麦克风/定位的 Permissions Policy。 |
| `web/scripts/check-csp-report-only.mjs` | 修改 | 除既有 CSP 指令外，强制检查四个静态安全响应头的精确值，防止未来配置无意退回。 |
| `docs/content/docs/support/browser-credential-threat-model.mdx`、`browser-credential-threat-model.zh-CN.mdx` | 修改 | 更新中英文威胁模型的实际响应头边界；明确 CSP 仍为观察模式，不能等同于生产强制保护。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步阶段 D 当前进展、部署观测缺口及本次文件关联。双语 TODO 未修改：其“补充 CSP”仍涵盖尚未完成的真实部署观察与强制策略决策。 |

验证记录：先扩展本地检查并运行 `npm run check:csp`，在配置仍缺少 `X-Content-Type-Options` 时按预期失败。补齐配置后，扩展检查通过；Web `npm test` 为 25 个文件、71 项通过，`npm run typecheck` 与 `npm run build` 通过。`gh api repos/899ms/infinite-canvas-1/deployments` 返回空列表，故没有生产 URL 或响应头可核验。本项不运行 Docker/Compose、不部署、不提交、不推送、不读写用户凭据、资产或 3000/17371 服务。

## 165. FrameFlow Planner 结果事件组装解耦（2026-08-29）

本切片继续阶段 C：`FrameFlowCore` 在 Planner 返回有效计划并完成 Preference DNA 决策校验后，原本同时负责创建 Prompt Version、字段 Diff 和 Agent Decision 两条事实事件。现在将该确定性组装迁为纯领域函数；Core 保留 Planner 调用、Zod 校验、Preference 证据完整性校验、领域错误与后续事务写入。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/prompt-version-events.ts` | 新增 | 根据已验证的 Planner 计划、前一版本、Brief、Decision 与 Preference 上下文构造 `prompt.version_created` 和 `agent.decision_recorded` 事件，保持父版本、修订号、参考图、Diff、锁和发生时间的原有血缘。 |
| `canvas-agent/src/frameflow/prompt-version-events.test.ts` | 新增 | 以固定计划、上一 Prompt 和事件 ID 验证 Prompt Revision、字段 Diff、参考图血缘与 Agent Decision 事件顺序。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 委托纯事件组装；仍生成随机 ID 并对外部 Planner 结果执行现有业务校验。 |
| `canvas-agent/package.json` | 修改 | 将新增纯领域测试纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 216 项测试基线、阶段 C 进展与文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/prompt-version-events.test.ts`，缺少模块时得到预期 `ERR_MODULE_NOT_FOUND`。补齐最小实现并接入 Core 后，`prompt-version-events.test.ts` 与 `core.test.ts` 共 46/46 通过，`npm run build` 通过。完整 Agent 与文档门禁将在该文档更新后复核。未运行 Docker/Compose、未部署、未提交或推送，未读写用户资产、凭据和 3000/17371 服务。

## 166. FrameFlow Planner 服务层解耦（2026-08-29）

本切片在第 165 节的事件组装基础上完成完整规划服务边界：调用 `FrameFlowPromptPlanner`、校验返回计划、要求有人工 Preference DNA 时提供 Decision 处置、构建受验证的 Agent Decision，并调用既有 Prompt/Decision 事件组装器。Core 只保留 Planner 是否配置、从当前投影取得 Preference/历史审图/上一 Prompt，以及将服务领域错误映射为原有 HTTP 可识别错误的职责。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/prompt-planning.ts` | 新增 | 异步规划服务；保持 Planner 的 `brief`、strategy、Preference 和机器审图输入合约，并把缺失 Decision 或无效证据收束为明确的 500 领域错误。 |
| `canvas-agent/src/frameflow/prompt-planning.test.ts` | 新增 | 验证正常规划产生 Prompt/Decision 事实事件且 Planner 输入不变；验证人工偏好存在时没有 Decision 的计划被拒绝。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 委托规划服务并保留对 `PromptPlanningError` 的 `FrameFlowDomainError` 映射；不改变 HTTP、事件存储或 Auto Run 调度。 |
| `canvas-agent/package.json` | 修改 | 将两项规划服务测试纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 218 项测试基线、阶段 C 的服务层边界和本次文件关系。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/prompt-planning.test.ts`，缺少模块时得到预期 `ERR_MODULE_NOT_FOUND`。补齐服务并接入 Core 后，`prompt-planning.test.ts`、`prompt-version-events.test.ts` 与 `core.test.ts` 共 48/48 通过，`npm run build` 通过。完整 Agent 与文档门禁将在该文档更新后复核。没有 Docker/Compose、部署、提交、推送、用户资产/凭据读写或 3000/17371 服务操作。

## 167. 双 Vercel 配置安全头一致性门禁（2026-08-29）

第 164 节后续审计发现仓库还包含可独立作为 Vercel 部署根目录的 `web/vercel.json`，而此前安全头仅在根目录配置。为避免同一 Web 应用因部署根目录不同而降级安全基线，检查脚本现在同时校验两份配置；子目录配置同步采用相同的报告模式 CSP 与静态安全响应头。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/vercel.json` | 修改 | 为 `web/` 作为 Vercel 部署根目录的路径添加与根配置一致的 `Content-Security-Policy-Report-Only`、`nosniff`、反嵌入、Referrer 与 Permissions Policy 响应头。 |
| `web/scripts/check-csp-report-only.mjs` | 修改 | 对根目录 `vercel.json` 和 `web/vercel.json` 分别校验 CSP 必需指令与四项静态安全响应头，任意一份遗漏即失败。 |
| `docs/content/docs/support/browser-credential-threat-model.mdx`、`browser-credential-threat-model.zh-CN.mdx` | 修改 | 准确写明两种 Vercel 部署根目录都拥有相同的观察型安全头基线。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步阶段 D 范围和本次文件关联。 |

验证记录：先扩展检查后运行 `npm run check:csp`，按预期报出 `web/vercel.json` 缺少报告模式 CSP。补齐配置后检查通过；Web `npm test` 为 25 个文件、71 项通过，`npm run typecheck` 与 `npm run build` 通过。此项仍不证明任一真实 Vercel 项目已部署或正在发送这些头；CSP 强制策略与生产观测仍未执行。未运行 Docker/Compose、未部署、未提交/推送，也未触碰 3000/17371、用户资产或凭据。

## 168. FrameFlow Auto Run 状态事件服务解耦（2026-08-29）

本切片继续阶段 C：将 Auto Run 的开始、停止、继续探索与机器审图推进的状态判定和事实事件从 `FrameFlowCore` 提取为纯领域服务。Core 保留 Creative Requirement 是否活动、当前 Run/并发 Auto Run/机器审图投影的查询，并把服务错误映射为原有 `FrameFlowDomainError`；事件类型、错误信息、HTTP/API、journal 和投影格式保持兼容。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/auto-run-command-events.ts` | 新增 | 集中处理 `auto_run.start`、`stop`、`extend` 与 `advance` 的状态机规则，构造暂停、恢复生成、启动审图、完成、延长或继续规划事件，并明确 409 拒绝语义。 |
| `canvas-agent/src/frameflow/auto-run-command-events.test.ts` | 新增 | 覆盖未完成 Run 恢复、缺失审图、进入规划、停止、继续探索、推进、非法状态与并发 Auto Run；同时断言进入规划时删去的可选字段不会以 `undefined` 写进可回放事件。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 只收集当前投影依赖并委托状态服务；保留活动 Requirement 校验、调用时序和领域错误映射。 |
| `canvas-agent/package.json` | 修改 | 将三项 Auto Run 状态服务测试纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 221 项测试基线、阶段 C 服务边界与本次文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/auto-run-command-events.test.ts`，缺少模块时得到预期 `ERR_MODULE_NOT_FOUND`。接入后首次定向运行中，原有 Core 测试与构建均通过；新测试的两处失败揭示期望值把被删除的 `currentRunId`/`lastError` 写成了 `undefined`，而实际回放事件正确地省略字段。收紧断言后，状态服务与 Core 共 48/48 通过，`npm run build` 通过。完整 Agent 与文档门禁将在本记录更新后复核。未运行 Docker/Compose、未部署、未提交/推送，也未读取或改写用户资产、凭据和 3000/17371 服务。

## 169. FrameFlow Generation Run 命令状态事件服务解耦（2026-08-29）

本切片继续阶段 C：将手动 Generation Run 的开始、失败 slot 重试与取消状态判定和事实事件从 `FrameFlowCore` 提取为纯领域服务。Core 继续查询 Prompt/Run 与活动 Creative Requirement，持有真实 ImageGen 调度、事务写入、投影和领域错误对外映射；事件类型、错误顺序、HTTP/API、journal 和投影格式保持兼容。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/generation-command-events.ts` | 新增 | 集中处理 `run.start`、`run.retry` 与 `run.cancel` 的前置状态规则，构造排队/开始、失败 slot 重试或用户取消的可重放事实事件。 |
| `canvas-agent/src/frameflow/generation-command-events.test.ts` | 新增 | 以确定性 ID 验证新 Run 的事件顺序、失败 slot 重试、活动 Run 取消，以及 draft Prompt、重复 slot 和结束 Run 的拒绝语义。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 在保持 Prompt/Run 存在与 Requirement 活动检查后，委托命令服务并将其 404/409 错误映射回既有 `FrameFlowDomainError`；真实 ImageGen 副作用仍留在 Core。 |
| `canvas-agent/package.json` | 修改 | 将三项 Generation Run 命令状态服务回归纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 224 项测试基线、阶段 C 新的职责边界与本次文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/generation-command-events.test.ts`，模块缺失时得到预期 `ERR_MODULE_NOT_FOUND`。补齐服务并接入 Core 后，命令服务与 Core 共 48/48 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 224/224 通过，`npm run build` 通过。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 170. FrameFlow Prompt 批准状态事件服务解耦（2026-08-29）

本切片继续阶段 C：将 Prompt 的 draft 状态判断、锁定项归属校验与 `prompt.approved` 事实事件从 `FrameFlowCore` 迁为纯领域服务。Core 继续负责 Prompt 查找、活动 Creative Requirement 校验、命令编排、事务写入和投影；HTTP/API、journal 和既有 409 领域错误保持兼容。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/prompt-approval-events.ts` | 新增 | 对 draft Prompt 校验锁定项必须属于对应字段，并复制锁定快照后构造 `prompt.approved` 事实事件。 |
| `canvas-agent/src/frameflow/prompt-approval-events.test.ts` | 新增 | 验证批准事件不会持有可变锁定数组引用，并覆盖已批准 Prompt 与未知锁定项的拒绝语义。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留 Prompt 与 Requirement 查询，委托批准服务并映射其既有 409 领域错误。 |
| `canvas-agent/package.json` | 修改 | 将两项批准状态服务回归纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 226 项测试基线、阶段 C 责任边界与本次文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/prompt-approval-events.test.ts`，模块缺失时得到预期 `ERR_MODULE_NOT_FOUND`。实现后，批准服务与 Core 共 47/47 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 226/226 通过、`npm run build` 通过，文档内容检查、类型检查、生产构建与差异检查也通过。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 171. FrameFlow 图片删除与反馈状态事件服务解耦（2026-08-29）

本切片继续阶段 C：将中性图片删除、评分、评论、审美删除、恢复和 Preference Feature Review 的确定性事件构造，从 `FrameFlowCore` 迁为纯领域服务。Core 仍负责图片存在性、Creative Requirement 活动性与血缘校验、命令编排、事务写入和投影；中性删除不参与学习、审美删除参与学习，以及永久删除后禁止继续操作的既有语义不变。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/feedback-command-events.ts` | 新增 | 集中构造 `image.delete` 与 `feedback.append` 的可重放事实事件，并保留永久删除图片的两种 409 提示。 |
| `canvas-agent/src/frameflow/feedback-command-events.test.ts` | 新增 | 覆盖中性删除、审美删除、特征复核事件，以及已永久删除图片的删除/反馈拒绝语义。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留图片和 Requirement 查询后委托反馈状态服务，并映射既有 409 领域错误。 |
| `canvas-agent/package.json` | 修改 | 将两项反馈状态服务回归纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 228 项测试基线、阶段 C 责任边界和本次文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/feedback-command-events.test.ts`，模块缺失时得到预期 `ERR_MODULE_NOT_FOUND`。补齐服务并接入 Core 后，服务与 Core 共 47/47 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 228/228 通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项是内部解耦、不改变用户可感知功能或待测事项，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 172. FrameFlow Brief 生命周期事件构造解耦（2026-08-29）

本切片继续阶段 C：将 Creative Brief 的创建、修订、归档、恢复及修订后可选暂停 Auto Run 的确定性事实事件构造，迁出 `FrameFlowCore`。Core 继续验证参考图、当前 Requirement/Brief 活动性、运行中阻断与被延续 Auto Run 的归属；因此原有错误顺序、HTTP/API、journal、投影和血缘语义保持不变。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/brief-lifecycle-events.ts` | 新增 | 根据已验证输入构造 `brief.created`、`brief.revised`、`brief.archived`、`brief.restored`，并在修订来源 Auto Run 存在时创建同一 Requirement 的暂停继任 Auto Run。 |
| `canvas-agent/src/frameflow/brief-lifecycle-events.test.ts` | 新增 | 以固定 ID 和时间验证默认用途、Requirement/Revision 血缘、继任 Auto Run 与归档/恢复事件字段。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留所有查询与领域前置校验，仅委托确定性事件构造。 |
| `canvas-agent/package.json` | 修改 | 将三项 Brief 生命周期事件构造回归纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 231 项测试基线、阶段 C 边界与本次文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/brief-lifecycle-events.test.ts`，模块缺失时得到预期 `ERR_MODULE_NOT_FOUND`。补齐构造器并接入 Core 后，构造器与 Core 共 48/48 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 231/231 通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 173. FrameFlow Prompt 翻译服务解耦（2026-08-29）

本切片完成 Core 命令处理的最后一个独立服务边界：将 Prompt 的已有中文翻译回放、翻译 Provider 调用、Zod 结果校验与 `prompt.translation_created` 事件构造迁出 `FrameFlowCore`。Core 继续负责 Prompt 查找和当前 Creative Requirement 校验；未配置翻译 Provider 时的原有 409 领域错误保持不变。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/prompt-translation-events.ts` | 新增 | 优先返回深拷贝的已缓存翻译；无缓存时调用受控翻译接口、校验结果并创建翻译事实事件。 |
| `canvas-agent/src/frameflow/prompt-translation-events.test.ts` | 新增 | 覆盖缓存不调用 Provider、Provider 接收 Prompt 快照并返回有效事件，以及未配置 Provider 的 409 语义。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留 Prompt/Requirement 查询，委托翻译服务并映射既有领域错误。 |
| `canvas-agent/package.json` | 修改 | 将三项翻译服务回归纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 236 项测试基线、阶段 C 命令分层边界与本次文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/frameflow/prompt-translation-events.test.ts`，模块缺失时得到预期 `ERR_MODULE_NOT_FOUND`。首次实现前发现测试期望与缓存对象共享了可变数组，随即改为独立字面期望后继续验证，确保覆盖真实的深拷贝语义。服务与 Core 共 48/48 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 236/236 通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 174. Codex ImageGen 结果路径规范化解耦（2026-08-29）

本切片开始路线图中的 Codex 集成层拆分：将 app-server ImageGen 通知中嵌套值的递归扫描、Windows/POSIX 绝对路径识别、图片扩展名约束和首次出现顺序去重，从传输状态机 `CodexAppClient` 迁为纯结果规范化函数。客户端继续拥有通知接收、按 Turn 缓存和跨通知去重职责。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/agent/codex-image-result.ts` | 新增 | 从任意 ImageGen 结果对象中提取受限图片扩展名的绝对路径，并保留首次出现顺序。 |
| `canvas-agent/src/agent/codex-image-result.test.ts` | 新增 | 覆盖嵌套 Windows/POSIX 路径、去重以及相对路径、非图片文件和普通文本的排除。 |
| `canvas-agent/src/agent/codex-client.ts` | 修改 | 传输客户端改为调用纯规范化函数；Turn 级缓存与现有协议处理不变。 |
| `canvas-agent/package.json` | 修改 | 将两项结果规范化回归纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 238 项测试基线、Codex 结果规范化边界和本次文件关联。 |

验证记录：先仅新增测试并运行 `npx tsx --test src/agent/codex-image-result.test.ts`，模块缺失时得到预期 `ERR_MODULE_NOT_FOUND`。一次补丁因测试脚本条目顺序不符而原子拒绝，未写入任何文件；读取当前脚本后按实际顺序重新应用。定向 `codex-image-result.test.ts` 与 `codex-client.test.ts` 共 45/45 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 238/238 通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 175. 本地 Agent ImageGen 来源解析解耦（2026-08-29）

本切片开始拆分本地 Agent 面板中的图片导入职责：把 ImageGen 事件的递归来源扫描、`data:image/*` 与单行 Windows/POSIX 绝对图片路径筛选、首次出现顺序去重，迁为独立纯函数。面板仍负责来源下载、图片上传、附件元数据、画布节点写入和 SSE 事件时序，因此不改变用户可见的图片导入流程。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-generated-image-sources.ts` | 新增 | 从任意 Agent ImageGen 项目中提取受限图片来源并维持去重顺序。 |
| `web/src/components/agent/agent-generated-image-sources.test.ts` | 新增 | 覆盖嵌套 data URL/绝对图片路径、顺序去重，以及多行、相对路径、非图片路径和非图片 data URL 的拒绝。 |
| `web/src/components/agent/local-agent-panel.tsx` | 修改 | 使用纯来源解析器，继续保留下载、上传和画布写入副作用。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Web 26 文件/73 项测试基线与阶段 C 当前边界。 |

验证记录：先新增测试并运行 `npx vitest run src/components/agent/agent-generated-image-sources.test.ts`，模块缺失时按预期失败。补齐最小模块并接入面板后，定向测试 2/2 与 Web TypeScript 检查通过；完整 Web `npm test` 为 26 个文件/73 项通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 176. 画布生成请求生命周期控制器解耦（2026-08-29）

本切片将画布项目页中跨图片、视频、音频、文本与室内工作流共用的生成请求登记、同目标替换、当前控制器完成和按运行节点取消逻辑迁为无 UI 副作用的控制器。页面继续负责弹窗确认、`runningNodeId`、节点加载/取消状态以及国际化错误信息，因此不改变画布节点格式、生成流程或本地存储格式。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/lib/canvas/canvas-generation-requests.ts` | 新增 | 管理目标节点到 AbortController 的登记、替换、精确完成和按运行节点批量取消。 |
| `web/src/lib/canvas/canvas-generation-requests.test.ts` | 新增 | 覆盖同目标替换中止、过期完成不误删新请求，以及批量取消不影响无关请求。 |
| `web/src/pages/canvas/project.tsx` | 修改 | 保留页面状态收束和 UI 副作用，改为委托生成请求控制器。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Web 27 文件/76 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx vitest run src/lib/canvas/canvas-generation-requests.test.ts`，模块缺失时按预期失败。补齐最小控制器并接入页面后，定向测试 3/3、Web TypeScript 检查、完整 Web `npm test`（27 个文件/76 项）与 `npm run build` 均通过；文档 `check:content`、`types:check`、生产构建与 `git diff --check` 亦通过，后者仅提示既有/当前文本的 CRLF 转换，不含空白错误。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 177. 本地 Agent 会话启动状态投影解耦（2026-08-29）

本切片将本地 Agent 面板内的会话状态到 MCP 启动状态卡片映射迁为独立纯函数。面板继续负责连接、事件收取、状态写入和国际化入口；新函数只将会话/MCP 输入转为可渲染的启动、就绪、警告、失败或空状态，因此不改变 Agent 协议、会话存储或用户可见文案。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-bootstrap-view.ts` | 新增 | 将会话状态和 MCP 服务状态投影为面板可直接消费的启动状态模型。 |
| `web/src/components/agent/agent-bootstrap-view.test.ts` | 新增 | 覆盖启动服务汇总、警告/失败/就绪终态与运行中清理。 |
| `web/src/components/agent/local-agent-panel.tsx` | 修改 | 继续注入既有国际化函数并写入 Store，改由纯投影函数提供显示状态。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Web 28 文件/79 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx vitest run src/components/agent/agent-bootstrap-view.test.ts`，模块缺失时按预期失败。补齐最小投影函数并接入面板后，定向测试 3/3、Web TypeScript 检查、完整 Web `npm test`（28 个文件/79 项）与 `npm run build` 均通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 178. 画布取消生成状态收束解耦（2026-08-29）

本切片将画布页面中“按运行节点取消”后的节点状态收束迁为纯状态函数：受影响且仍在加载中的根节点回到空闲，仍在加载中的图片槽位标为取消错误，已成功槽位与无关或非加载节点保持原值。页面继续负责请求取消、运行标识和国际化文案，不改变节点数据格式或生成 API。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/lib/canvas/canvas-generation-state.ts` | 新增 | 将已取消生成的节点及图片槽位收束到与原页面一致的状态。 |
| `web/src/lib/canvas/canvas-generation-state.test.ts` | 新增 | 覆盖取消的加载节点、成功槽位保留和无关/非加载节点不变。 |
| `web/src/pages/canvas/project.tsx` | 修改 | 取消控制器返回目标集合后，委托纯状态函数更新页面节点。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Web 29 文件/81 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx vitest run src/lib/canvas/canvas-generation-state.test.ts`，模块缺失时按预期失败。补齐最小状态函数并接入页面后，定向测试 2/2、Web TypeScript 检查、完整 Web `npm test`（29 个文件/81 项）与 `npm run build` 均通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 179. FrameFlow 机器审图事件构造解耦（2026-08-29）

本切片将 `FrameFlowCore` 机器审图流程中的逐张覆盖校验、已记录图片去重、`machine_review.recorded` 事件组装和最终轮 `auto_run.completed` 事件迁为纯领域函数。Core 继续负责调用审图 Provider、生命周期校验、事务写入和后续迭代调度，因此不改变 FrameFlow HTTP/API、事件存储格式或审图执行顺序。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/machine-review-events.ts` | 新增 | 在受控输入下校验审图覆盖范围，并构造可回放的机器审图与最终完成事件。 |
| `canvas-agent/src/frameflow/machine-review-events.test.ts` | 新增 | 覆盖完整逐张记录、缺失/重复/越界图片拒绝、已有审图去重和未到最终轮不完成。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留 Provider、写队列和领域错误边界，改由事件函数处理审图状态转换。 |
| `canvas-agent/package.json` | 修改 | 将新增机器审图事件契约纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 241 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx tsx --test src/frameflow/machine-review-events.test.ts`，模块缺失时按预期失败。补齐最小事件函数并接入 Core 后，事件测试与 `core.test.ts` 共 48/48 通过，生产构建通过；完整 Canvas Agent `npm test` 为 241/241 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 180. FrameFlow 跨轮总结事件构造解耦（2026-08-29）

本切片将 `FrameFlowCore` 跨轮总结中的总结草稿校验、已审轮次引用校验、`AutoRunTrajectorySummary` 组装和 `auto_run.trajectory_summarized` 事件构造迁为纯领域函数。Core 仍负责调用总结 Provider、Requirement 生命周期校验、事务写入和异步调度，因此不改变总结 API、存储格式或归档 ABA 保护。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/trajectory-summary-events.ts` | 新增 | 解析总结草稿、拒绝不存在的证据轮次并构造可回放总结事件。 |
| `canvas-agent/src/frameflow/trajectory-summary-events.test.ts` | 新增 | 覆盖合法总结事件，以及最佳轮次或证据轮次越界时的明确拒绝。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留 Provider、写队列与生命周期边界，改为委托总结事件函数。 |
| `canvas-agent/package.json` | 修改 | 将新增跨轮总结事件契约纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 243 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx tsx --test src/frameflow/trajectory-summary-events.test.ts`，模块缺失时按预期失败。补齐最小事件函数并接入 Core 后，事件测试与 `core.test.ts` 共 47/47 通过，生产构建通过；完整 Canvas Agent `npm test` 为 243/243 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 181. FrameFlow Auto Run 单轮启动事件解耦（2026-08-29）

本切片将 `FrameFlowCore` 中“规划完成后启动下一轮”的 Prompt 发现、批准、固定槽位 Generation Run 创建和 `auto_run.iteration_started` 事件构造迁为纯领域函数。Core 仍负责 Planner/ImageGen 可用性、活动 Brief 校验和异步事务调度，因此不改变自动跑的 Provider 调用、运行状态或持久化格式。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/auto-run-iteration-events.ts` | 新增 | 从规划事件中取得 Prompt，并构造批准、排队、开始和迭代开始的完整事件序列。 |
| `canvas-agent/src/frameflow/auto-run-iteration-events.test.ts` | 新增 | 覆盖固定槽位启动序列与规划缺少 Prompt 时的明确拒绝。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留 Planner/ImageGen 与活动 Brief 检查，改为委托单轮启动事件函数。 |
| `canvas-agent/package.json` | 修改 | 将新增单轮启动事件契约纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 245 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx tsx --test src/frameflow/auto-run-iteration-events.test.ts`，模块缺失时按预期失败。补齐最小事件函数并接入 Core 后，事件测试与 `core.test.ts` 共 47/47 通过，生产构建通过；完整 Canvas Agent `npm test` 为 245/245 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 182. FrameFlow Auto Run 失败事务构造解耦（2026-08-29）

本切片将 `FrameFlowCore` 自动跑规划或机器审图失败后的系统事务构造迁为纯函数。事务仍由 Core 在原写队列中写入、重放投影并保持原有异步重试条件；纯函数仅固定连续序列、系统 Actor、幂等键、失败事件与错误文本上限，因此不改变失败恢复时序或存储格式。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/auto-run-failure-transaction.ts` | 新增 | 将 Auto Run 失败上下文转换为可回放的系统事务，并限制错误文本长度。 |
| `canvas-agent/src/frameflow/auto-run-failure-transaction.test.ts` | 新增 | 覆盖事务序列、系统身份、事件字段、幂等键及长/短错误文本行为。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留写队列、持久化与失败恢复条件，改由纯事务函数构造写入内容。 |
| `canvas-agent/package.json` | 修改 | 将新增失败事务契约纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 247 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx tsx --test src/frameflow/auto-run-failure-transaction.test.ts`，模块缺失时按预期失败。补齐最小事务函数并接入 Core 后，事件测试与 `core.test.ts` 共 47/47 通过，生产构建通过；完整 Canvas Agent `npm test` 为 247/247 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 183. 本地 Agent 历史快照合并解耦（2026-08-29）

本切片将本地 Agent 面板的历史快照归一化、已结算 Turn 权威性、活跃实时 Turn 保留、确认范围与 `historyReady` 接受条件迁为独立纯函数。面板仍负责网络重试、顺序/活动线程保护、Ref 写入、SSE、历史确认请求和 Store 更新，因此不改变通信协议、会话存储或用户可见文案。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-thread-snapshot.ts` | 新增 | 将历史快照与实时消息合并为权威显示状态、实时 Turn 集合和确认范围。 |
| `web/src/components/agent/agent-thread-snapshot.test.ts` | 新增 | 覆盖历史覆盖已结算 Turn、保留活跃实时 Turn，以及预期 Turn 与 `historyReady` 的确认规则。 |
| `web/src/components/agent/local-agent-panel.tsx` | 修改 | 保留请求、重试与副作用，改为委托纯快照状态函数。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Web 30 文件/83 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx vitest run src/components/agent/agent-thread-snapshot.test.ts`，模块缺失时按预期失败。补齐最小状态函数并接入面板后，定向测试 2/2、Web TypeScript 检查、完整 Web `npm test`（30 个文件/83 项）与 `npm run build` 均通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 184. 阶段 C 浏览器回归复核（2026-08-29）

在本轮 FrameFlow Core 领域事件拆分、画布生成状态拆分和本地 Agent 历史快照合并拆分后，使用仓库既有 Playwright 配置执行完整 Chromium 单线程回归。该配置临时使用独立的 `127.0.0.1:4173` 测试服务；本次未接管、重启或关闭既有的 3000、17371 服务。此项证明现有浏览器回归覆盖范围未因上述内部重构退化，但不替代真实生产部署目标上的 CSP 观察。

| 文件/范围 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/e2e/` | 既有测试范围 | 覆盖 Agent、画布、FrameFlow、提示词、路由和视频参考图的跨层浏览器回归；本次未修改。 |
| `web/playwright.config.ts` | 既有测试配置 | 提供 4173 临时 Web Server、Chromium 和失败追踪策略；本次未修改。 |
| `docs/session-development-record.md` | 修改 | 记录完整浏览器验收、配置边界及其与仍待生产 CSP 观察的关系。 |

验证记录：已确认 `npx` 可用，随后在 `web/` 执行 `npm run test:e2e -- --workers=1`；Chromium 108/108 通过，耗时 4.6 分钟。通过范围包含本地 Agent 的实时回复、权威历史恢复、断线重连与跨标签状态，画布生成与附件持久化，以及 FrameFlow 自动跑、审图、血缘、Prompt 语言和参考图限制。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 185. ImageGen 返回文件处置计划解耦（2026-08-29）

本切片将 `FrameFlowCore.generateAndFinalize` 在 ImageGen 成功返回后的文件处置规则迁为纯计划函数：已取消的运行将全部迟到文件交给取消隔离，未取消的运行只把固定槽位数量交给资产导入，并把超量结果标记为孤儿恢复隔离。Core 仍负责实际文件导入、隔离写入、PNG 校验失败恢复与最终 Run 事务，因此不改变 Provider 调用、事件格式、持久化或取消时序。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/generated-output-plan.ts` | 新增 | 从 Provider 返回文件、槽位数量和取消状态构造导入/隔离计划。 |
| `canvas-agent/src/frameflow/generated-output-plan.test.ts` | 新增 | 覆盖取消时全量隔离、超量结果孤儿隔离和刚好命中槽位时不隔离。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留资产 I/O 与失败恢复，改为执行纯文件处置计划。 |
| `canvas-agent/package.json` | 修改 | 将新增计划函数契约纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 250 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx tsx --test src/frameflow/generated-output-plan.test.ts`，模块缺失时按预期报 `ERR_MODULE_NOT_FOUND`。补齐最小函数并接入 Core 后，定向契约测试 3/3、与 `core.test.ts` 合计 48/48 以及 TypeScript 检查通过；完整 Canvas Agent `npm test` 为 250/250 通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 186. FrameFlow 事务持久化边界解耦（2026-08-29）

本切片将 `FrameFlowCore` 中重复的“事实日志追加 → 内存投影应用 → 投影写出”顺序提为可注入持久化服务。Core 保留写队列、事务构造、领域错误、追加失败时的资产隔离和初始化恢复时序；服务只保证普通事务在 journal 成功后才应用并写出最新投影，若 journal 失败则先执行调用方清理且绝不改变投影。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/transaction-persistence.ts` | 新增 | 统一执行事实日志、投影应用和投影写出的受控顺序。 |
| `canvas-agent/src/frameflow/transaction-persistence.test.ts` | 新增 | 用可注入 Store 覆盖正常顺序及追加失败后只清理、不更新投影。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 将命令、参考图、自动跑、生成收尾、审图和总结事务委托给持久化服务；保留初始化恢复原顺序。 |
| `canvas-agent/package.json` | 修改 | 将新增持久化服务契约纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 252 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx tsx --test src/frameflow/transaction-persistence.test.ts`，模块缺失时按预期报 `ERR_MODULE_NOT_FOUND`。补齐服务并接入 Core 后，持久化服务与 `core.test.ts` 合计 47/47 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 252/252 通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 187. ImageGen 执行服务解耦（2026-08-29）

本切片将 `FrameFlowCore.generateAndFinalize` 的 ImageGen 调用、迟到结果取消隔离、固定槽位资产导入、超量结果隔离与 PNG 校验失败恢复迁为可注入执行服务。Core 仅保留运行控制器、写队列和 Run 收尾事务；执行服务以“需要收尾”或“已丢弃”返回结果，不创建事务、不写投影，因此不改变 Provider 输入、事件格式、持久化或取消时序。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/generation-execution.ts` | 新增 | 封装 ImageGen 与资产端口，返回成功、可重试失败或已取消的受控执行结果。 |
| `canvas-agent/src/frameflow/generation-execution.test.ts` | 新增 | 覆盖 Provider 失败、取消迟到结果、超量结果隔离和导入失败隔离。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留 Run 收尾和生命周期控制，委托执行服务处理 Provider 与资产 I/O。 |
| `canvas-agent/package.json` | 修改 | 将新增执行服务契约纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 256 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx tsx --test src/frameflow/generation-execution.test.ts`，模块缺失时按预期报 `ERR_MODULE_NOT_FOUND`。补齐服务并接入 Core 后，执行服务与 `core.test.ts` 合计 49/49 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 256/256 通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 188. 机器审图执行服务解耦（2026-08-29）

本切片将 `FrameFlowCore.reviewAndRecord` 中未审图片选择、资产路径映射、Reviewer 调用和返回值 schema 校验迁为可注入执行服务。Core 继续负责 Requirement 活动性、归档恢复 ABA 防护、机器审图事件构造、自动跑推进判断和事务写入，因此不改变 Reviewer 输入、事件格式、持久化或异步恢复时序。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `canvas-agent/src/frameflow/machine-review-execution.ts` | 新增 | 从当前 Run 构造待审图片输入，执行 Reviewer 并返回经过 schema 校验的审图结果。 |
| `canvas-agent/src/frameflow/machine-review-execution.test.ts` | 新增 | 覆盖已审图片排除、全量已审时不调用 Provider，以及缺失图片时拒绝审图。 |
| `canvas-agent/src/frameflow/core.ts` | 修改 | 保留生命周期与事务边界，改为委托机器审图执行服务。 |
| `canvas-agent/package.json` | 修改 | 将新增机器审图执行服务契约纳入正式 `npm test`。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 修改 | 同步 Canvas Agent 259 项测试基线、阶段 C 当前边界和本次文件关联。 |

验证记录：先新增测试并运行 `npx tsx --test src/frameflow/machine-review-execution.test.ts`，模块缺失时按预期报 `ERR_MODULE_NOT_FOUND`。补齐服务并接入 Core 后，执行服务与 `core.test.ts` 合计 48/48 通过，TypeScript 检查通过；完整 Canvas Agent `npm test` 为 259/259 通过，`npm run build` 通过。中英文 `todo` 与 `pending-test` 已复核：此项为内部兼容性重构，不改变用户可感知功能或待测项目，故无需修改。未运行 Docker/Compose、未部署、未提交/推送、未清理/移动/删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 189. 跨轮总结计划解耦（2026-08-29）

将完整机器审图轮次筛选、总结缓存复用和 Provider 输入构造迁为纯计划函数；Core 保留生命周期、总结事件校验和事务写入。

| 文件 | 关联与用途 |
| --- | --- |
| `canvas-agent/src/frameflow/trajectory-summary-plan.ts` | 构造跨轮总结的缓存或执行计划。 |
| `canvas-agent/src/frameflow/trajectory-summary-plan.test.ts` | 覆盖完整审图轮次筛选和缓存复用。 |
| `canvas-agent/src/frameflow/core.ts`、`canvas-agent/package.json` | 接入计划并纳入正式测试。 |
| `docs/post-development-roadmap.md`、`docs/session-development-record.md` | 同步 261 项测试基线与文件关联。 |

验证记录：模块缺失时契约测试按预期报 `ERR_MODULE_NOT_FOUND`；补齐后计划与 `core.test.ts` 合计 47/47、完整 Canvas Agent `npm test` 261/261、`npm run build` 均通过。此为内部解耦，不修改 TODO/pending-test；未运行 Docker/Compose、未部署、提交、推送或清理用户文件，也未影响 3000/17371 服务。

## 190. 阶段 C 退出审计（2026-08-29）

核对 `FrameFlowCore` 后确认其剩余自动跑规划逻辑只承担并发去重、陈旧状态拒绝、写队列和后续动作发起；Prompt/事件构造、持久化、ImageGen、机器审图和跨轮总结数据准备均已由独立模块覆盖。该协调职责不再重复抽象。阶段 C 的清晰边界、独立状态测试和既有门禁退出条件已满足；后续唯一未完成的路线图门槛是已授权真实生产目标上的 CSP 观察。

## 191. 生产 CSP 目标只读核查（2026-08-29）

通过 GitHub CLI 只读查询 `basketikun/infinite-canvas` 的部署记录：存在多个 `Production` 记录，但 `environment_url` 均为空，最新记录提交为 `ed013e8e5ce8ccab47cf2fc779f8e94555eb4c23`，早于当前工作区改动。因此不能从 GitHub 部署元数据取得可访问、且对应当前代码的生产 URL，也不能将旧部署外推为 CSP 已观测。

未创建部署、未修改远端、未提交/推送，也未运行 Docker/Compose。阶段 D 的真实 CSP 响应头观察需要用户提供已授权的部署 URL，或明确授权部署到指定环境。

## 192. 本地运行边界修正（2026-08-30）

用户明确本项目只在本地运行，并确认不需要部署 URL。第 191 节保留为当时只读核查的历史证据，但其中“真实生产 CSP 响应头观察”为当前阶段前置条件的结论已不再适用。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `docs/post-development-roadmap.md` | 修改 | 将阶段 D 的 CSP 验收范围明确为本地运行：保留报告模式和静态安全响应头门禁，不要求部署观察或强制收紧；据此标记阶段 D 完成。 |
| `docs/session-development-record.md` | 修改 | 记录范围修正、第 191 节的历史性质，以及本地验收依据。 |
| `web/scripts/check-csp-report-only.mjs`、`vercel.json`、`web/vercel.json` | 已有文件，仅核验 | 静态校验 CSP 报告策略和安全响应头，作为本地开发时的配置回归门禁；本次不修改且不部署。 |
| `docs/content/docs/progress/todo.mdx`、`docs/content/docs/progress/todo.zh-CN.mdx` | 已复核，不修改 | 两份 TODO 仅描述安全与可观测性工作，不含部署 URL 前置条件，故无需改变。 |

本地验收依据为 `npm run check:csp` 的静态配置检查，以及既有 Web、Canvas Agent、Docs 和浏览器质量门禁；它不声称任何外部环境已经发布或返回响应头。未部署、未运行 Docker/Compose、未提交/推送、未清理、移动或删除用户文件，也未影响 3000/17371 服务、用户资产或凭据。

## 193. 阶段 A 至 D 当前工作树复验（2026-08-30）

在用户确认仅本地运行后，对阶段 A 至 D 的当前工作树重新执行质量门禁。阶段 E 在路线图中明确为独立需求，未在本轮启动。

| 范围 | 命令/方式 | 结果 |
| --- | --- | --- |
| Canvas Agent | `npm test`、`npm run build`、官方 npm registry 的 `npm audit --omit=dev --audit-level=high` | 261/261 测试通过，TypeScript 生产构建通过，0 个漏洞。默认镜像的 audit 接口返回 404，未将该基础设施错误误记为安全结果。 |
| Web | `npm test`、`npm run typecheck`、`npm run build`、`npm run check:csp` | 30 个测试文件/83 项通过，类型与生产构建通过，CSP 报告策略和静态安全响应头检查通过。 |
| 浏览器 | `npm run test:e2e -- --workers=1` | 独立 4173 测试服务上的 Chromium 108/108 通过；未接管、重启或关闭 3000、17371 服务。 |
| Docs | `npm run check:content`、`npm run types:check`、`npm run build`、设置 `NPM_CONFIG_REGISTRY=https://registry.npmjs.org` 后的 `bun audit` | 英文摘要 25 项、中文主清单和状态矩阵各 95 项一致；类型与生产构建通过；0 个漏洞。默认镜像下 `bun audit` 返回 404，官方 registry 复核通过。 |
| 工作树格式 | `npm run format:check`（Web） | 未通过：报告 55 个不在格式基线中的文件，其中包含 `.playwright-cli/` 浏览器记录及用户现有源码/测试。它们均不在本轮权限范围，未格式化、未改基线、未删除或纳入版本控制。 |

`git diff --check` 未发现空白错误，仅输出 Windows CRLF/LF 转换提示；3000 和 17371 仍由既有进程监听。该复验证明当前本地工作树的功能、类型、构建、浏览器与依赖门禁，但不能把未提交的工作树外推为新的干净检出可复现提交。要形成可恢复检查点，仍需用户明确授权按已分类的源码与工程文件提交，并继续排除用户资产、日志和浏览器记录。

## 194. 可恢复检查点候选范围只读分类（2026-08-30）

为准备后续授权而只读核对 `git status --porcelain=v1`：当前有 38 个已修改跟踪文件与 70 个未跟踪项。候选范围仅限 Canvas Agent、Web、Docs、测试、静态检查脚本与配置；本节不暂存、格式化、提交、移动或删除任何文件。

| 分类 | 路径/数量 | 处置边界 |
| --- | --- | --- |
| 跟踪的源码与工程变更 | 38 个 | 只在获得明确授权后再逐文件复核提交范围；其中 `web/src/lib/localforage-storage.ts` 为用户指定不触碰文件，始终排除。 |
| 未跟踪的源码与测试候选 | `canvas-agent/` 与 `web/` 下共 66 个状态项 | 仅可能作为后续源码检查点候选；每项仍需与业务改动和格式规则逐一核对。 |
| 用户资产与运行证据 | `99_PERCENT_ACCEPTANCE.md`、`artifacts/`、`canvas-agent/test-results/`、`design-qa.md` | 永久排除本次检查点；不读写、不移动、不删除、不自动纳入版本控制。 |
| 浏览器记录 | `.playwright-cli/` 下 38 个格式基线报项 | 用户浏览器记录，排除格式化、基线调整与 Git 检查点。 |

该分类使后续授权可明确区分可恢复源码与用户资产；它不等同于用户已授权提交，也不解决 Web 格式基线中的范围外文件。

## 195. Web 格式门禁范围收束（2026-08-30）

用户授权仅格式化本次源码与测试，并继续排除 Docker/容器部署、资产、运行记录和 `.playwright-cli/` 浏览器记录。因此对格式检查先前列出的 16 个 Web 源码/测试/脚本文件执行 Prettier；余下 39 项均为 `.playwright-cli/` 下的用户浏览器记录。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/.prettierignore` | 修改 | 明确排除 `.playwright-cli/`，避免格式门禁把用户浏览器记录当作产品源码格式问题。 |
| 16 个已列出的 `web/e2e/`、`web/src/` 与 `web/scripts/` 文件 | 格式化 | 只调整排版，不改变业务行为或测试断言。 |
| `docs/session-development-record.md` | 修改 | 记录授权边界、格式化范围和浏览器记录排除原因。 |

未格式化、移动、删除或纳入 `.playwright-cli/`、`artifacts/`、`canvas-agent/test-results/`、`99_PERCENT_ACCEPTANCE.md`、`design-qa.md` 或 `web/src/lib/localforage-storage.ts`。Docker/容器部署继续不在当前范围。

## 196. 本地开发可恢复检查点（2026-08-30）

用户明确授权格式化并提交已分类的源码、测试、文档和配置，继续忽略 Docker/容器部署；推送不在本次授权范围。按功能边界创建以下本地 Git 检查点：

| 提交 | 内容与用途 |
| --- | --- |
| `076410e` `refactor(frameflow): isolate local orchestration boundaries` | 固化 Canvas Agent 的 FrameFlow 事件、计划、执行和持久化职责拆分及其契约测试。 |
| `8ea1d9b` `feat(web): complete local Canvas Agent workflows` | 固化 Web 本地 Agent、画布生成/状态、浏览器回归、CSP 静态门禁与格式范围收束。 |
| 后续文档提交 | 固化路线图、状态矩阵、威胁模型和本会话的复验/检查点记录。 |

每个提交前均核对暂存差异、空白错误和受保护路径；`canvas-agent/test-results/`、`artifacts/`、`.playwright-cli/`、`99_PERCENT_ACCEPTANCE.md`、`design-qa.md` 与 `web/src/lib/localforage-storage.ts` 没有被暂存。Web 格式门禁现通过；它提示 6 个历史基线条目已被用户既有变更修复，但为遵守不触碰 `localforage-storage.ts` 的约束，本轮不改动基线清单。未推送、未创建发布、版本号或 tag，未运行 Docker/Compose。

## 197. 干净克隆 Skill 草稿 Escape 回归修复（2026-08-30）

在第 196 节三个检查点的隔离干净克隆中，Chromium 完整回归第 34 项失败：选择“从当前对话生成草稿”后，草稿编辑器显示，但 Escape 未关闭它。原因是受控的创建菜单在选择草稿来源后未被显式关闭，残留菜单遮罩可先截获 Escape。该问题与 Docker 或部署无关。

| 文件 | 变更类型 | 关联与用途 |
| --- | --- | --- |
| `web/src/components/agent/agent-skills-view.tsx` | 修改 | 创建菜单的 `onClick` 首先关闭受控菜单，确保后续 Escape 由草稿编辑器 Modal 处理。 |
| `web/e2e/agent-skill-management.spec.ts` | 既有回归 | 已有用例覆盖“取消草稿不写入 Skill”；无需新增重复测试。 |
| `CHANGELOG.md` | 修改 | 在 Unreleased 记录用户可感知的取消交互修复。 |
| `docs/session-development-record.md` | 修改 | 记录干净克隆发现、根因、修复范围和验证。 |

验证记录：原工作树中该专项 Chromium 文件 6/6 通过，Web 单元测试 30 文件/83 项、类型与格式门禁通过；后续需在含本修复的新检查点干净克隆中再次执行完整浏览器回归。`pending-test` 双语主清单已包含该 Skill 草稿取消语义，因此无需增项。未执行 Docker/Compose、未部署、未访问或改动用户资产、日志、浏览器记录或 `web/src/lib/localforage-storage.ts`。
