# PixelWeave / Animation Atlas · 动画参考档案室

入口：https://tera-dark.github.io/PixelWeave/references/

## 为什么把它与正式作品画廊分开？

用户要求**一件件验收自己生成的像素动画**。外部参考不能混进“原创作品”或自动化训练集，更不能因为取得免费许可就冒称 PixelWeave 制作。Atlas 是一套**手工策展、附来源和艺术观察问题**的研究目录，供用户随时回来观察。

## 当前功能

- 已核查来源的 10 条参考，4 个来自原作者源站的可播放逐帧示例，其余为源站研究入口。
- 领域筛选、全文检索、仅逐帧可播放、收藏过滤和随机复习一件。
- 原画 1:1 帧源 + 整数像素展示、暂停/前后帧、四档速度、最多 12 个帧缩略图。
- 洋葱皮（上一帧半透明叠加）；逐像素差分高亮（当浏览器可以合法读取源图像像素时）。
- 本地导入 PNG/WebP 精灵表：可调列数与行数，动态帧差分，纯浏览器处理，不上传服务器。
- 每件作品显示原作者、授权、主题、研究问题，并独立存储私人笔记和收藏（浏览器 localStorage）。
- **没有自动临摹、下载有版权图片、复制成项目资产或训练功能。**

## 许可证与真实技术限制

1. 首批包含两类来源：**CC0 许可的作品**及**版权所有、只能外链**的优秀商业作品。
2. 我们只通过作者原站的图片地址加载浏览器展示，仓库没有存放第三方动图或二进制内容。任何无法核对授权的作品不得自动托管。
3. CC0 允许再利用，但仍坚持保留原作者信息；引用来源不等于对原作者的认可或赞助。
4. Not Jam 明确表示其 CC0 作品不希望被用于 AI/ML，本库尊重其意见：**只放原站网址和研究问题**。
5. 跨站图片可能不允许读取像素数据（浏览器 CORS 安全机制），但通常仍可播放；遇到跨域错误，像素差分按钮会自动禁用并告知如何导入合法下载的本地原始精灵表。
6. 外部网址可能随时间失效，因此不可宣称全部源站将始终在线；提供源站按钮供用户直接查验。
7. FPS 是本参考库**研究用建议播放速度**，除非原站明确说明，否则不是作者作品的真实原始时序。

## 作品与已验证源网页

- BenHickling / Animated Fire / 64×64、60 帧、CC0：https://opengameart.org/content/animated-fire
- crad / Campfire Animation / 8 个独立 PNG、CC0：https://opengameart.org/content/campfire-animation
- ArlanTR / Campfire pixel art animated / CC0：https://opengameart.org/content/campfire-pixel-art-animated
- i_rk_jain / Fire / CC0：https://opengameart.org/content/fire-9
- Idylwild / Chromatic Campfires / 4 帧、16×16、CC0：https://opengameart.org/content/idylwilds-chromatic-campfires
- XLIVE99 / Animated Pixel Torch / 32×32、6 帧、CC0：https://opengameart.org/content/animated-pixel-torch
- Not Jam / Pixels / CC0；作者不认可 AI/ML 使用：https://not-jam.itch.io/pixels
- Zeenaz / Pixel Boy / CC0：https://zeenaz.itch.io/free-asset-pixel-boy-32x64-animation
- The Game Kitchen / Blasphemous 动画制作过程 / 版权所有：https://www.gameanim.com/2021/02/19/blasphemous-pixel-art-animation-time-lapses/
- Heart Machine / Hyper Light Drifter / 版权所有：https://www.heartmachine.com/hyper-light-drifter

## 迭代规则

由人工审核/用户批准的来源加入 curation.json，字段 id、title、author、group、license、url、mode、tags、question 不能省略。真实帧图片必须提供作者官方可直接访问的网址；若帧数、切帧网格无法确认，标记 external，不猜测。艺术价值高但不可重新分发的内容，应以 **external** 模式链接，不自动爬取或录制。

本库不会自动定时搜网或获取新的素材；新增条目需要人工核对艺术水准、证据和许可。未来可加入截图比较和带 bbox 的帧差诊断，但不得违背浏览器跨域限制或版权约束。
