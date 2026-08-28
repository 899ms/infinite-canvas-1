# FrameFlow 与待测试清单状态矩阵（2026-08-28）

## 使用规则

此矩阵的逐项来源是 `docs/content/docs/progress/pending-test.zh-CN.mdx`，编号按该页从上到下固定。每项的“入口、测试数据、预期结果”均以同编号的中文主清单为准：未验收项只能在隔离浏览器 origin 或临时 Agent 工作区中执行，不得使用正常 3000/17371 端口或真实资产。`—` 表示尚无可复核证据，不能解读为通过。

状态只允许使用：`未验证`、`自动化通过`、`人工通过`、`已失效`、`阻塞`。当前只有完整事实内核项已有覆盖其全部非 UI 领域语义的自动化证据；Docker 项按本轮明确范围标为阻塞。其他已有局部测试的条目仍保留 `未验证`，避免把局部证据误报为完整验收。

| ID | 验收项 | 状态 | 入口 / 测试数据 / 预期 | 现有证据或阻塞原因 |
| ---: | --- | --- | --- | --- |
| 01 | Docker 当前源码部署 | 阻塞 | 主清单 01；Docker 环境；当前源码容器链路 | 本轮明确不包含 Docker/容器部署 |
| 02 | FrameFlow 默认任务定位 | 自动化通过 | 主清单 02；隔离 Auto Run；URL 任务范围保持一致 | `web/e2e/frameflow-task-context.spec.ts` 覆盖不带 ID 直接打开待审/运行与血缘时定位最新活动任务；并在两处真实 Ant Select 浮层中主动选择全部范围，确认旧任务/批次出现且刷新后保持 `autoRunId=all`。 |
| 03 | 浏览器业务数据失败保护 | 自动化通过 | 主清单 03；隔离 IndexedDB；失败不得静默丢数据 | `web/e2e/prompt-dashboard-storage.spec.ts` 使用真实浏览器 IndexedDB：知识库、PromptFill 与图片反馈写入后刷新仍保持；拦截既有 IndexedDB 连接的事务并抛出配额错误后，三类写入均拒绝且不提交内存，读取失败保留当前内存并显示统一安全告警。 |
| 04 | 配置与生成控件可访问性及按需加载 | 人工通过 | 主清单 04；键盘与屏幕阅读器；可达且按需加载 | 隔离 Playwright CLI 实测生图的 16 倍数对齐/透明背景、视频清晰度/时长、提示词来源、画布图片信息开关及 Agent/插件入口均有可读名称与状态；焦点上的 Space 正确切换开关。配置页首访未加载渠道编辑器或脚本编辑器，点击编辑渠道和调用脚本后对应界面正常出现。 |
| 05 | FrameFlow 图片预览 | 自动化通过 | 主清单 05；隔离图片；预览不改变审核状态 | `web/e2e/frameflow-preview.spec.ts` 以隔离路由夹具覆盖运行与血缘、演化轨迹、待审检查器、Preference DNA 的强化/规避/Comment 证据图；验证当前组切换、缩放、旋转、翻转、关闭，以及预览期间零反馈命令写入。 |
| 06 | FrameFlow Prompt 中英审核 | 自动化通过 | 主清单 06；隔离 Prompt；翻译不改变英文执行原文 | `frameflow-prompt-language.spec.ts` 覆盖默认中文、English/中英对照、无横向溢出、补译后刷新保留与零重复翻译；Core 持久化回归及 `codex-frameflow-requests.test.ts` 证明 ImageGen 请求只使用英文 `compiledPrompt`、技术与负面字段。 |
| 07 | FrameFlow Prompt 长文本布局 | 自动化通过 | 主清单 07；隔离超长英文 Tag 与完整 Prompt；三种断点均不横向溢出 | `web/e2e/frameflow-prompt-language.spec.ts` 以固定无空格长 Token 填充 10 个字段和完整 Prompt，在 1280px、768px、390px 分别断言三/二/一列、字段卡片与 Tag 不溢出、完整 Prompt 不溢出，且根文档没有横向滚动。 |
| 08 | FrameFlow 自动跑风格 | 自动化通过 | 主清单 08；隔离 Auto Run；规划、生成、评审、停止与恢复一致 | `web/e2e/frameflow-auto-run.spec.ts` 覆盖自由方向、名称、画幅、探索方式、每轮数量与最大轮数的创建设置，以及“Codex 规划第 1 轮”即时状态、停止和同一任务恢复入口；`core.test.ts` 覆盖逐轮规划/生成/机器审图、停止于规划/生成/审图、迟到结果、失败恢复、重启与 `auto_run.extended` 原血缘追加。 |
| 09 | FrameFlow 演化轨迹 | 自动化通过 | 主清单 09；隔离三轮 Auto Run；按真实轮次比较与打开血缘 | `web/e2e/frameflow-trajectory.spec.ts` 覆盖三轮横向比较、Machine Review、Prompt Revision、Prompt Diff 展开、390px 横向轨道与对应 Run 血缘跳转；`auto-run-trajectory.ts` 只从同一 `auto_run.iteration_started` 事件投影轮次，Core 测试覆盖实际多轮血缘。 |
| 10 | FrameFlow 跨轮总结 | 自动化通过 | 主清单 10；两轮完整机器审图；总结证据与更新可追溯 | `web/e2e/frameflow-trajectory.spec.ts` 覆盖生成、刷新保留、新轮次待更新及强制更新请求；`core.test.ts` 覆盖自动后台生成、不可变 `auto_run.trajectory_summarized`、真实证据轮次、重启保留与不改写 Preference DNA。 |
| 11 | FrameFlow 创建页 | 未验证 | 主清单 11；隔离参考图与 Brief；批准和生成独立 | `web/e2e/frameflow-task-context.spec.ts` 覆盖空用途创建 Brief、先规划/批准 Prompt、后独立提交 Run；`frameflow-reference-picker*.spec.ts` 覆盖 WebP→PNG、四张上限/搜索/取消/空资产、超 20MB 阻断、受控 ID 绑定、刷新恢复及重新填写的新幂等键。非法图 Agent 拒绝与完整真实生成路径仍待验收。 |
| 12 | FrameFlow 待审页 | 自动化通过 | 主清单 12；隔离图片；评分、评论、隐藏和删除语义正确 | `web/e2e/frameflow-review-feedback.spec.ts` 覆盖五星、Comment、软删除与永久删除的独立命令载荷和页面回显；`frameflow-task-context.spec.ts` 覆盖同一任务筛选及隐藏/恢复；`core.test.ts` 覆盖临时工作区内的评分、评论、隐藏和恢复领域语义。 |
| 13 | FrameFlow 机器审图状态 | 自动化通过 | 主清单 13；隔离 Auto Run；状态仅出现在当前评审图片 | `frameflow-machine-review-state.spec.ts` 覆盖当前审图批次与历史图片的状态隔离；`core.test.ts` 覆盖机器审图中断恢复。 |
| 14 | FrameFlow Preference DNA 页 | 自动化通过 | 主清单 14；隔离反馈；证据与硬约束保持分离 | `web/e2e/frameflow-preference-dna.spec.ts` 覆盖五项 DNA 指标、强化/规避图片、评分、Comment 和事实事件计数，并确认未审核图片不出现；`core.test.ts` 的“Codex Planner 只在同一 Creative Brief 内继承人工偏好证据”覆盖下一轮 Planner 的完整证据上下文、跨需求隔离与原 Prompt 字段快照。 |
| 15 | FrameFlow 运行与血缘页面 | 自动化通过 | 主清单 15；隔离 Run；任务过滤、重试和隔离一致 | `web/e2e/frameflow-lineage.spec.ts` 覆盖当前任务过滤、全部运行范围、失败 slot 定向重试、生成结果与尝试次数回显、Decision/Diff 按需展开，以及取消后迟到文件隔离提示；`core.test.ts` 覆盖只重跑指定失败 slot、保留成功图片和取消后 quarantine。 |
| 16 | FrameFlow 事实内核 | 自动化通过 | 主清单 16；临时工作区与 PNG；事件、血缘、取消及重启一致 | `canvas-agent/src/frameflow/core.test.ts` |
| 17 | 资产瀑布流回归 | 人工通过 | 主清单 17；隔离资产库；布局和筛选可用 | 隔离 Playwright CLI 实测 4:3 QA 图片在 292px 瀑布流列内以原比例渲染；搜索、无匹配清除、图片/标签入口、高评分排序、232/292px 密度切换、ZIP 导入导出以及 soft delete 的隐藏/恢复路径均可用。 |
| 18 | 可移植设计系统与启动链路 | 阻塞 | 主清单 18；干净目录与 Docker；本地/容器均使用当前源码 | 干净 Web 安装已验证；Docker 验收不在本轮范围 |
| 19 | 个人提示词运行时 | 自动化通过 | 主清单 19；隔离个人库；审核和偏好排序正确 | `personal-prompt-options.test.ts` 覆盖五星优先、低评分降权与软删除排序；`personal-prompt-runtime.spec.ts` 在生图、视频及画布图片节点验证公开/个人库双视图、已审核过滤与待修复项隔离。 |
| 20 | 提示词迁移与审核 | 自动化通过 | 主清单 20；`web/qa-fixtures/prompt-migration.json`；待修复引用保留 | `import-export.test.ts` 覆盖 QA 血缘与三类缺失引用项的待修复/审核拒绝；`prompt-migration.spec.ts` 在隔离浏览器验证 10 条待修复项的滚动访问，以及机器校验、人工通过入口禁用 |
| 21 | 室内设计工作流 | 人工通过 | 主清单 21；隔离平面图；8 节点、10 连线和 Agent 引导 | `interior-canvas-workflow.test.ts` 验证 8 节点、10 连线和三个 Codex 节点语义；隔离 Playwright CLI 实际上传 QA 平面图、选择整图并创建画布，确认 8 个节点、三段 Codex 引导和视频节点可见。真实 Agent/生图/视频调用不在本项证据范围。 |
| 22 | 上游 v0.15.1 回归 | 未验证 | 主清单 22；隔离画布；上游功能保持可用 | — |
| 23 | 设计系统回归 | 人工通过 | 主清单 23；深浅主题与键盘；主题和焦点稳定 | `web/index.html` 在模块加载前恢复主题 class、`color-scheme` 与 `theme-color`；隔离 Playwright CLI 实测深色首屏、浅色切换后的 `#fafaf9` 主题色、画布卡片 Tab/Enter 打开及选择、重命名、导出、删除，并确认生图、视频与画布音频设置面板的可达控件。 |
| 24 | 按需加载与标题 Token 回归 | 自动化通过 | 主清单 24；各路由首访；骨架和标题 Token 正确 | `web/e2e/routes.spec.ts` 覆盖共享懒加载骨架、首页 display token、八个工作台 title token 的深浅主题 700 字重、资产空态文案，以及隔离 Agent 状态下从顶部打开、收起再打开后连接、对话、历史和日志保持。 |
| 25 | 提示词筛选响应式回归 | 人工通过 | 主清单 25；1100px 断点；筛选可滚动可键盘操作 | 隔离 Playwright CLI 在 1000px 实测分类/标签轨道均为 `overflow-x:auto`、`nowrap` 且有溢出；键盘 Enter 切换分类、Tab 后 Space 切换标签。1280px 回归左侧 sticky 纵向滚动栏与换行筛选项。 |
| 26 | Agent 模型设置 | 自动化通过 | 主清单 26；隔离 Agent；模型、推理强度、刷新、发送与日志一致 | `web/e2e/agent-model-controls.spec.ts` 以隔离 Agent 模型清单验证内部审查模型、重复显示名和无受支持推理强度的条目均被过滤；切换 Mini 后仅显示其支持的轻度/极高、刷新后保留选择，发送请求与本地日志均携带 `gpt-5.4-mini` / `xhigh`。 |
| 27 | Agent 新对话响应 | 自动化通过 | 主清单 27；隔离线程；旧消息立即清空且首发不会投向旧线程 | `web/e2e/agent-new-thread.spec.ts` 在延迟重置响应期间确认旧消息已清空；重置完成后首次发送的载荷只携带新线程 ID，历史列表仍只含既有会话。`startNewThread` 同时作废先前历史读取，避免迟到响应重新写入旧消息。 |
| 28 | Agent 读取画布卡片 | 自动化通过 | 主清单 28；隔离历史；类型统计、空态与错误可恢复 | `canvas-agent/src/agent/codex-history.test.ts` 覆盖历史恢复中的 `canvas_get_state`：精确汇总文本、图片、配置、视频、音频、分组、其他节点和连线；空画布显示“当前画布为空”，失败状态保留真实错误文本。 |
| 29 | Agent 首次发送响应 | 自动化通过 | 主清单 29；隔离线程；用户消息即时出现且草稿不会丢失 | `web/e2e/agent-first-send.spec.ts` 覆盖首次发送时输入立即清空并显示用户消息；发送失败恢复原草稿与错误；请求在途写入的新草稿在成功响应后保持。 |
| 30 | Agent 动态工具信息 | 自动化通过 | 主清单 30；隔离工具调用；具体名称、失败原因与历史一致 | `web/src/components/agent/agent-event-formatters.test.ts` 覆盖实时动态工具卡片和日志的具体工具名/失败原因；`canvas-agent/src/agent/codex-history.test.ts` 覆盖历史恢复后的同名、结果文本和错误详情。 |
| 31 | Agent 画布生图 | 未验证 | 主清单 31；隔离画布与 Agent；只在真实结果后声明完成 | — |
| 32 | Agent 顶部栏 | 自动化通过 | 主清单 32；360px 隔离面板；标题、操作同列且标签可横向滚动 | `web/e2e/agent-panel-header.spec.ts` 以最小 360px 面板验证“Agent”标题、连接设置、四个内容标签、新对话和收起操作可见且垂直中心对齐；标签栏使用 `overflow-x:auto`。 |
| 33 | Agent Markdown 样式 | 未验证 | 主清单 33；长 Markdown；主题和溢出正确 | — |
| 34 | Agent 工具确认模式 | 自动化通过 | 主清单 34；隔离 SSE 画布写入；自动回传或手动确认 | `web/e2e/agent-tool-confirmation.spec.ts` 通过内存 EventSource 触发真实前端 `tool_call(canvas_apply_ops)`：默认自动确认立即回传 canvas 结果；切换手动确认后显示等待确认卡片，拒绝会回传“用户取消了画布工具调用”。 |
| 35 | Canvas Agent Codex 升级 | 自动化通过 | 主清单 35；隔离 Codex 协议与版本诊断；启动可继续 | `canvas-agent/src/version-check.test.ts` 验证启动必报 Agent、内置 `0.146.0` 与本机 Codex 版本，缺失/不匹配/可升级均提示，npm 查询失败仅警告且不抛出；`codex-client.test.ts` 覆盖同线程中断、随后新 turn 启动及 Codex 事件归属，`session.test.ts` 覆盖画布工具请求与回传。 |
| 36 | Canvas Agent Debug | 自动化通过 | 主清单 36；隔离临时日志目录；正常/Debug 级别、按日追加与脱敏正确 | `canvas-agent/src/utils/logger.test.ts` 覆盖普通模式只输出 Info/Warn/Error，Debug 模式写入隔离临时目录的同日追加文件；日志正文与详情中的凭据、Bearer 和 Data URL 均被遮蔽，单行格式稳定。 |
| 37 | Canvas Agent Codex 日志 | 自动化通过 | 主清单 37；隔离 stderr；ANSI、上游 UTC 时间与换行不会污染本地诊断 | `canvas-agent/src/agent/codex-client.test.ts` 验证 Codex stderr 去除 ANSI 控制符、上游 UTC ISO 时间和末尾换行，只把干净正文交给本地 logger 与网页时间线各自加一次本地时间。 |
| 38 | Agent HTTP 诊断日志 | 自动化通过 | 主清单 38；隔离 HTTP 与 SSE；精简生命周期和完成用量正确 | `canvas-agent/src/server/http-log-filter.test.ts` 覆盖本地 Debug HTTP 噪音过滤；`web/src/components/agent/agent-event-formatters.test.ts` 与 `web/e2e/agent-http-diagnostics.spec.ts` 覆盖真实发送入口、受控 SSE 的开始、回复、完成用量，以及线程 ID/流式摘要不进入右侧日志。 |
| 39 | Agent 排查日志 | 自动化通过 | 主清单 39；隔离 Agent 日志；筛选、折叠、详情、原始 JSON 与清空可用 | `web/e2e/agent-log-diagnostics.spec.ts` 以隔离日志打开真实右侧面板，验证错误筛选、连续警告折叠计数、详情、原始 JSON 和清空操作。 |
| 40 | Agent 排查日志顺序与跟随 | 自动化通过 | 主清单 40；隔离长日志；顺序、筛选与跟随正确 | `web/e2e/agent-log-follow.spec.ts` 使用 60 条内存日志验证旧到新排列、进入日志和筛选后定位底部、向上浏览暂停跟随、新日志计数提示及点击回到底部。 |
| 41 | Agent 对话统计 | 自动化通过 | 主清单 41；隔离会话；简洁消息和最新用量正确 | `web/e2e/agent-chat-usage.spec.ts` 在真实右侧面板验证用户右对齐、无气泡/头像、双方无历史时间与 Token 元数据，最新调用显示输入/缓存/输出，并在新对话时清空。 |
| 42 | Agent 回复实时显示 | 自动化通过 | 主清单 42；隔离流与失败事件；增量、完整回补与错误收束正确 | `web/e2e/agent-realtime-reply.spec.ts` 以真实右侧面板、内存 EventSource 和受控历史接口覆盖：用户消息后立即出现“正在思考”、流式片段实时显示，`turn.completed` 后自动读取权威历史并替换为完整 Codex 回复；模型繁忙事件立刻显示中文重试建议、清除发送/等待状态，日志只记录“处理失败”。 |
| 43 | Agent 流式交互性能 | 自动化通过 | 主清单 43；隔离长历史与多增量；当前流、滚动和完成同步稳定 | `web/e2e/agent-streaming-performance.spec.ts` 以 80 条历史消息和 120 段 SSE 增量验证：历史行启用 `content-visibility`，仅当前流式消息持续更新；用户上滚后后续增量不强制跳回底部，完成后自动回补完整历史，并且全过程未请求 `/health`。 |
| 44 | Agent 过程时间线 | 自动化通过 | 主清单 44；隔离过程事件与历史；时间线、计划和恢复一致 | `web/e2e/agent-process-timeline.spec.ts` 覆盖单命令折叠预览与展开诊断；`agent-process-timeline-live.spec.ts` 通过真实面板与内存 EventSource 依次发送思考、计划、命令、文件、网页和画布工具事件，验证中文化卡片、思考摘要保持、计划单卡更新，以及 `turn.completed` 后从权威历史恢复完整过程记录。 |
| 45 | Agent 权限控制 | 自动化通过 | 主清单 45；隔离审批；权限语义正确 | `web/e2e/agent-permission-controls.spec.ts` 覆盖三种模式选择、完全访问风险确认、刷新持久化与两个并发审批卡的逐一决定/确认回收；`canvas-agent/src/agent/codex-client.test.ts` 覆盖请求批准、自动审查与完全访问分别传给 Codex 的审批、沙箱和自动审查策略。 |
| 46 | Agent 历史记录 | 自动化通过 | 主清单 46；隔离历史；恢复和删除一致 | `web/e2e/agent-history-records.spec.ts` 覆盖卡片直接恢复、无“进入”按钮、全选两条、批量删除以及删除当前对话后消息清空；`canvas-agent/src/agent/codex-history.test.ts` 继续覆盖历史投影与恢复。 |
| 47 | Agent 默认新对话 | 自动化通过 | 主清单 47；隔离空会话；不恢复、不预建、首发才建线程 | `web/e2e/agent-default-new-thread.spec.ts` 覆盖连接后的空白对话、零自动 reset 请求、旧历史不自动进入，以及首条发送携带空线程 ID；`canvas-agent/src/server/http.ts` 仅允许空闲空会话由首条 turn 懒创建 Codex 线程。 |
| 48 | Agent 当前画布优先 | 自动化通过 | 主清单 48；双标签隔离；当前画布读取与写入不偏移 | `canvas-agent/src/agent/agent-instructions.test.ts` 固定“先读当前画布、不列举/重复导航”的实际 MCP 指令；`canvas-agent/src/canvas/session.test.ts` 覆盖 turn 绑定发起网页后，即使焦点切到另一标签，读取和写入仍只作用于原画布。 |
| 49 | Agent 图片消息 | 自动化通过 | 主清单 49；隔离图片附件；缩略图、预览、历史和清理正确 | `web/e2e/agent-image-message.spec.ts` 以持久化 `agent-asset` 历史响应覆盖 40px 缩略图和大图预览；`canvas-agent/src/agent/message-metadata.test.ts` 覆盖重启恢复、按线程删除预览资源和超大预览拒绝。 |
| 50 | 画布文本复制 | 人工通过 | 主清单 50；隔离 Chromium 画布；文本选择与节点复制快捷键不冲突 | 浏览器实测：选中节点文字后 `Ctrl+C` 保持原生选区，随后粘贴不产生“Copy”节点；点击画布节点本体且无文字选区时 `Ctrl+C` + `Ctrl+V` 将节点数从 1 增至 2，并生成“文本 Copy”。`web/src/lib/canvas/canvas-copy-shortcut.test.ts` 固定对应分支。 |
| 51 | Agent 工作目录指令 | 自动化通过 | 主清单 51；隔离工作区；指令生成与请求边界正确 | `canvas-agent/src/config.test.ts` 验证隔离工作目录从独立 `agent-instructions.md` 源生成 `AGENTS.md`；`canvas-agent/src/agent/codex-client.test.ts` 验证 `turn/start` 仅含本轮请求和必要附件上下文，不重复工作目录指令。 |
| 52 | 画布文本设置 | 人工通过 | 主清单 52；隔离 Chromium 画布；推理强度、请求组装与持久化正确 | `web/src/services/api/text-reasoning.test.ts` 覆盖节点优先级、自动省略 `reasoning`、指定档位发送 `reasoning.effort` 与自定义脚本变量；浏览器实测文本节点“高”和配置节点文本模式“极高”刷新后保持。 |
| 53 | 生图工作台参考图 | 自动化通过 | 主清单 53；隔离 Chromium；图片拖放、非图片过滤与高亮正确 | `web/e2e/image-reference-drop.spec.ts` 向真实生图参考图区投放两张 PNG 与一个文本文件，验证拖入高亮和提示、仅两张图片上传并渲染缩略图，以及 drop 后状态复位。 |
| 54 | 视频创作台参考资产 | 自动化通过 | 主清单 54；隔离 Chromium；混合文件分类、高亮、格式忽略与数量上限正确 | `web/e2e/video-reference-drop.spec.ts` 从真实“参考视频”区域混合投放 PNG、4 个 MP4/MOV、WAV 与文本文件，验证当前区域高亮、图片/视频/音频自动分类、文本忽略、视频按 3 个上限截断及 drop 后状态复位。 |
| 55 | 画布组装提示词 | 自动化通过 | 主清单 55；隔离 Chromium 画布；长文本正文可滚动且浮层固定 | `web/e2e/canvas-config-composer-scroll.spec.ts` 新建真实配置节点并写入 120 段长提示词，验证正文 `scrollHeight > clientHeight`、滚轮只推进正文 `scrollTop`，而编辑器及关闭按钮的视口位置不变。该回归同时固定输入回写不得造成 React 更新深度循环。 |
| 56 | 画布节点提示词 | 自动化通过 | 主清单 56；隔离 Chromium 画布；长文本内部滚动且画布不缩放 | `web/e2e/canvas-node-prompt-scroll.spec.ts` 新建真实图片节点并写入 120 段提示词，验证输入区 `scrollHeight > clientHeight`、滚轮推进输入区 `scrollTop`，而画布 viewport 的 transform 不变。该回归同时固定节点提示词输入不得对同值内容重复回写而触发 React 更新深度循环。 |
| 57 | 画布节点提示词回显 | 自动化通过 | 主清单 57；隔离 Chromium 批量图片；根图与子图切换后提示词保持 | `web/e2e/canvas-batch-prompt-recall.spec.ts` 预置隔离批量图片根节点，验证初始回显、展开图片组并将任一子图设为主图、再次选择根节点后，提示词输入区始终保留原生成提示词。当前架构的批量子图是根节点 `images` 槽位，不是独立画布节点；“设为主图”为其可见切换操作。 |
| 58 | 画布生成配置 | 自动化通过 | 主清单 58；隔离节点；连续生成/失败重试不重复拼接上游文本，按模式选模型 | `web/src/components/canvas/canvas-node-generation.test.ts` 对同一配置节点连续构建首发与失败重试上下文，固定上游文本只出现一次；并验证 image/video/text/audio 各自解析当前类型配置的模型。`project.tsx` 的首发与重试均将该上下文和 `buildGenerationConfig` 直接用于请求。 |
| 59 | 画布左侧元素列表 | 自动化通过 | 主清单 59；隔离画布；整行定位选中，图片预览不触发定位 | `web/e2e/canvas-side-panel-focus-preview.spec.ts` 预置一个初始不在视口的图片节点：点击独立预览按钮仅打开大图且节点仍未进入 DOM，关闭后点击元素整行才将节点平滑定位到视口并选中。 |
| 60 | 配置与用户偏好 | 自动化通过 | 主清单 60；隔离配置导入导出；恢复与错误提示正确 | `web/src/services/config-file.test.ts` 覆盖导出渠道、默认模型、生成偏好、提示词来源和 WebDAV；在变更状态后导入恢复完整内容；错误 JSON 被拒绝且保持当前设置。 |
| 61 | 模型渠道协议 | 自动化通过 | 主清单 61；隔离渠道；方舟格式与限制正确 | `web/src/lib/ark-channel-protocol.test.ts` 覆盖方舟默认地址、任意模型名按渠道协议分流、1080p 与 200MB/像素边界；并拦截请求验证图片以 JSON 提交参考图，视频以方舟任务创建与查询端点执行。 |
| 62 | 图片编辑弹窗 | 未验证 | 主清单 62；隔离图片；缩放和遮罩同步 | — |
| 63 | 提示词中心布局 | 自动化通过 | 主清单 63；隔离提示词来源；防抖、滚动和布局正确 | `web/e2e/prompt-library-layout.spec.ts` 以两条内存提示词和 48 个长标签验证标题/总数居中、220ms 内搜索仍保留旧结果而随后查询生效、桌面两栏且左侧独立纵向滚动、右侧搜索框后直接出现卡片、窄屏单列无横向溢出；同时确认无“我的提示词”Tab，加入资产操作直接写入资产库。 |
| 64 | 提示词详情弹窗 | 自动化通过 | 主清单 64；隔离长内容与参考图；固定区和滚动区正确 | `web/e2e/prompt-detail-dialog.spec.ts` 以长提示词和多参考图验证上方媒体、底部复制/加入资产操作保持固定，只有中间内容可滚动；桌面和 390px 窄屏下弹窗均不超出视口。 |
| 65 | 提示词远程缩略图 | 自动化通过 | 主清单 65；隔离坏 URL 与旧缓存；安全降级且无资源错误 | `web/e2e/prompt-thumbnail-fallback.spec.ts` 写入一小时前的原始坏缩略图缓存，验证已知拒绝跨域嵌入和已失效地址在卡片、来源内容表格与详情弹窗均降级为占位图，且浏览器不请求坏图。 |
| 66 | 提示词来源 | 自动化通过 | 主清单 66；隔离来源；默认集、筛选、缓存和失败恢复正确 | `prompt-source-presets.test.ts` 固定六个默认统一仓库 URL；`prompt-source-data.spec.ts` 覆盖独立启用、来源/标签筛选，以及标准 JSON 来源在非数组或 503 后保留旧缓存；持久化单测将旧 Freestylefly 默认来源无损迁移为自定义来源。 |
| 67 | 提示词来源界面 | 自动化通过 | 主清单 67；隔离来源；卡片、状态和操作可读 | `web/e2e/prompt-source-data.spec.ts` 验证来源卡片左侧开关、数量/状态/成功时间次级信息、查看/拉取/编辑/删除文字按钮，以及独立边框的定时拉取区。 |
| 68 | 画布提示词库 | 自动化通过 | 主清单 68；隔离提示词；搜索和插入正确 | `web/e2e/canvas-prompt-library.spec.ts` 验证公开来源无需展开即可直接搜索，页面没有“我的提示词”分组；导入隔离审核提示词后点击“插入画布”，写入的文本节点保留提示词标题和完整正文。 |
| 69 | 全站 Agent | 自动化通过 | 主清单 69；隔离任务状态；仅当前标签返回 | `web/src/lib/agent/agent-site-tools.test.ts` 覆盖生图/视频提交均返回 `taskId`，并可查询排队、运行、成功、失败及按 `nodeIds` 的画布状态；`canvas-agent/src/canvas/session.test.ts` 验证查询请求仅发给当前激活网页。 |
| 70 | 本地 Agent 多标签页隔离 | 自动化通过 | 主清单 70；双标签；工具只写入发起页 | `canvas-agent/src/canvas/session.test.ts` 双客户端覆盖焦点读写、turn 绑定后焦点切换不改变目标、关闭活动页回退、绑定页断开不落入另一页，以及仅请求页可回传工具结果。 |
| 71 | 本地 Agent 多标签页会话同步 | 自动化通过 | 主清单 71；双标签；线程状态同步 | `canvas-agent/src/canvas/session.test.ts` 覆盖站点级会话切换、同线程聊天与运行状态广播到两页；运行期统一写操作锁拒绝会话变更，结束后恢复；前端按线程过滤事件并禁用运行期操作。 |
| 72 | 本地 Agent 运行状态同步 | 自动化通过 | 主清单 72；双标签长任务；忙碌状态同步 | web/e2e/agent-cross-tab-running.spec.ts 在两个真实浏览器页面中覆盖工具完成后第二页建立 SSE 连接、运行状态即时回放与结束收束；canvas-agent/src/canvas/session.test.ts 覆盖站点级状态广播。 |
| 73 | 本地 Agent 图片附件落画布 | 未验证 | 主清单 73；隔离附件；归属与关闭失败正确 | `canvas-agent/src/canvas/session.test.ts` 有局部覆盖 |
| 74 | Agent 对话滚动 | 未验证 | 主清单 74；长会话；跟随和跳转正确 | — |
| 75 | Agent 消息区分 | 未验证 | 主清单 75；多类消息；布局清晰不溢出 | — |
| 76 | 画布选择与平移 | 未验证 | 主清单 76；不同工具与快捷键；交互不冲突 | — |
| 77 | 文档站国际化 | 未验证 | 主清单 77；中英文路径；语言和搜索保持正确 | — |
| 78 | 国际化基础框架 | 未验证 | 主清单 78；切换与刷新；界面文案同步 | — |
| 79 | 全局弹层主题 | 未验证 | 主清单 79；深浅主题；弹层颜色一致 | — |
| 80 | 画布节点缩放稳定性 | 未验证 | 主清单 80；重复缩放；无 React 循环错误 | — |
| 81 | Agent MCP 初始化状态 | 未验证 | 主清单 81；隔离线程；准备态与阻塞规则正确 | `canvas-agent/src/canvas/session.test.ts` 有局部覆盖 |
| 82 | Agent 输入框窄屏布局 | 未验证 | 主清单 82；多面板宽度；图标与提示正确 | — |
| 83 | Agent 本地 Skill 管理 | 未验证 | 主清单 83；隔离工作区 Skill；读写边界与同步正确 | `canvas-agent/src/skills/store.test.ts` 有局部覆盖 |
| 84 | Agent Skill 草稿生成 | 未验证 | 主清单 84；隔离线程与画布；草稿安全且可中断 | `canvas-agent/src/canvas/session.test.ts` 有局部覆盖 |
| 85 | Agent Skill 调用 | 未验证 | 主清单 85；隔离 Skill；原子 token 与持久化正确 | — |
| 86 | Agent 输入框快捷引用 | 未验证 | 主清单 86；隔离素材；插入、键盘和预览正确 | — |
| 87 | Agent 消息元数据 | 未验证 | 主清单 87；隔离附件；精确身份恢复与删除正确 | `canvas-agent/src/agent/message-metadata.test.ts` 有局部覆盖 |
| 88 | Agent 对话实时与历史一致性 | 未验证 | 主清单 88；隔离长任务；刷新后事件一致 | `canvas-agent/src/agent/codex-history.test.ts` 有局部覆盖 |
| 89 | 工作台历史图片清理 | 未验证 | 主清单 89；隔离历史；记录和专属文件语义正确 | — |
| 90 | 画布多图生成 | 未验证 | 主清单 90；隔离多图；槽位、主图和展开正确 | — |
| 91 | 画布多图主图切换 | 未验证 | 主清单 91；隔离多图；中心和缩放保持正确 | — |
| 92 | 画布多图失败槽位 | 未验证 | 主清单 92；隔离失败槽位；重试和删除范围正确 | — |
| 93 | 画布多图尺寸调整 | 未验证 | 主清单 93；隔离多图；收起后稳定缩放 | — |
| 94 | 本地存储设置 | 未验证 | 主清单 94；隔离 IndexedDB；统计刷新不阻塞 | — |
| 95 | Agent 命令记录 | 未验证 | 主清单 95；隔离命令；聚合、展开和恢复正确 | `canvas-agent/src/agent/codex-history.test.ts` 有局部覆盖 |

