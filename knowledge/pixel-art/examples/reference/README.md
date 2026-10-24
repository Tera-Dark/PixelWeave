# 原创分层像素教学案例库

六件 JSON 都由本项目手工编排代码生成，并通过自动数据校验；不使用 Diffusion，也不应误称为“真实 LLM 作品”或“经外部大师认证的高分样张”。

| 案例 | 重点 | 帧数 | 固定层 |
| --- | --- | ---: | --- |
| [readable-key](readable-key.layered.json) | 轮廓/负空间 | 1 | contour |
| [scarlet-vial](scarlet-vial.layered.json) | 玻璃与液面周期 | 8 | glass、stopper、shadow、reflections |
| [hearth-lantern](hearth-lantern.layered.json) | 金属 + 火焰 | 6 | frame、shadow |
| [prism-crystal](prism-crystal.layered.json) | 切面光影 | 6 | shape、facets |
| [wind-banner](wind-banner.layered.json) | 固定点/布料 | 8 | staff |
| [ember-flame](ember-flame.layered.json) | 外焰与内核节奏 | 8 | base |

每个工程可在 PixelWeave Studio 的“导入 JSON”中直接打开并编辑任意像素/帧。源码为 [tools/build-reference-assets.mjs](../../../../tools/build-reference-assets.mjs)。

**教学案例 ≠ 高级作品的最终审美真值**。尚缺外部专家审核、材质盲测、同任务多模型 A/B 生成和角色复杂动画实测。评价记录中必须注明 authoringMethod=code-authored, externalExpertReview=false。
