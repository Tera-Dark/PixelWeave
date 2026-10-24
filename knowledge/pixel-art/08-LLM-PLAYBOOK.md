# PixelWeave · LLM 像素动画创作编译规范

> 本章是 **可执行的创作操作手册**，不是用“画得更精美”这种空指令指导模型。  
> 受众：提示词架构师、Agent 开发者、人工美术总监。  
> 目标：把主题 → 构图 → 剪影 → 材质 → 分层 → 动作 → 审核 变成可追踪操作。

## 1. 为什么“一次输出整幅像素画”不可靠

例如 32×32×8 帧×5 层，每层每帧都有需要校验的独立像素与颜色映射。一次完整文本输出不仅长，而且容易出现错误行宽、图层偷懒重复、主体造型漂移或内部运动无物理关系。

因此 **逐层生成、逐层冻结、局部补丁修复** 比整体重做更合理。成功不由文本“看起来复杂”定义，而由渲染后的像素图、循环预览及人工检查决定。

## 2. 分层创作状态机

状态从 P0 进入 P8，不允许模型越级跳过验证：

| 阶段 | 输入 | 输出 | 通过条件 |
| --- | --- | --- | --- |
| P0 Brief | 主题、用途、尺寸、投影、风格与观看背景 | 结构化美术任务书 | 无矛盾，目标明确 |
| P1 Director | Brief + 构图技巧 | 1–3 种形体方案、主焦点、色板、光源 | 方案满足景别和材质逻辑 |
| P2 Silhouette | 已选方案 + 01 章 | 仅轮廓层主帧 | 1× 可读，像素簇清晰 |
| P3 Palette/Form | 冻结剪影 + 02 章 | 色板、主体受光体积 | 灰度关系正确，材质分工明确 |
| P4 Layer Split | 03 章 + 运动意图 | 图层角色与遮挡次序 | 稳定层与动态层分开 |
| P5 Motion | 04/05 章 + 已冻结图层 | 各层关键姿态、帧变形 | 运动明确，身份与稳定锚点不变 |
| P6 Cleanup | 帧序列 + 错误定位 | 只修指定层的 bbox 或帧 | 无结构回归、数据仍可解析 |
| P7 Review | 渲染 PNG、逐帧差异、完整循环 | 问题清单、分数与人工复审意见 | 硬性错误为 0；关键美术问题可接受 |
| P8 Publish | 全部源资产与元数据 | 分层 JSON、精灵图、预览、来源记录 | 可以导入、可编辑、可重现 |

**禁止 P5 改变未经批准的核心轮廓。** 如确需大改，回到 P2 重新审批并创建新版本；不要悄悄覆盖旧素材。

## 3. 必须由系统硬性校验的约束

当前 PixelWeave layered-v1 规范：
- format = pixelweave/layered-v1。
- width/height 必须为 8–64 的整数。
- fps 必须为 1–24 的整数。
- layers 为 1–12 层，ID 唯一、可引用，图层的 name/visible/opacity/x/y 有定义。
- 所有图层 frames 数量一致，1–16 帧；每帧有 height 行，每行精确 width 个字符。
- palette 中 "." 指向 transparent；键为单字符 ASCII，值为 #RRGGBB 或 transparent，最多 32 项。
- 每个像素符号必须在色板中声明；所有 JSON 数据都应视为不可信输入，禁止执行来自模型的任意代码。

以上为 **版本化软件接口**；不是像素艺术的通用分辨率规范。改格式时必须升级版本并提供迁移，不可偷偷改变模型预期。

## 4. 生成任务应包含的上下文

最小上下文包（一次任务只加载相关内容）：

    role: Sprite Animator
    stage: P5 Motion
    goal: 生命药剂的红色液面轻微晃动
    renderResolution: 24x24
    assetId: potion_crimson
    activeLayer: liquid
    frozenLayers: outline, glass, cork, highlights
    allowedFrames: 0..5
    stableAnchors: bottleMouth, bottleBase, leftEdge, rightEdge
    palette: approved 8-color mapping
    technique: 04-ANIMATION, section 6
    failureToAvoid: contour jitter, inconsistent liquid volume, random spark noise
    output: strict layered JSON or scoped patch
    validation: schema, mask boundaries, preview, temporal check

