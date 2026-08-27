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
