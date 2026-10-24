# PixelWeave ✳ — LLM-native Layered Pixel Animation Studio

**Pixels with a pulse.** 开源像素动画工作站 + 在线作品展示站。**不使用 Diffusion、生图模型或图像 API**；生成动画资产时仅使用普通文本 LLM 返回的结构化像素数据，浏览器负责确定性绘制。

- **作品站（GitHub Pages）：** https://tera-dark.github.io/PixelWeave/
- **最新实验版本：** v0.3
- **状态：** 像素分层、逐帧编辑已具备；LLM 自动流程需本地启动 Node.js 代理并配置文本模型。作品画廊中的示例均为手工编程示范，不伪称 AI 生成。


## 📚 Pixel Art & Animation Handbook（新增独立知识库）

先有系统的美术知识和经验证的创作规则，再构建 LLM 绘画代理。PixelWeave 的独立知识库现已包括 **7 级模块化课程、10 项实践任务、27 条标注来源、LLM 分层创作工作流、分级质量验收、可机读的课程路由索引与可导入的血瓶练习资产**。

- **[从零开始阅读像素动画创作指南](knowledge/pixel-art/README.md)**
- [基础：像素与轮廓](knowledge/pixel-art/01-FOUNDATIONS.md) → [色彩材质](knowledge/pixel-art/02-COLOR-LIGHT-MATERIAL.md) → [道具结构](knowledge/pixel-art/03-ASSET-DESIGN.md)
- [动画原理](knowledge/pixel-art/04-ANIMATION.md) → [角色/特效](knowledge/pixel-art/05-CHARACTER-VFX.md) → [场景](knowledge/pixel-art/06-SCENE-DESIGN.md) → [动态壁纸](knowledge/pixel-art/07-WALLPAPER.md)
- [LLM 创作流程](knowledge/pixel-art/08-LLM-PLAYBOOK.md) / [艺术质量验收](knowledge/pixel-art/09-QUALITY-ASSURANCE.md) / [分阶段实战](knowledge/pixel-art/10-CURRICULUM.md)
- [教程来源与证据登记](knowledge/pixel-art/SOURCES.md) / [可机读知识路由](knowledge/pixel-art/manifest.json) / [分层药瓶练习工程](knowledge/pixel-art/examples/learning-potion.layered.json)

**状态说明**：知识库已整理、链接与示例进行程序测试；具体审美规范是可迭代实践建议，并非全行业的统一定理。当前知识库尚未自动注入线上 LLM 生成流程，接入时应使用 Core → Technique → Case 按需加载。

## 已经完成的主要功能

| 功能 | 说明 |
|---|---|
| Gallery | 5 件可播放像素资产，包括最新七图层、10 帧的 Crimson Atelier |
| Layer Stack | 选择/隐藏图层、重命名、透明度、X/Y 偏移、移动上下顺序、新建图层 |
| Pixel Editor | 根据有限色板在选定图层的指定帧绘制 / 擦除像素，撤销重做 |
| Timeline | 逐帧播放、暂停、调速、复制帧、删除帧、无缝循环预览 |
| Pixel Asset JSON | 完整分层 JSON 可导入/导出，严格验证画布、调色板、层数和帧数 |
| Export | PNG 当前帧、Spritesheet PNG、WebM 循环录制、工程 JSON |
| LLM Generator | 本地 OpenAI-compatible / Ollama 文本模型；先规划，再分别生成轮廓、主体色块、高光、动态特效四层，每层最多三次数据修复重试 |
| Static Pages | 不配模型也能查看、手工编辑、导入 LLM JSON、导出资产 |
| Persistence | localStorage 保存到当前浏览器；作品不会自动上传公开画廊 |

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