## 当前结论

- 已自动化通过：57 项（02、03、05、06、07、08、09、10、12、13、14、15、16、19、20、24、26、27、28、29、30、32、34、35、36、37、38、39、40、41、42、43、44、45、46、47、48、49、51、53、54、55、56、57、58、59、60、61、63、64、65、66、67、68、69、70、71）。
- 人工通过：5 项（04、17、21、23、25）。
- 阻塞：2 项（01、18），原因均为当前明确排除 Docker/容器部署。
- 未验证：29 项。虽然其中若干项已有单元或局部浏览器回归，其范围不足以覆盖主清单对应的完整可见行为，仍需逐项人工或补充自动化验收。
- 本次新增的 `FrameFlow HTTP 隔离夹具覆盖停止、恢复、反馈、血缘与 Requirement 归档闭环` 是阶段 B 的 P0 自动化证据；其余仍按本矩阵继续关闭，不将它外推为 95 项全部通过。
- `canvas-agent/src/frameflow/core.test.ts` 以一次性工作区验证机器审图失败后原 Auto Run 进入失败态，原生成批次保持可追溯；重新启动后只补充缺失审图并在同一任务完成。该证据不覆盖页面刷新或 UI 设置交互。
- `web/e2e/frameflow-task-context.spec.ts` 以隔离浏览器 origin 验证自动跑失败卡片在刷新后仍保留失败原因与原批次，点击“继续自动跑”后调用该任务的恢复端点并回写完成态；不包含真实模型调用。
- 同一浏览器夹具验证创建页只在用户点击“开始生成”后才提交 Run；空用途创建会交给 Agent 默认语义，防止 Prompt 批准意外触发生图。参考图导入与持久化恢复另行验收。
- `web/e2e/frameflow-task-context.spec.ts` 现以隔离浏览器 origin 和路由夹具验证待审页的隐藏与恢复：只有右侧检查器确实回显“已隐藏”后才执行恢复，并验证“已恢复”及两条反馈命令。该证据不覆盖评分、Comment 或永久删除。
- 内置浏览器已在隔离 Web 服务 `127.0.0.1:3013/frameflow` 完成人工只读检查：页头导航、中文标题、8 个工作标签和“先连接 Canvas Agent”离线引导均正常渲染，控制台没有 error/warn。该服务未接入 Agent，因此此证据只覆盖离线可见状态，不覆盖创建、自动跑或人工反馈闭环。
- 本次又在 Codex 内置浏览器的隔离 Web `127.0.0.1:3014` 与隔离 FrameFlow Core `127.0.0.1:17400` 完成可见闭环：空用途创建 Brief、生成并批准 Prompt、独立提交 1 张 Run、血缘页显示成功 1/1、5 星与 Comment、隐藏/恢复、Preference DNA 的 `+3` 证据、归档后的只读历史及恢复；另启动一轮 Auto Run，页面显示“已完成 1/1 轮”并提供查看演化/审图入口。Core 使用真实已编译的 FrameFlow router，但 planner、图片生成器与审图器为确定性临时替身，工作区位于系统临时目录；它验证 UI 与核心集成，不代表外部模型或真实 Canvas Agent SSE 的生产验收，也不将局部记录外推为 95 项全部通过。
