# Webflow 待替换清单（只含 Webflow 的部分）

**范围说明**：旧网站是两部分拼起来的。

| 部分 | 谁做的 | 这次怎么处理 |
|------|--------|--------------|
| 首页、胶囊导航（Work / About / Resume 面板）、页脚 | 你在 Astro 上做的 | **保留**，已原样搬回本分支，后续按 Figma 微调 |
| 8 篇案例详情页 | Webflow | **替换**，这份清单说的就是它们 |
| 旧 aboutme.html / projects.html / index.webflow.html | Webflow | 内容与面板重复，已并入面板的内容文件，不再单独存在 |

案例页的文字和图片引用已经全部抽到 `src/content/cases/<slug>.md`，这里只列**需要你决定新形式**的东西。
每项后面的 **决定** 栏，填 `保留` / `改为 …` / `删除` 即可，直接在对话里按编号回复。

---

## A. 所有案例页共用的（先定这些）

| # | 项目 | 旧站现状 | 你已给的方向 | 决定 |
|---|------|----------|--------------|------|
| A1 | 案例页模板 | Webflow 每页各自排版，结构大致是：标题区 → 项目信息表（Role / Duration / Scope…）→ 章节 → 翻页 | 你在 Figma 出一个统一模板 | |
| A2 | 淡入淡出动效 | Webflow 的进场动画（元素滚到视野时淡入） | 新设计也要，用 motion 重做 | 节奏参数待 Figma 标注 |
| A3 | 主题色 | 每篇案例有自己的主色（Lark 蓝、McKinsey 橙红、Opus 淡紫、MiFinance 橙、Cummins 红、Alzheimer 淡蓝、TikTok 青灰） | 统一为主，个别案例有 variant | 到时给颜色值 |
| A4 | 深色页面 | Opus Clip、Alzheimer 是黑底 | 属于 A3 的 variant | |
| A5 | 点击放大图（lightbox） | 6 篇案例共 89 处，点图片弹出放大 | 未定 | |
| A6 | 上一篇 / 下一篇 | 每页底部有翻页链接 | 未定（目前占位页保留着） | |
| A7 | 图片说明小字 | 图片下方的灰色注释文字（Webflow 里叫 paragraph-annotation） | 未定 | |
| A8 | 带编号的步骤卡 | Lark 的 01–06、MiFinance 的 1–3 | 未定，建议做成一个组件 | |
| A9 | 项目信息表 | Role / Scope / Duration / Form（McKinsey 多一个 Industry） | 未定，建议做成一个组件 | |
| A10 | 每页浏览器标题 | Webflow 默认值：`LarkDesign`、`Mifinance`、`Cumminsdesign`、`McKinseyStudy`、`AlzheimerDisease` | 需要正式名称 | |
| A11 | 头图区的 "Scroll ↓" 提示 | Lark 页有 | 未定 | |

## B. 每篇案例特有的

| slug | 抽出的内容 | 特有的东西 | 你已给的方向 | 决定 |
|------|------------|------------|--------------|------|
| `ai-driven-product-design`（Opus Clip） | 13 节、21 图 | **7 段小视频**自动循环（已全部转成 mp4，画质无损）；**1 个 Lottie 动画**；黑底 | 视频保留；Lottie 保留 | |
| `mckinseyecommerce` | 12 节、44 图 | **3 个 Vimeo 竖屏视频**（自动静音循环） | 未定：继续 Vimeo 还是下载到本地 | |
| `larkdesign` | 13 节、49 图 | 图最多；步骤卡 01–06 | 见 A8 | |
| `mifinance` | 9 节、30 图 | 编号章节 1–3 | 见 A8 | |
| `cummins-digitalization` | 6 节、27 图 | 标题原文全小写加粗 | 建议改写标题 | |
| `alzheimerdisease` | 5 节、19 图 | **品牌 loading 动画**（"Medical Assistive UX Case" + 进度条）；黑底 | loading 保留，用 motion 重做 | |
| `tiktok-research` | 1 节、3 图 | 内容很少，只有一段报告和两张图表 | 未定：保留、合并还是删除 | |
| `fashion` | 1 图 + 裁切版 | 只有一张长图 | 未定：做成画廊还是保持单图 | |
| `atlasnova` | 无正文 | 首页 featured、状态 in progress、有视频 | 正文什么时候写 | |

## C. 已经处理好、不用再决定的

- 4 段 .mov 视频 → mp4，逐帧校验无损
- 旧 `.html` 网址 → 新网址 301 跳转（`vercel.json`）
- Webflow 运行时（jQuery、动效引擎、19,577 行 CSS）和响应式图片副本已全部移除
- 首页、导航面板、页脚的文字改为从 `src/content/` 读取，外观不变

---

## 回复格式示例

```
A5：不要点击放大
A6：保留翻页
mckinseyecommerce：Vimeo 继续用
tiktok-research：删掉这一页
```
