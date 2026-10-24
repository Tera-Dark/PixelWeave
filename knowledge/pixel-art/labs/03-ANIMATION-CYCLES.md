# L2 实验：从静帧到分层逐帧循环

来源：[Slynyrd Intro to Animation](https://www.slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation)、[Items](https://www.slynyrd.com/blog/2019/12/21/pixelblog-24-items)、[Aseprite Linked Cels](https://www.aseprite.org/docs/linked-cels/)。

## 案例 A：玻璃药水，8 帧，6 层

[打开原创 Scarlet Vial 工程](../examples/reference/scarlet-vial.layered.json)。

稳定层：shadow、glass、reflections、stopper；动态层：liquid、bubbles。稳定层应当在 8 帧中逐像素完全一致。

| 帧 | 液面偏移（逻辑像素） | 气泡 (x,y) | 事件 |
| --- | ---: | --- | --- |
| F0 | 0 | (12,18) | 已在液体内 |
| F1 | 0 | (12,17) | 上浮 |
| F2 | -1 | (12,16) | 上浮 |
| F3 | -1 | (12,15) | 上浮 |
| F4 | 0 | 无 | 到液面附近消散 |
| F5 | 0 | 无 | 休止 |
| F6 | +1 | 无 | 休止 |
| F7 | +1 | (12,19) | 底部新泡生成 |

F7 → F0 的气泡仅移动 1px，新的气泡出现由 F6→F7 表示；旧泡消失被解释为接近液面后破裂。气泡不应突然跑到瓶外。**这是一套教学动作设计，并非流体物理仿真。**

逐帧修改路线：先单独播放 liquid；再播放 bubbles；然后与静止玻璃合成；最后检查 F7→F0。故意在 F2 把气泡挪到 (12,10) 形成错误工程，用液体遮罩检查发现后修回 (12,16)。

## 案例 B：火焰与金属不可混为一个动态层

[提灯](../examples/reference/hearth-lantern.layered.json) · [独立火焰](../examples/reference/ember-flame.layered.json)。

固定炉芯/外框与动态火焰分开。先遮掉内核只看外焰的姿态，再加回内核、最后才加 sparks。不要让灯架每帧改变形状。主要节奏来自峰值、过渡、停留与回归，而不是无节制加帧。

## 案例 C：旗杆与布面

[Wind Banner 8 帧](../examples/reference/wind-banner.layered.json)：staff 完全不动，fabric 末端变化，folds 跟随面料弯曲。对比“固定杆正确版”和“杆子也每帧乱跳的错误版”，检查稳定锚点。

## 模型必须输出怎样的修复

修复请求必须指定图层 ID、准许修改帧、像素矩形区域、冻结图层。系统验收：数据无非法符号、冻结层逐像素一致、修改像素没有越过可修改区域。程序帧差只能报警，不能证明视觉美感；同一动作仍需在 1× 速度下人工观看 10 次。

**出口门槛**：静态结构稳定、动作语义明确、事件有诞生/持续/消散、首尾不突然闪烁、可以导出后回读完整 JSON。
