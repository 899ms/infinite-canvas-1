# 阶段 A 工作树分类与可恢复检查点记录

## 1. 会话范围

本次接手 Infinite Canvas + FrameFlow 后续开发，执行路线图阶段 A 的只读分类门。仓库为 `F:\GJ\生图库\repo-research\basketikun-infinite-canvas`，当前不执行提交、暂存、清理、重置、切换、覆盖、移动或删除，也不执行 Docker/容器验收。

本记录本身是按仓库 `AGENTS.md` 要求新增的会话记录文件；它只记录核验结果和文件用途，不代表任何文件已经进入 Git。

## 2. 已完整读取的依据

| 文件 | 本次用途 |
| --- | --- |
| `CONTEXT.md` | 接手边界、FrameFlow 语义、服务地址和用户资产保护规则 |
| `AGENTS.md` | 开发、文档、测试、前端目录和不可回滚操作约束 |
| `docs/post-development-roadmap.md` | 阶段 A 目标、分类口径、退出条件和当前风险 |
| `docs/session-development-record.md` | 前一轮审查范围、验证记录和已生成文件关联 |

四份文件均已从头到尾读取。路线图要求先分类，再由用户决定可恢复检查点；不能把当前工作区验证结果直接当作干净检出结果。

## 3. Git 与服务基线

- `HEAD`：`c2af4cb`；`origin/main`：`b66936d`；当前分支相对远端为领先 2 个提交、落后 0 个提交。
- `git diff --name-status`：84 个 `M`，未发现删除项。
- 分类快照时：84 个实际未跟踪文件（使用 `git ls-files --others --exclude-standard`；普通 `git status` 会折叠未跟踪目录）。本记录创建后会额外增加 1 个未跟踪文档文件。
- `git diff --check` 退出码为 0；输出中的 LF/CRLF 提示是 Windows 换行提醒，不是差异错误。
- 3000 端口：`0.0.0.0:3000` 由仓库内 Vite 进程监听；`http://127.0.0.1:3000/` 返回 HTTP 200。
- 17371 端口：`127.0.0.1:17371` 由仓库内 Canvas Agent 进程监听；`/health` 返回 HTTP 200；根路径返回 401，属于未认证路径，不作为服务故障。

## 4. 当前修改和未跟踪文件分类

### 4.1 可恢复源码检查点候选

下面是建议在用户授权后纳入同一个可恢复源码/工程检查点的精确集合。这里的“纳入候选”只表示范围建议，本次没有暂存或提交。

| 类别 | 数量 | 精确范围与用途 |
| --- | ---: | --- |
| 已跟踪修改 | 84 | 当前 `git diff --name-only` 的完整结果：仓库根目录 6 个文件（`.gitignore`、`AGENTS.md`、`CHANGELOG.md`、`Dockerfile`、`README.md`、`docker-compose.yml`）；`canvas-agent/` 的 `package.json` 与 `package-lock.json`；`docs/` 下 14 个锁文件、站点、内容和索引文件；`web/` 下 62 个配置、依赖、页面、组件、服务、状态和样式文件。 |
| 新增运行源码 | 25 | `web/src/` 下除测试文件外的新增 TypeScript/TSX：画布生图与室内设计工作流、PromptFill、Prompt 知识库、反馈、资产/Prompt 页面、图片 URL 服务和相关 Zustand store。它们是当前 Web 功能的运行代码。 |
| 新增测试源码 | 13 | `web/src/` 下新增的 `.test.ts`：画布/室内设计工作流、反馈、持久化、PromptFill、Prompt 知识库、资产传输和 Prompt 图片 URL 测试。它们是当前质量门禁的测试输入。 |
| 新增工程基础设施 | 25 | `.github/workflows/quality.yml`；`docs/scripts/check-pending-test-locales.mjs`；`web/design-system/` 完整 12 文件；`web/e2e/` 2 个浏览器测试；`web/playwright.config.ts`；`web/qa-fixtures/` 5 个一次性测试夹具文件；`web/scripts/` 3 个检查脚本/基线文件。 |
| 新增项目计划文档 | 3（本记录创建前） | `迁移方案.md`、`docs/post-development-roadmap.md`、`docs/session-development-record.md`。用途分别是迁移计划、后期路线图和前一轮审查/文件关联记录；本次新增的本记录在创建后作为第 4 个项目计划/会话记录文件。 |

### 4.2 暂不纳入源码检查点、但必须原位保留的证据

以下 18 个文件是截图、对比页面、验收报告或验收输入输出，不是当前运行所必需的源代码；建议不进入源码检查点，但本次不删除、不移动、不覆盖：

