# PixelWeave ✳

**Pixels with a pulse.** 既是动画作品展示站，也是在线像素资产创作工作站。

**网站地址（启用 Pages 后）：** https://tera-dark.github.io/PixelWeave/

## v0.2 MVP 已具备

- Gallery：四件可循环的真实 Canvas 像素动画：Scarlet Remedy 生命药水、Moonwater Elixir 法力药水、Keeper’s Light 提灯、Astral Shard 水晶。
- Studio：资产选择、96×96 逐帧预览、时间轴、播放控制、速度/缩放、像素画笔和手工覆盖编辑。
- Export：当前帧透明 PNG、完整 Spritesheet PNG、可恢复工程 JSON、WebM 动画录制（取决于浏览器支持）。
- LLM Protocol：输入自然语言，复制结构化绘图规范给任意文本 LLM，将其生成的像素矩阵 JSON 导入工作站，校验之后显示动画。数据保存在当前浏览器 localStorage。
- 无需扩散模型、显卡、Node 服务器或 API，即可使用展示站和编辑器。

**透明声明：** 当前内置四件作品是手工编程绘制的引擎演示，不是 LLM 自动生成品。现阶段 LLM 仍需人工复制提示词并将模型输出的 JSON 粘贴回来；自动连接模型将属于下一阶段。

## GitHub Pages 发布

仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。随后打开 Actions → Deploy PixelWeave Pages，触发 Run workflow。首次部署可能需要在仓库设置中完成 Pages 启用。网站路径已使用相对资源引用，兼容 /PixelWeave 子目录。

## 本地运行

安装 Node.js 20+，项目根目录执行：

    npm run dev
    npm test

然后浏览器访问 http://127.0.0.1:4173 。仅浏览画廊时也可尝试直接打开 index.html，但推荐使用本地服务器以支持 JS modules。

## 项目分层

| 模块 | 路径 | 用途 |
| --- | --- | --- |
| 展示与工作站结构 | index.html | Gallery、Studio 双入口 |
| 设计系统 | src/style.css | 响应式 UI |
| 像素资产引擎 | src/engine.js | 像素指令与动画渲染、LLM JSON 验证 |
| 交互与持久化 | src/main.js | 时间轴、像素覆盖画笔、存储和导出 |
| 规划与约束 | docs | 分阶段工程演进 |
| 自动化 | tests / .github/workflows | 核心测试、Pages 部署 |

## LLM 导入协议示例

以下是可校验的微型心形（实际推荐生成 16x16 或 24x24 像素资产）：

    {
      "name":"Little Heart",
      "width":4, "height":4,
      "palette":{".":"transparent","R":"#d95d77"},
      "frames":[
        [".RR.","RRRR","RRRR",".RR."],
        ["RRRR","RRRR",".RR.","..R."]
      ]
    }

宽/高 4–64，帧数 1–16，色板最多 32 项。每一帧行数必须等于 height，每行字符数必须等于 width。全部按 JSON 数据处理，绝不执行来自 LLM 的任意代码。

## Future

下一步：LLM 自动绘图代理、局部修复与多轮美术检查；继而扩展场景分层、背景特效及动态像素壁纸。见 docs/ROADMAP.md。

MIT License.
