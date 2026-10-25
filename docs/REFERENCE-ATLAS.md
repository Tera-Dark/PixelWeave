# PixelWeave · 真人像素动画研究参考库

更新：2026-10-25  
网站：https://tera-dark.github.io/PixelWeave/references/

## 收录标准与用户问题

旧版将大量“链接到原站”的静态占位条目放在动画研究库里，导致用户进入后无真实动画可看、无法拆帧。现已废止这种做法：**主列表仅收录来自可核实创作者、明确授权、可读取实际原始帧的动画**。

本轮改为 7 件作品，均有 CC0 许可和 OpenGameArt 原始 PNG 作者文件，覆盖火焰、篝火、水面和角色动作。

## 实际收录的原创动画

| 作者 | 艺术家作品 | 帧数 | 研究主题 | 原作者来源 |
|---|---|---:|---|---|
| BenHickling | Animated Fire | 60 | 高帧率外焰与火核错相运动 | https://opengameart.org/content/animated-fire |
| crad | Campfire Animation | 8 | 8 张独立帧、固定木炭锚点 | https://opengameart.org/content/campfire-animation |
| ArlanTR | Campfire pixel art animated | 4 | 超低帧数的稳定循环 | https://opengameart.org/content/campfire-pixel-art-animated |
| i_rk_jain | Fire | 12 | 可水平拼接的火焰特效瓦片 | https://opengameart.org/content/fire-9 |
| InThePixel | Animated Water 16×16 | 4 | 水面微动画与平铺循环 | https://opengameart.org/content/animated-water-platformer-16x16 |
| ImogiaGames | Pixel Character 01 – Onur | 4 | 角色运动与重心变化；原图的指定四帧 | https://opengameart.org/content/pixel-character-01-onur |
| tbbk | pixel art skeleton | 4 | 32px 骷髅行走；原图的连续四帧 | https://opengameart.org/content/pixel-art-skeleton |

**所有作品均归相应作者所有；CC0 是创作者明确选择的开放许可，并非 PixelWeave 的原创作品。** Onur 作者也说明其作品基于 Frozenen 的 CC0 角色素材二次扩展。

## 如何保证不是“空占位”

1. `references/curation.json` 的 `pixelweave/reference-v2` 格式禁止 `external` / `source only` 条目。每个作品必须有真实原作者链接、可下载的原始 PNG 来源、准确帧数及网格。
2. GitHub Actions 运行 `scripts/build-reference-media.mjs`，从原作者网站取得 CC0 原始 PNG，验证 HTTP 响应、PNG 签名、像素尺寸和切帧网格。**并非 AI 生成、截图临摹、抠图、插值或二次改画。**
3. 经过验证的原始 PNG 文件进入 **部署产物** `/references/media/`，由 GitHub Pages 同源服务：避免作者网站禁止跨域读取导致逐帧差分不可用。每次构建本地存储原始源文件，不依赖运行时热链接。仓库的作者名单、原始下载网址与选择帧索引保持可审查。
4. `tests/e2e/real-references.mjs` 用真实 Chromium 对每件作品逐一点击，验证素材加载、声明帧数、前后帧的真实像素差异、洋葱皮/帧差分可读性和关键帧缩略图。**任何条目无法播放就阻止 GitHub Pages 部署。**
5. 仅在 Canvas 中播放原始作者帧，不会将其转为 PixelWeave 的原生分层 JSON 或导入个人作品画廊。

## 实际支持的交互

- 原生像素等比预览、播放/暂停、逐帧前后跳转、0.25/0.5/1/2 倍播放。
- 最多 12 个缩略关键帧、一键跳转、上一帧洋葱皮、真实 RGBA 帧差分（同源图片已验证）。
- 作者署名、CC0 授权、原作主页、个人研究笔记、收藏、筛选和随机复习。
- 本地导入 PNG/WebP 精灵表为可选扩展，用户素材不会自动上传服务器。

## 版权与性能边界

- 仅收录核验 CC0 的原始资源；其他版权所有项目可以作为另一个“文章阅读”目录，但**不得在动画主列表伪装为可播放作品**。
- 使用相对路径在 GH Pages 输出 CC0 原始资源。作者作品依然在来源面板明确署名；收录不等于代言。
- 如果原作者删除文件或上游站点在未来拒绝下载，**构建会失败并保留之前成功部署的版本**，而不是悄悄上线空白动画。
- 当前媒体依赖上游站点供每次部署时抓取验证，后续可将已校验源文件版本锁定到固定 SHA256，进一步减少可重复构建风险。
- 动画 FPS 是研究馆建议的演示速度，除非作者原站注明，否则不是原项目精确时序。
- 不使用上述作品训练模型，不把其当作 AI 生图提示词输出或项目原创。

新增作品必须先核对作者与许可、确认精灵表布局，运行媒体构建和浏览器逐帧测试。找不到实际可用的帧文件就不收录；宁缺毋滥。
