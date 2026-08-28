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
