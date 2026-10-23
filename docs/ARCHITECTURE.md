# PixelWeave 技术架构

## 双重产品形态

1. Gallery：面向访客的公开作品站，零配置、循环动画、点击直达工作站。
2. Studio：面向创作者的在线工作站，统一使用同一批资产渲染器，拥有时间轴、局部手工覆写、导出与本地保存。

## 系统分层

- Presentation：index.html / src/style.css — 响应式画廊与创作台。
- Interaction：src/main.js — 选中资产、时间轴、画笔、导入与导出。
- Asset Renderer：src/engine.js — 根据 frame index 执行 Canvas 整数像素绘制、确定性循环。
- Asset Schema：src/engine.js — LLM 输出的色板与像素矩阵严格检查。
- Persist & Export：浏览器 localStorage、PNG / Sprite Sheet / WebM / JSON。
- LLM Orchestration：当前为手动复制提示词与 JSON 导入，自动化尚未实现。
- Scene Compositor：尚未实现。
- Wallpaper Pipeline：尚未实现。

## 原则

- 纯文本 LLM + 绘制代码，绝不依赖 Diffusion 模型。
- 严格把美术描述与可执行代码分开，LLM 输出必须先通过 JSON Schema 校验。
- 优先高质量小资产，然后组合成场景。
- 不信任 LLM 生成的脚本；不在公共静态网站内存储或转发 API Key。
- 高层可以自由使用 LLM，美术图层和帧动画必须可预览、可编辑、可复用。
- Demo 必须诚实标明是手工编程案例，不冒充 LLM 生成结果。

## 下一步拟拆分

src/core：asset-schema、pixel-dsl、palette、animation、compositor
src/agents：art-director、sprite-maker、motion-maker、art-critic
src/exporters：sprite-sheet、webm、apng、lively-wallpaper
src/gallery：作品元数据、展示素材与版本
src/studio：资产编辑、时间轴、图层控制、命令历史

MVP 保持最小依赖，下一步重构应保持现有导入与导出的兼容性。