- `99_PERCENT_ACCEPTANCE.md`
- `design-qa.md`
- `artifacts/design-audit-node-list.png`
- `artifacts/design-qa/assets-comparison-final.png`
- `artifacts/design-qa/assets-implementation-final.png`
- `artifacts/design-qa/assets-source.png`
- `artifacts/design-qa/comparison.html`
- `artifacts/frameflow-aspect-ratio-4x5-final.png`
- `artifacts/frameflow-aspect-ratio-4x5-result.png`
- `artifacts/frameflow-aspect-ratio-attention-crop-preview.png`
- `artifacts/frameflow-aspect-ratio-top-crop-preview.png`
- `artifacts/frameflow-aspect-ratio-ui-safe-preview.png`
- `artifacts/frameflow-formal-feedback-source.png`
- `artifacts/frameflow-negative-feedback-result.png`
- `artifacts/frameflow-negative-loop-acceptance.md`
- `artifacts/frameflow-negative-sample-1.png`
- `artifacts/frameflow-negative-sample-2.png`
- `artifacts/frameflow-reference-e2e-result.png`

其中 `web/qa-fixtures/qa-99-image.svg` 是 README 明确说明的可丢弃测试夹具，不属于上述证据排除项；它应随 E2E/测试基础设施候选保留。其使用必须继续限定在隔离本地来源，不得触碰用户正常端口的本地数据。

### 4.3 忽略的缓存、构建物和运行日志

本次只读盘点还发现 Git 忽略的依赖目录、构建输出、TypeScript 增量信息、Playwright 最近运行状态和服务日志，包括：`canvas-agent/node_modules/`、`canvas-agent/dist/`、`canvas-agent/.tmp/`、`docs/node_modules/`、`docs/.next/`、`docs/.source/`、`docs/tsconfig.tsbuildinfo`、`web/node_modules/`、`web/dist/`、`web/test-results/`、`web/tsconfig.tsbuildinfo`、`web/.codex-*.log`、`artifacts/*.log`、`artifacts/runtime/*.log`。

这些内容不纳入源码检查点；它们仍留在原位置，未执行清理。`node_modules`、构建目录和日志中可能包含长路径或运行时状态，不应通过“整理”动作处理。

## 5. 可复现性与待决事项

- `HEAD` 缺少当前工作区实际引用的 `web/design-system/`、`web/e2e/`、`web/playwright.config.ts`、`web/scripts/`、`docs/scripts/`、`.github/workflows/quality.yml` 和 `web/qa-fixtures/`；因此当前工作区的测试/构建通过仍不能证明全新检出可复现。
- `web/package.json` 使用本地依赖 `@shared-ui/design-tokens: file:./design-system`，并且当前 CI 质量工作流使用 `npm ci`；`web/` 同时存在被修改的 `package-lock.json` 和 `bun.lock`。本次不删除任一锁文件，后续应由用户确认 Web 的规范包管理器和锁文件。
- `docs/` 的质量工作流明确使用 Bun 与 `docs/bun.lock`；`canvas-agent/` 的质量工作流使用 npm 与 `canvas-agent/package-lock.json`。
- `Dockerfile`、`docker-compose.yml` 及 Docker 文档存在已跟踪修改。它们作为用户修改被纳入“保留”范围，但 Docker 构建、Compose 和静态资源容器验收不属于本轮结论。
- 针对当前修改和未跟踪候选内容做了文件名与常见字面量的敏感信息扫描：未发现命名为 `.env`、`secrets` 或 `credentials` 的文件，也未识别出具体凭据字面量；发现的 `apiKey` 仅为组件状态字段引用，不是密钥值。该结果不是深度安全审计。

## 6. 本次实际执行和未执行事项

已执行：

- 完整读取本记录第 2 节列出的四份文档。
- 只读检查 Git 分支、差异、未跟踪文件、关键 `HEAD` 路径、忽略项、端口进程和 HTTP 状态。
- 只读执行 `git diff --check`。
- 新增本文件，记录本次对话详情以及各类文件的关联/用途。

未执行：

- 未 `git add`、未提交、未创建标签、未推送。
- 未 reset、checkout、clean、删除、移动、重命名或覆盖任何已有文件、未跟踪文件、真实资产或运行记录。
- 未安装依赖、构建、运行全套测试、启动新服务或执行浏览器人工闭环；没有把前一轮已有验证重复宣称为本轮验证。
- 未执行 Docker 或容器操作。

## 7. 下一道授权门

下一步只能在用户确认后进行：以第 4.1 节的代码/测试/工程/计划文档集合为候选，先制作可恢复检查点，再在隔离副本或全新检出中安装依赖并验证。第 4.2 节证据、4.3 节缓存/构建物/日志继续原位保留，不能在未授权时清理。