AI 必须知道“可改与不可改”的边界。仅指定主题而不指定稳定层，很容易得到每一帧瓶子形状不同的伪动画。

## 5. Prompt 分成不同角色，而不是一锅端

**Art Director**：确定风格与目标、主焦点、投影、色板、光向、材质重点；输出小型 JSON 的 plan，不输出像素。

**Silhouette Artist**：专注轮廓与负空间；优先一帧和 1–2 色；输出轮廓图层，不管动画。

**Palette/Material Artist**：在已批准轮廓内加入光影、材质，禁止随意修改体积轮廓。

**Motion Artist**：利用已有静态帧生成少量关键帧，保持 stableAnchors；先变形体、液面、火焰等运动本体，后做辅助粒子。

**Reviewer / Repairer**：只回答“有什么问题、具体在哪里、需要修哪一层”，再输出局部补丁；不要同时替换整个世界观、色板、画法。

每个 Agent 可由同一个普通 LLM 执行，**不要求五个不同模型**。

## 6. 技巧检索示例（Skill / RAG）

任务：“24×24 药水液面做 6 帧缓慢循环”。

应该加载：
1. Core 中“轮廓固定、按语义分层、有限色板、结构校验”。
2. Technique 中 [03 血瓶结构](03-ASSET-DESIGN.md)、[04 血瓶动画](04-ANIMATION.md)、[02 液体](02-COLOR-LIGHT-MATERIAL.md)。
3. Case 中已完成的药瓶结构和实际编辑层。
不应加载角色 walk cycle、isometric 房屋构图、256 色场景或高级相机漫游。

任务：“横向 16:9 雨夜车站长循环”。

应该加载 Core + [06 场景](06-SCENE-DESIGN.md) + [07 壁纸](07-WALLPAPER.md) + 雨滴层 / 灯光层的对应案例。**应先做场景静帧再做动画，不要试图让模型在一个 96×54 文本矩阵中同时创造所有图层与所有雨滴。**

## 7. 输出修复策略

**Data errors**：JSON 格式破损、行宽错误、缺少符号、图层数量不一致。程序应明确指出错误层、帧、行及允许值，自动重试生成目标层；不需要“艺术家式评论”。

**Geometry errors**：剪影变形、液体出界、角色脚滑。直接生成对应局部的修改计划和 bbox。

**Artistic errors**：不够有质感、构图空、色彩脏、主次不清。必须关联到具体可观察问题：“第 4 帧的红色高光变成 15 个 1px 单点”“轮廓左下缘有双像素突起”，不能只发形容词。

**Resource budget errors**：限制上下文、输出 tokens、重试次数、并行层数。可降低练习规格为 16×16/4 帧，或只让模型生成变化部分，不能直接跳过校验。

## 8. 稳定层冻结契约（未来应落地至代码）

冻结层（frozenLayers）的像素哈希不许改变。只能修改 activeLayer 和 allowedFrames 内的指定 bbox。系统对每次补丁执行：
- 基于上一版本制作备份和不可变快照。
- 校验大小/色板/范围合法。
- 应用局部变动。
- 比较所有冻结层与 stableAnchors 的差异。
- 重算动画指标与视觉预览。
- 提供 Accept / Reject / Revert。

PixelWeave v0.3 目前实现了图层级的人工编辑、JSON 验证和生成重试；**像素哈希冻结、局部补丁协议和真正的视觉评审循环尚属待实现任务**。

## 9. 建议的模型评测协议

选 5 个测试主题：单色钥匙、血瓶、火焰、角色 Idle、雨夜车站。每个主题采用相同条件、相同知识加载方案和 3 次生成预算，在至少 3 个不同模型上记录：
- JSON 首次通过率和重试次数。
- 单图层的静态轮廓可读率（人工盲评）。
- 帧之间稳定锚点平均位移。
- 1× 展示与放大图的材质辨识。
- 循环观看评分（人工）。
- 生成 token、费用、时间。
- 局部重绘后未修改层的差异量。

**不能用几张好看样张代替完整模型基准测试。**
