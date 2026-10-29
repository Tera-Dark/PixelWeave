# PixelWeave 协作约定

- 共享导航只在 `src/site-nav.mjs` 配置；所有页面使用 `data-pw-header`。
- 首页与 Studio 共用 `index.html` 和 `src/main.js`，保持 hash 导航、工作区状态及 `layered-v1` 兼容。
- 图片处理区分浏览器本地模式与仅本机可用的 Python 高质量恢复；不要把 `tools/` 或模型密钥打包进 Pages。
- 保持像素图最近邻导出、源图比例和原作者素材许可。参考库媒体先运行 `node scripts/build-reference-media.mjs`。
- 共享与页面主题样式边界、流程和启动说明见 `docs/ARCHITECTURE.md` 和 `docs/PIXEL-UI-SYSTEM.md`。
- 改动后运行 `npm test` 和相关 `tests/e2e/`；不要覆盖用户已有的素材、工程或未提交修改。
