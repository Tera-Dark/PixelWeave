# 全站导航架构与防回归规则

2026-10-25 — 修复主站、动画参考库、学习实验室之间菜单不一致的问题。

## 根因

此前三个页面分别在 HTML 中编写导航，菜单数量、名称、品牌样式、当前页面判断及跳转行为各有一套。更换 UI 时只更新了部分页面，因此出现截图中的导航项不对齐、缺失和视觉割裂。

## 唯一配置

- src/site-nav.mjs：唯一导航配置 SITE_SECTIONS，统一四项入口：作品画廊、创作工作站、动画参考库、学习实验室。
- src/site-nav.css：共享品牌、菜单、高亮、桌面和移动端排版样式，严格限定在 .pw-header 内。
- 全部页面只保留一个带 data-pw-header 的 header 占位；页面自身不得再复制一套全站导航链接。
- 每个入口脚本通过 mountSiteNavigation() 构建导航；syncSiteNavigation() 依据路径和 hash 计算唯一的 aria-current=page。
- 学习路线 / 完整指南属于学习实验室的上下文功能，移至该页工具栏，不混入全站主导航。

## 路径和 SPA 逻辑

- GitHub Pages 为 /PixelWeave/ 子路径，导航 URL 由模块的 import.meta.url + new URL() 生成。严禁写死根路径。
- Gallery / Studio 在主站保持无刷新切换，使用 history.pushState 保存历史，back/forward/popstate 正确恢复选中状态。
- 跨页面导航使用正常链接，各页均可直接输入地址访问。
- 小屏将导航放在独立可横向滚动的菜单行，避免整页因导航宽度溢出。

## 自动化门禁

- tests/site-navigation.test.mjs：校验全站四项配置、主入口路径、每个 HTML 只有一个共享导航占位且不存在第二份主菜单。
- tests/e2e/navigation.mjs：真实 Chromium 分别访问 Gallery、Studio、Atlas、Lab；验证选中项唯一、路径有效、历史前进/后退、跨页面高亮一致。
- 使用 1440/768/390/320 像素视口检查导航宽度、是否可达、是否出现整页水平溢出。
- GitHub Actions 在所有测试通过后才部署 Pages，后续导航回归会阻断发布。

## 后续添加页面

只修改 src/site-nav.mjs 的 SITE_SECTIONS，并给新页面引入共享 CSS 与共享 mount，再更新 currentSection 判定和测试。禁止在单独页面手写新的全站菜单项，以免重新产生代码分叉。

## 边界

本项目当前全站导航由 JavaScript 挂载，没有 JavaScript 的浏览器无法显示导航。当前创作、参考和学习交互同样需要 JS。如果将来要求无脚本也有导航，应从同一份数据进行构建时预渲染，而非恢复多处手写菜单。
