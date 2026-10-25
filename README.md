# PixelWeave ✳ — LLM-native Layered Pixel Animation Studio

**Pixels with a pulse.** 开源像素动画工作站 + 在线作品展示站。**不使用 Diffusion、生图模型或图像 API**；生成动画资产时仅使用普通文本 LLM 返回的结构化像素数据，浏览器负责确定性绘制。

- **作品站（GitHub Pages）：** https://tera-dark.github.io/PixelWeave/
- **最新实验版本：** v0.6 — Pixel UI / Native Layer Focus
- **状态：** 画廊只展示一件文本模型原生编写整数像素结构的药瓶（64×64、11 层、12 帧）；无生图、抠图或像素化源图片。该案例尚在人工审美评审中。通用 LLM 自动流程仍需本地启动 Node.js 代理并配置文本模型。


## 工程审查与 P0/P1 修复 · 2026-10-25

**[阅读全面审查、实际修复清单及后续优先级](docs/AUDIT-2026-10-25.md)**

对照 [Aseprite](https://www.aseprite.org/docs/animation)、[Pixelorama](https://github.com/Orama-Interactive/Pixelorama)、[Piskel](https://www.piskelapp.com/) 和 [Lospec](https://lospec.com/palette-list) 审查了 PixelWeave 的编辑、动画、保存、安全、性能和研究参考工作流。

本轮落地：补上本地分层项目的真正恢复流程；本地模型代理的 Host/Origin/Fetch Metadata 校验及静态敏感文件阻断；斜向图层展开缓存与离屏暂停、最大间距完整展示；上一帧洋葱皮辅助；有效画笔颜色和像素网格同步；外站图片导致 Canvas 不可读取后，本地导入的恢复机制及异步加载竞态修复。

**不修改已经获准的药瓶原始画稿，不引入图片生成或扣图，不添加第二件正式资产。** 核心工程仍缺成熟的 cel 时间轴、画笔工具、逐帧时长和完整浏览器端到端测试。详见上方报告。

## 布局与效率重构 v0.7

不改变当前唯一药瓶的像素画面，针对日常创作/研究的高频操作重新组织网站：

- **动画参考库**改为左侧素材列表、中间播放器与帧缩略图、右侧笔记/版权标签的三栏研究工作台。侧栏可独立收起，手机改为纵向布局。
- **常用入口前置**：即时搜索、排序、收藏筛选、随机复习、逐帧快捷键；记住上次浏览的参考条目和研究侧栏状态。
- **Studio** 将画布和时间轴放在第一优先级，LLM 辅助工具默认折叠；顶部一键进入图层斜向展开。画廊首屏也缩短，减少对单个资产的重复展示成本。
- 保留源站授权、用户笔记（浏览器本地）和素材隔离规则；不自动添加第三方作品或模型训练数据。

[立即使用紧凑参考库](https://tera-dark.github.io/PixelWeave/references/) · [打开紧凑工作站](https://tera-dark.github.io/PixelWeave/#studio) · [查看信息架构与改造说明](docs/UX-REDESIGN-V07.md)

## 新功能：Animation Atlas / 像素动画参考档案室

[进入 GitHub Pages 动画参考档案室](https://tera-dark.github.io/PixelWeave/references/) · [素材作者、授权与技术说明](docs/REFERENCE-ATLAS.md)

独立于原创作品画廊，用来研究第三方像素动画的动作、材质、配色、关键帧和像素簇。首批人工整理 **10 件作品与研究资料**，每条标注创作者、来源、许可和有针对性的学习问题，其中 **4 件可以直接按原作者的精灵表/独立图片逐帧播放**。其他案例仅链接原站，绝不宣称成品由 PixelWeave 制作。

可操作功能：按技法筛选、搜索、收藏和随机复习；逐帧/慢放/洋葱皮/帧差分；浏览器本地导入有合法来源的 PNG/WebP 精灵表并调整行列；每件作品的笔记保存于浏览器本地。外站可能禁止像素级跨域读取，此时会禁用帧差分并提示本地导入。不会将外部素材自动作为 AI 训练集或加入正式创作作品。

## 最新：Pixel UI v0.6 + 独立图层观察器（前版）

本轮专注于编辑体验：**不更改药瓶动画**，重新统一画廊、创作工作站、时间轴、工具、导航、图层面板及教学实验室的像素风 UI。使用低噪点深色像素网格、硬边界和有限强调色，而非依赖图片素材或粗糙的 8-bit 装饰。

- [在 Pages 打开图层工作站](https://tera-dark.github.io/PixelWeave/#studio)
- 斜向展开图与主时间轴同步；**点击任何板块即可选中图层**。
- 同区域新增独立的**选中图层预览**：自适应整数放大 / 原画布视图、透明网格切换、图层尺寸与像素数量显示。
- 当前帧选中图层可以**原始尺寸、透明背景 PNG** 独立导出，保持可编辑像素数据与展示一致。
- [教学实验室](https://tera-dark.github.io/PixelWeave/knowledge/pixel-art/lab.html) 现在也只展示当前原生药瓶，其余被否决的试作品不再出现在正式展示中。
- 样式入口：`src/pixel-ui.css`；渲染核心：`src/layer-focus.js`；使用规范：[UI/UX Pixel Design System](docs/PIXEL-UI-SYSTEM.md)。

旧版 V2 示例仍保留在 Git 提交历史及教学研究资料里，以便追溯制作过程，**不应误解为本轮正式画廊内容**。

## 最新美术研究：暮烬遗物 / Ashen Reliquary（可选）

在确认以 The Game Kitchen 的《Blasphemous》为研究起点后，PixelWeave 提炼了一套原创的「**暮烬遗物**」美术方法，**不复制**原作的可识别角色、像素纹理或宗教图像。它强调从功能/身世设计轮廓、针对材质组织高光、克制的焦点与有物理原因的微动画。

- [阅读一手制作流程与动画师访谈研究](knowledge/pixel-art/studies/BLASPHEMOUS-CASE-STUDY.md)
- [暮烬遗物 · 完整艺术风格与制作关卡](knowledge/pixel-art/styles/ASHEN-RELIQUARY.md)
- [六件现有 v2 资产的针对性审美复盘](knowledge/pixel-art/studies/V2-ASSET-CRITIQUE.md)
- [机器可读的风格规范](knowledge/pixel-art/styles/ashen-reliquary.json)

本地 Studio 已新增**美术方向（可选）**下拉菜单，选择后才会在文本 LLM 的分层创作阶段注入相应指引。不选时继续使用通用流程。**研究阶段不等于真实模型审美 A/B 已验证**；当前仅继续改进已经单独试制的药瓶；其他素材不进入正式展示，待用户批准后再制作下一件。

## Gallery 美术升级 · Original Art Studies v2

**本节是已归档的 v2 历史研究记录**，不是当前在线画廊说明。六件 32×32 教学样品均未获得审美通过，现已全部退出公开画廊。六件作品皆为**代码手工构图与分层制作，不是 LLM 实测产物**。

- [六件作品的实际数据渲染静帧总览](knowledge/pixel-art/visuals/studies-v2-contact.svg)
- [美术基调与每件作品的形体/材质/动作逻辑](knowledge/pixel-art/ART-DIRECTION-V2.md)
- [六个新版 32px 分层工程](knowledge/pixel-art/examples/reference/README.md)

## 📚 Pixel Art & Animation Handbook（新增独立知识库）

先有系统的美术知识和经验证的创作规则，再构建 LLM 绘画代理。PixelWeave 的独立知识库现已包括 **7 级模块化课程、10 项实践任务、27 条标注来源、LLM 分层创作工作流、分级质量验收、可机读的课程路由索引与可导入的血瓶练习资产**。

- **[进入交互式像素教学实验室：当前唯一的原生药瓶练习](knowledge/pixel-art/lab.html)**
- **[完整独立合订版：像素艺术与动画创作指南](knowledge/pixel-art/PIXEL-ART-ANIMATION-GUIDE.md)**
- [分章检索与教学入口](knowledge/pixel-art/README.md)
- [基础：像素与轮廓](knowledge/pixel-art/01-FOUNDATIONS.md) → [色彩材质](knowledge/pixel-art/02-COLOR-LIGHT-MATERIAL.md) → [道具结构](knowledge/pixel-art/03-ASSET-DESIGN.md)
- [动画原理](knowledge/pixel-art/04-ANIMATION.md) → [角色/特效](knowledge/pixel-art/05-CHARACTER-VFX.md) → [场景](knowledge/pixel-art/06-SCENE-DESIGN.md) → [动态壁纸](knowledge/pixel-art/07-WALLPAPER.md)
- [LLM 创作流程](knowledge/pixel-art/08-LLM-PLAYBOOK.md) / [艺术质量验收](knowledge/pixel-art/09-QUALITY-ASSURANCE.md) / [分阶段实战](knowledge/pixel-art/10-CURRICULUM.md)
- [L0 轮廓逐像素跟练](knowledge/pixel-art/labs/01-PIXEL-CLUSTERS.md) / [L1 材质光照](knowledge/pixel-art/labs/02-MATERIAL-LIGHT.md) / [L2 八帧周期](knowledge/pixel-art/labs/03-ANIMATION-CYCLES.md)
- [六件可编辑原创案例](knowledge/pixel-art/examples/reference/README.md) / [知识规则表](knowledge/pixel-art/rules.json)
- [教程来源与证据登记](knowledge/pixel-art/SOURCES.md) / [可机读知识路由](knowledge/pixel-art/manifest.json) / [分层药瓶练习工程](knowledge/pixel-art/examples/learning-potion.layered.json)

**状态说明**：知识库已整理、链接与示例进行程序测试；具体审美规范是可迭代实践建议，并非全行业的统一定理。按需检索已接入本地文本 LLM 生成流程；公开静态 Pages 不包含云端密钥和自动模型调用。

## 已经完成的主要功能

| 功能 | 说明 |
|---|---|
| Gallery | **1 件**待审美确认的原生药瓶，64×64 / 11 层 / 12 帧；其他历史样例退出画廊 |
| Layer Stack | 选择/隐藏图层、重命名、透明度、X/Y 偏移、移动顺序、新建图层；斜向展开实时交互 |
| Pixel Editor | 根据有限色板在选定图层指定帧绘制 / 擦除像素，撤销重做；选中图层独立放大与透明导出 |
| Pixel UI | 独立 CSS 主题覆盖整个站点与教学实验室，像素边界、统一色板、明确交互状态、响应式布局 |
| Timeline | 逐帧播放、暂停、调速、复制帧、删除帧、无缝循环预览 |
| Pixel Asset JSON | 完整分层 JSON 可导入/导出，严格验证画布、调色板、层数和帧数 |
| Export | PNG 当前帧、Spritesheet PNG、WebM 循环录制、工程 JSON |
| LLM Generator | 本地 OpenAI-compatible / Ollama 文本模型；先规划，再分别生成轮廓、主体色块、高光、动态特效四层，每层最多三次数据修复重试 |
| Static Pages | 不配模型也能查看、手工编辑、导入 LLM JSON、导出资产 |
| Persistence | localStorage 保存到当前浏览器；作品不会自动上传公开画廊 |

## 知识加载、局部重绘与真实模型对照测试

文本模型现在会按关键词与阶段检索 [知识规则表](knowledge/pixel-art/rules.json)，附带规则 ID 与技术章节摘要；生成结果中的知识命中记录可用于检查是否发生无关知识污染。

本地 Studio 里选中一个分层资产和帧之后，可以输入改画要求，并填写可选像素范围，然后使用“LLM 只重绘当前图层”。后端只接受结构化像素 Patch，冻结其他层和未授权帧并在应用前校验。不满足条件的模型回复会被拒绝，不会覆盖资产。

在仓库执行 node tools/benchmark-knowledge.mjs 可以查看 [知识启用/停用对照](docs/KNOWLEDGE-UPGRADE-REPORT.md) 的计划。真正调用模型需要明确提供 --run；该脚本可能消耗收费 API 额度。自动数据检测**不能证明审美质量提升**，需要盲评。

## Windows：连接 Ollama 或兼容模型 API

需要 Node.js 20+。从仓库下载源码，在 PowerShell 中执行：

~~~powershell
# 方案 A：本地 Ollama / OpenAI-compatible 模型服务
$env:PIXELWEAVE_API_BASE="http://127.0.0.1:11434/v1"
$env:PIXELWEAVE_MODEL="你已经安装的模型名称"
$env:PIXELWEAVE_API_KEY="ollama"
npm run dev
~~~

浏览器打开 http://127.0.0.1:4173/#studio，出现 **已连接本地模型代理** 后输入描述并点击“使用本地 LLM 生成”。模型需支持足够长的 JSON 输出和约 12000 output tokens；小模型可能频繁格式错误，生成效果需要按实际模型测试。

~~~powershell
# 方案 B：支持 /v1/chat/completions 的远程文本 API
$env:PIXELWEAVE_API_BASE="https://你的兼容API域名/v1"
$env:PIXELWEAVE_MODEL="模型名"
$env:PIXELWEAVE_API_KEY="你的API密钥"
npm run dev
~~~

**安全说明：** API 密钥仅保存在本地 Node 进程环境变量里，不写入 GitHub Pages、localStorage 或浏览器代码；Node 服务仅监听 127.0.0.1。请不要把 API 密钥提交进仓库。无需账户或 GPU 即可使用手工编辑和静态作品站。

## GitHub Pages 模式

公开静态网页无法安全地使用服务器端密钥，因此“使用本地 LLM 生成”按钮将不可用。仍然可以：

1. 在 Studio 里输入绘画需求，选择“复制 LLM 绘图规范”。
2. 将规范粘贴给任意文本 LLM，复制返回的 JSON。
3. 在 Studio 选择“导入 JSON”，粘贴结果，验证后即获得可逐层编辑的动画资产。

如果在本地运行且配置了模型，以上流程由 Node 代理自动完成。默认使用 **Progressive 分层生成模式**（Director → 轮廓 → 色块 → 高光 → 特效）；也可设置 PowerShell 环境变量 `$env:PIXELWEAVE_PIPELINE="oneshot"` 使用旧版一次性完整 JSON 生成模式。

## PixelWeave Layered Format v1

基础数据结构（下面不是完整帧，仅说明字段）：

~~~json
{
  "format":"pixelweave/layered-v1",
  "name":"Crimson Vial",
  "width":16,"height":16,"fps":8,
  "palette":{".":"transparent","K":"#231d31","R":"#c64d64"},
  "layers":[
    {"id":"silhouette","name":"轮廓","visible":true,"opacity":1,"x":0,"y":0,"frames":[["...16 characters × 16 rows..."]]},
    {"id":"fill","name":"上色","visible":true,"opacity":1,"x":0,"y":0,"frames":[["..."]]}
  ]
}
~~~

实际帧每行必须正好是 width 个调色板字符，每帧恰好 height 行，各图层帧数相同。支持 8–64px、1–16 帧、1–12 层、最多 32 个含透明色在内的调色板颜色。复杂内容应分拆为多个小资产，而非一次性让 LLM 输出几十万个像素。

## 开发与测试

~~~bash
npm run dev
npm test
~~~

代码路径：
- `src/layered.js`：分层协议、像素编译与帧操作、手绘示例。
- `src/llm.js`：美术指导 Prompt、分层绘图 Prompt、检修 Prompt、画面诊断。
- `src/generator.mjs`：模型请求、规划 → 绘制 → 失败自动修复。
- `src/main.js`：作品画廊与像素工作站 UI。
- `dev-server.mjs`：仅监听本地的 LLM API 代理与静态文件服务器。
- `docs/ARCHITECTURE.md`：详细架构；`docs/ROADMAP.md`：未完成阶段。

## 尚未实现

自动美术反馈的多轮局部重绘、可视化图层混合模式、选框/填充、角色骨骼/动作系统、复杂场景合成、Lively Wallpaper 发布、公开云端作品库。当前自动生成阶段仍是 **文本 LLM 驱动的实验实现**，没有针对特定商业模型做真实质量基准测试。

MIT License.
