# PixelWeave 架构

PixelWeave 包含画廊、动画工作站、图片像素化、动画参考库和学习实验室。网站为静态前端；高质量网格恢复与可选文本模型代理只运行在本地 Node 服务。

## 页面与状态

- `src/site-nav.mjs` 是导航路由、分组及选中状态的唯一来源。画廊与 Studio 共用主页面并通过 hash 切换；其他功能有独立页面。
- `src/main.js` 管理画廊、Studio 的项目状态、持久化、编辑和导出；编辑数据使用 `pixelweave/layered-v1`。`src/layered.js` 校验数据并执行像素操作。
- `src/world-scene.mjs` 是首页装饰场景，首次进入画廊时按需加载；离屏、后台或系统要求减少动态效果时暂停。它不修改作品数据。
- 图片处理由 `src/pixelize.js` 管理界面与临时状态，纯数据运算在 `src/pixelize-core.mjs`。原图和结果支持滑动对比及并排显示。
- UI 基础样式为 `src/site-base.css` / `src/site-nav.css`；共享工作区布局为 `src/workspace-refresh.css`，浅色主题为 `src/world-theme.css`，页面差异分别在 `src/world-home.css`、`src/world-pixelize.css`、`src/world-research.css`。旧页面专用样式仍提供底层布局，详见 [界面系统](PIXEL-UI-SYSTEM.md)。

## 本地服务与图像恢复

`dev-server.mjs` 只监听 `127.0.0.1`，默认端口 4173；`PIXELWEAVE_PORT` 可指定端口。`src/local-request-guard.mjs` 对 Host、Origin、Fetch Metadata 及静态路径设限。

高质量恢复：浏览器选取图片 → 同源 `POST /api/pixel-fixer/restore` → `tools/pixel-fixer/service.mjs` 校验输入并管理单个 Python 进程 → `tools/pixel-fixer/restore.py` 调用所附 MIT 授权 Pixel Art Fixer → 返回原生 PNG → 浏览器预览与导出。`PIXELWEAVE_PYTHON` 可指定解释器。服务限制文件大小 20 MB、解码面积 1200 万像素、输出每边不超过 512 像素，并设置进程超时。文件不会发送到外网。

`GET /api/pixel-fixer/status` 表示本地服务提供该接口；依赖缺失会在运行恢复时反馈。GitHub Pages 是静态站点，不含 Python 服务，仍可使用浏览器内网格处理。

可选文本生成通过本地 `POST /api/generate` 和 `POST /api/refine` 调用配置的文本模型；Pages 可复制提示词并手动导入 JSON。模型配置与密钥仅存于本地环境。

## 验证与限制

- `npm test` 验证算法、路由、资源预算与服务边界；`tests/e2e/` 覆盖实际页面、编辑和恢复流程。
- `node scripts/build-reference-media.mjs` 取得并验证参考库的 CC0 原始素材；开发时需要先执行，Pages 构建也会执行。
- `layered-v1` 仍限 8–64px、最多 12 层和 16 帧；送入 Studio 时会降至最多 31 个实色。
- 网格恢复不能自动重画不一致的细节；审美、移动设备触控和跨浏览器效果仍需人工验证。


## 原尺寸素材工作台与数据安全

`pixelweave/project-v2` 使用 1–512 像素的 RGBA 帧，工作区保留原始输入、按内容哈希去重的 PNG 和不可变版本。逐帧上传完成后以预期版本提交，冲突或失败不清空当前画布；历史回退创建新版本。读取不存在的项目不创建目录。`pixelweave/backup-v2` 新增可选原始输入、分类、标签和处理来源字段，旧备份仍可读取；导入前先解码检查所有帧和来源。备份是当前快照，完整历史应备份整个工作目录。

当前帧和洋葱皮帧按需读取，干净帧缓存上限为 36（未保存帧不会被驱逐），绘制笔画在无洋葱皮时只重绘变更区域。像素与结构撤销共用约 96 MB 的历史预算。浏览器静态版没有本机目录 API，支持在本地内存中编辑并下载备份或 PNG。
