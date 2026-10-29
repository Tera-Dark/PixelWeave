# PixelWeave 界面系统

界面采用浅色像素创作桌面：白色与柔和渐变承载工具，草地、泥土和天空色点缀原创像素场景；文字和控件以可读性为先，像素效果主要用于作品与场景。

## 样式边界

- `src/site-base.css` 和 `src/site-nav.css` 提供基础页面与共享导航。
- `src/workspace-refresh.css` 提供跨页面布局与工作区组件；`src/world-theme.css` 管理共享颜色、背景和导航。
- `src/world-home.css`、`src/world-pixelize.css`、`src/world-research.css` 分别覆盖主站、图片工具、参考和学习页。旧页面样式目前仍承担部分布局，不应在单个页面复制全站导航或颜色规则。
- 图片和动画 Canvas 使用最近邻展示原生像素；纯装饰场景使用 `src/world-scene.mjs`，可离屏停止并遵循 `prefers-reduced-motion`。

## 工作流

首页将图片像素化、动画工作站、参考图鉴和学习实验室作为直接入口，保留唯一原创药瓶动画。图片工具默认滑动对比，可切换并排；导出位于结果旁，手动网格与颜色清理按需展开。Studio 仍以画布、图层和时间轴为中心。

## 响应与访问性

导航在窄屏横向滚动，图片工具在移动端按导入、恢复、预览、导出排列。保留原生按钮、label、焦点样式及对比滑杆的键盘支持。实际作品的比例和原生导出不应随容器拉伸。

自动测试验证布局与交互，不代替真实触屏、跨浏览器和人工审美评审。


## 像素田野工坊（当前视觉方向）

参考 [Stardew Valley 官方场景](https://www.stardewvalley.net/media/) 的自然色和生活气息，以及 [模组 Wiki 的像素图制作说明](https://stardewmodding.wiki.gg/wiki/How_to_make_pixel_art) 中的有限色彩与像素处理。只借鉴抽象原则，不使用或描摹其游戏素材、角色、标志、字体或具体界面布局。

`src/meadow-theme.css` 是跨页面的最后一层主题：深棕文字、奶油纸、浅木边框、苔绿选中态和浅天空背景。画布保留中性色透明棋盘，避免暖色主题影响色彩判断。首页 `assets/pixel-world/` 的工具图标以及 `src/world-scene.mjs` 的庭院、围栏与植物由项目独立绘制；继续保持清晰的焦点、禁用态和减少动态设置。

创作规范及来源整理在项目技能 `.agents/skills/pixel-world-art-direction/`；新的图标优先以小尺寸整数坐标绘制，以最近邻方式展示。
