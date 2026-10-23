# PixelWeave v0.3 架构

产品同时包含 **Gallery 作品展台** 与 **Studio 人类可操作的编辑工作台**。所有绘制完全基于普通文本模型、结构化像素矩阵和 Canvas 2D，不依赖图像生成模型。

## 七层分工
1. **Brief / Art Director**：自然语言理解，风格、构图、色板和动效设定。
2. **Pixel DSL / Schema**：版本化的 `pixelweave/layered-v1`，严格验证 JSON 且从不执行 LLM 产出的代码。
3. **Layer / Asset Forge**：每个图层维护独立的矩阵与动画帧；当前支持 1–12 层、最多 16 帧。
4. **Renderer**：浏览器 Canvas 2D 整数像素逐层合成；所有帧可以通过索引重现。
5. **Motion**：各层逐帧素材、帧复制/删除、播放/暂停、帧率调整。
6. **Inspector / Editor**：图层层级、可见性、透明度、移动与色板像素编辑、撤销重做。
7. **Export / Gallery**：保留分层 JSON + 合成 PNG / Sprite Sheet / WebM；展示站与工作站共用渲染器。

## 模型调用工作流

浏览器 Studio
→ POST /api/generate（仅开发服务器）
→ 文本 LLM 做美术规划（失败可跳过）
→ 文本 LLM 按 DSL 生成 16×16、四层、四帧的结构化结果
→ Schema 验证、色板校验、动画帧覆盖/变化率/循环断点诊断
→ 格式失败时最多两次修复重试
→ 浏览器收到 JSON 并装载资产
→ 允许人工逐层/逐帧修画，导出完整资产

Pages 是完全静态网站，只支持人工复制 Prompt 和导入 JSON。密钥从不进入前端仓库，API 代理只监听 127.0.0.1。

## 模块

- `src/layered.js`: schema + renderer + editor transforms + 7-layer sample.
- `src/llm.js`: prompts + JSON extraction + heuristic quality metrics.
- `src/generator.mjs`: transport, planner, generator, validation + retry.
- `src/engine.js`: compatibility renderer for v0.2 procedural and legacy matrix assets.
- `src/main.js`: Studio and Gallery, editing/persistence/exports.
- `dev-server.mjs`: local static web + server-side /api/generate.

## 限制与下一轮

- 当前“导演/生成”是文本内容上的两步调用，不是经过视觉模型评分的美术智能体。
- 自动修复主要针对 JSON 结构、尺寸、色板；视觉诊断仅作提示，目前不会自动迭代审美细节。
- 内置 Gallery 作品全是由程序人工设计的示例，不能当作 LLM 的实测出图质量。
- 隐藏图层不改变原始像素矩阵；删除或修改色板键需要未来加入迁移机制。
