# PixelWeave v1.1 知识库整改与验证报告

> 2026-10-24。目标是修复初版自评 61/100 中的三个重点短板：**可视化教学不足、缺少可编辑案例、LLM 生成规范无法真正执行**。本报告只记录交付能力、验证方式与尚未完成的质量证据；不凭开发者自评制造新的高分。

## 一、交付物一览

| 优先级 | 原始缺陷 | 已交付 | 仍然不足 |
| --- | --- | --- | --- |
| P0.1 图文教学 | 只有术语，没有错/对实例与操作 | 4 组原创可放大的 SVG 正反例；3 个 L0/L1/L2 实验章节，写明修复流程和验收 | 缺少专业画师对每个图例进行外部审阅与多版本迭代 |
| P0.2 案例资产 | 只有一个血瓶，且气泡错位 | 六个 16–24px 可拆层的原创 JSON；重现代码；一套浏览器教学实验室；静态层、气泡位置回归测试 | 尚未达到商业美术标准，也尚未覆盖角色复杂动作 |
| P0.3 LLM 规范 | 只有 Prompt 概念，模型不会定向检索 | 规则集 rules.json；知识阶段检索器；真实生效的分阶段提示词注入；图层/帧/矩形局部补丁；拒绝越权写入；mock-model 测试 | 尚无大量真实模型 A/B，无法断言审美质量显著提升 |

## 二、真实访问

- [网页视觉教学实验室](https://tera-dark.github.io/PixelWeave/knowledge/pixel-art/lab.html)
- [像素艺术知识库入口](../knowledge/pixel-art/README.md)
- [L0 轮廓/簇逐像素实验](../knowledge/pixel-art/labs/01-PIXEL-CLUSTERS.md)
- [L1 受光/材质实验](../knowledge/pixel-art/labs/02-MATERIAL-LIGHT.md)
- [L2 分层逐帧实验](../knowledge/pixel-art/labs/03-ANIMATION-CYCLES.md)
- [六个 JSON 参考工程](../knowledge/pixel-art/examples/reference/README.md)
- [规则索引](../knowledge/pixel-art/rules.json)

## 三、机器验证涵盖哪些事实？

自动测试能验证：
1. 所有示例能按固定构建脚本可重复生成，符合 layered-v1 的网格、色板、图层与帧结构。
2. 对应静止层在每一帧逐像素完全相同。
3. 血瓶气泡在可检查的案例内与液体帧占用区域保持叠合；故意错误样本被识别出来。
4. 根据药水、金属、旗帜等题材选择的规则不同，不是同一套长 Prompt 到处复制。
5. 局部补丁只会变更指定图层/指定帧/指定 bbox；未授权符号、重复坐标、越界编辑均被拒绝。
6. 生成和补丁链路通过模拟 OpenAI-compatible 文本模型的失败/修复情景。

自动测试 **不能证明**：漂亮、有趣、专业材质、可靠肢体动作、真实 60 秒壁纸观看质量、比某个大模型画得更好。参考资产是项目代码手工制作，不是语言模型实际测试输出，更不能归因到知识注入。

## 四、真正的模型 A/B 对照如何做？

已提供 [tools/benchmark-knowledge.mjs](../tools/benchmark-knowledge.mjs)。

第一次只执行：

    node tools/benchmark-knowledge.mjs

这属于 dry run，不请求模型。确认好模型与 API 消耗预算后，再运行：

    # PowerShell
    $env:PIXELWEAVE_API_BASE="http://127.0.0.1:11434/v1"
    $env:PIXELWEAVE_MODEL="模型的真实名称"
    node tools/benchmark-knowledge.mjs --run --case=potion

每个题目跑知识关闭/启用两种条件；尽量固定模型、温度、提示词、帧规格和生成预算，最好多次交叉执行不同顺序，避免时间、缓存和随机性带来混淆。采集：
- JSON schema 首次成功率和总失败次数。
- 静态图层抖动与气泡越界警告。
- 相邻帧变化率与首尾接缝警告。
- Token、耗时、模型 API 实际费用（目前 token/费用未自动采集，须另行接入 provider usage）。
- 1× 人类匿名辨识、材质、动作、循环评分（脚本故意留空，等待外部评审）。

**运行可能产生云端 API 费用，因此命令必须显式带 --run；CI 不会自动运行模型评测。**

## 五、三层知识、严格分类

- Core：像素簇、轮廓、色板、结构化数据合法性。
- Technique：依据 brief 和阶段匹配来源规则（例如 bubble lifecycle 只针对药水动态）。
- Case：原创资产和经过归档的改前/改后实例，用于演示与回归。
- Rules 拆为 hard / diagnostic / advice；能够被代码强制实现的限制与仅能提醒的美术原理不能混称。
- 任何网络提供的外部教程均不直接作为代码执行，只记录链接、短摘要和溯源。

## 六、剩余必须攻克的问题

1. **图例审美仍需专业画师审阅**：目前 SVG 为教学示意，不能用它们冒充精品像素画。
2. **缺真正的遮罩模型**：目前验证 bubble 是否叠在 liquid 内，但“液体被玻璃完整包围”的复杂非矩形几何约束需要 mask 语义扩展。
3. **角色与场景知识尚浅**：高级角色形变与演出、真实背景视差、壁纸长期循环，还没有对应的完整 visual ground-truth。
4. **模型输出成本与成功率未形成经验数据**：真正调用 Opus/GPT/Qwen 前，不得宣称哪一种效果更好。
5. **浏览器人工交互还需额外用户实测**：CI 可以验证源码、文档和数据，但不能取代不同设备的 UX 检查。

## 七、来源与归属

本轮经过重新对照的重点资料：[Pixel Joint 的像素簇与常见问题](https://pixeljoint.com/forum/forum_posts.asp?TID=11299)、[Slynyrd Items](https://www.slynyrd.com/blog/2019/12/21/pixelblog-24-items)、[Slynyrd Intro Animation](https://www.slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)、[Aseprite Linked Cels](https://www.aseprite.org/docs/linked-cels/)。

所有本地示意图、参考资产、程序均为 PixelWeave 原创，不转载教程图；所有 benchmark 结果必须标记 modelId / authoredBy / reviewedBy / ratingStatus。

**暂不重新给整个教程打 90 分。** 软件完善度和艺术教学成熟度必须通过真实用户与专业审阅分开评估。
