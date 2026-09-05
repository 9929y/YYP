# Webflow 待替换信息清单

这份清单列出旧 Webflow 站点（以及挂在它上面的 yy-\* 自定义层）里**每一样需要在新 UI 中重新决定的东西**。
文字和媒体引用已经抽取到 `src/content/`，本清单只关心"用什么新形式呈现"。

每一项后面留了 **决定** 栏，填法建议：`沿用` / `改为 …` / `删除` / `待定`。

数据来源：`scripts/migration/extraction-report.json`（由 `npm run extract:webflow` 生成）。

---

## 0. 全站级别（先决定这些，页面级的才好做）

| # | 项目 | 旧站现状 | 新站需要决定 | 决定 |
|---|------|----------|--------------|------|
| G1 | **信息架构 / 路由** | 扁平 `.html`：`index` `projects` `aboutme` `<case>.html` `fashion` | 已预设为 `/`、`/work`、`/work/<slug>`、`/about`、`/resume`。旧 URL 在 `vercel.json` + `astro.config.mjs` 里做 301。是否保留这套路由？ | |
| G2 | **导航** | 两套并存：Webflow 自带 nav（Projects / About）+ yy-chrome 注入的胶囊 nav（Work / About / Resume 三个滑出面板） | 一套导航。面板式还是页面式？Resume 是独立页还是面板？ | |
| G3 | **页脚** | Webflow 页脚：Previous / Next Project + hello.cv / LinkedIn / Email 图标 + `© Yanice yang 2026`；yy-chrome 另外注入一个只含版权的页脚 | 一个页脚。是否保留上一篇/下一篇、社交链接、版权 | |
| G4 | **社交 / 外链** | hello.cv 简历、LinkedIn、mailto | 保留哪些，用图标还是文字 | |
| G5 | **字体** | Plus Jakarta Sans 400/500/600/700、Caveat 500（本地 woff2，`public/assets/fonts/`）；Webflow 原 CSS 里还引用了 Webflow 字体 | Figma 定的字体是什么？本地托管还是 Google Fonts？ | |
| G6 | **色彩 token** | yy-tokens.css 一套 + Webflow 一套；每个案例有自己的主题色（Lark `#2a73e2`、McKinsey `#e03400`、Opus `#d4c8ff`、MiFinance `#e8710a`、Cummins `#980000`、Alzheimer `#8eb0f0`、TikTok `#3d5a6c`） | 新 UI 是否保留"每个案例一个主色"的机制 | |
| G7 | **深色页面** | Opus Clip、Alzheimer 两个案例页是黑底 | 是否保留深浅混排，还是全站统一 | |
| G8 | **首页 Hero** | ShaderGradient WebGL 渐变画布 + 静态兜底图 + 变形文字（"Build AI-native experiences beyond prompts, toward intent." 三组轮换）+ canvas 粒子流 | Figma 的 hero 是什么？动态文字保留吗？WebGL 背景保留吗 | |
| G9 | **全局动效** | Lenis 平滑滚动、Webflow IX2 入场动画、yy-reveal 补充入场、自定义鼠标光标（yy-cursor）、链接悬停预览卡（yy-link-preview） | 每一项：沿用 / 用 motion 重做 / 删除 | |
| G10 | **Lightbox 图片放大** | 8 个案例页共 89 处 Webflow lightbox（点击放大到遮罩层） | 新站要不要点击放大？用 shadcn Dialog 还是不做 | |
| G11 | **页面 `<title>` / description** | 多数是 Webflow 默认值：`LarkDesign`、`Mifinance`、`Cumminsdesign`、`McKinseyStudy`、`AlzheimerDisease`、`Aboutme`；只有 Home 有 description | 每页要一个像样的 title + description（目前 frontmatter 里 `title`/`description` 可直接改） | |
| G12 | **OG 图** | 没有 og:image | 要不要做分享图 | |
| G13 | **搜索引擎** | 全站 noindex（main 分支刚合并的决定），`vercel.json` 和 `robots.txt` 都带 | 上线时改回可索引 | |
| G14 | **Favicon / App icon** | `logo-site-favicon.webp`、`logo-site-app-icon.webp` | 换新 logo？ | |
| G15 | **404 页** | 没有 | 需要一个 | |
| G16 | **加载动画** | Alzheimer 页有 preloader 品牌动画；Lark 页有 `.preloader-lark` | 删除还是重做 | |
| G17 | **Lottie 动画** | 2 个 JSON（首页 Showreel、Flow），只有 Opus 页和旧首页在用 | 保留就需要引入 lottie 播放器 island | |
| G18 | **视频托管** | 本地 mp4/mov（16 MB）+ 3 个 Vimeo iframe（McKinsey） | `.mov` 需转 mp4/webm；Vimeo 继续外嵌还是下载自托管 | |
| G19 | **图片** | 230 张基础图（webp/png/jpg/svg），Webflow 的 `-p-500…3200` 响应式副本已弃用 | 用 Astro `<Image>` 自动生成响应式，还是保持 `public/` 原图 | |

---

## 1. 首页 `/`

来源：`src/pages/index.astro`（重建前）+ 归档的 `index.webflow.html`。内容文件：`src/content/pages/home.md`

| # | 区块 | 旧内容 | 决定 |
|---|------|--------|------|
| H1 | Eyebrow / 身份 | "Yanice Yang" · "Product Designer / Bay Area, US" · "Portfolio" | |
| H2 | 主标题（变形文字） | lead: "Build AI-native experiences"；三组：prompts→intent / outputs→outcomes / automation→flow | |
| H3 | Hero 背景 | ShaderGradient WebGL + 静态图 `landing-canvas-still.png` | |
| H4 | Featured projects 列表 | 4 个：Opus Clip、AtlasNova（in progress，无页面）、McKinsey、Lark；每个有 logo + headline + scope + note + 视频/封面 | |
| H5 | 交互 | 悬停时 note 文字逐字生成（CaseNoteGenerate）；滚动时视频自动播放；主题随案例切换深浅 | |
| H6 | 旧 Webflow 首页文案 | "Hi, I am Yanice ;)" + 6 张项目卡（每张有 category、标题、一句话、Learn more）+ Resume / Projects 按钮 —— 已不在线，仅供参考 | |

## 2. Work 索引 `/work`

来源：`projects.html` + `yy-work.js` 面板卡片。内容文件：`src/content/pages/work.md`

| # | 区块 | 旧内容 | 决定 |
|---|------|--------|------|
| W1 | 页面标题 | "Projects" | |
| W2 | 卡片（8 张） | 两套文案不一致：Webflow 版（"AI-powered Video Tool / Launch new features with AI"…）与面板版（"Opus Clip · Video creation beyond prompts / Launch new features with AI"…）。frontmatter `cards` 用的是面板版 | 以哪套为准 |
| W3 | 未完成项目卡 | "Lark Education Field Study · Qualitative & quantitative · in progress"，不可点击 | 保留占位卡？ |
| W4 | 封面图 | 每卡一张 + `background-position` 微调 | |

## 3. About `/about`

来源：`aboutme.html` + `yy-about.js`（两处文案几乎相同，面板版多一个 Fashion Project 按钮）。内容文件：`src/content/pages/about.md`

| # | 区块 | 旧内容 | 决定 |
|---|------|--------|------|
| A1 | Hero | 定位图标 + "Bay Area, US" · "Hello," · "I'm Yanice Yang" · 一句自我介绍 · LinkedIn 按钮 · AI 头像 + 极光光效图 | |
| A2 | Bio 段落 | "Thanks for stopping by…"（含时装设计五年经历、STEM 爱好） | 文案是否更新 |
| A3 | Fun Fact | "I made 100k revenue in 2019…" + Fashion Project 按钮 → `/work/fashion` | |
| A4 | A little about me | 4 个故事：狗狗 / 滑雪 / 做饭 / 旅行，每个 2 张照片 + 标题 + 段落 | 保留几个 |
| A5 | 两个来源取舍 | Webflow 页 vs 面板文案 | 选一个删一个 |

## 4. Resume `/resume`

来源：`yy-resume.js`（滑出面板，无 Webflow 页面）。内容文件：`src/content/pages/resume.md`（全部结构化在 frontmatter）

| # | 区块 | 旧内容 | 决定 |
|---|------|--------|------|
| R1 | Profile | Yanice Yang · Senior Product Designer · Bay Area, United States · Email / LinkedIn | 头衔是否改（AtlasNova 是 Design & Product Lead） |
| R2 | Work | 6 段经历（AtlasNova、Cummins、Thunderbit、McKinsey、TikTok/ByteDance、Xiaomi），每段 summary + 3–4 条 highlights | |
| R3 | Education | Michigan MSI · Pratt BFA | |
| R4 | Awards | iF、Red Dot、A' Design、VEGA Gold、MUSE Platinum（带链接） | |
| R5 | Publications | 4 篇 arXiv/IEEE | |
| R6 | Skills | Design / Research / AI tools / Development 四组 | |
| R7 | 交互 | 外链悬停预览卡（yy-link-preview） | |
| R8 | 与 hello.cv 的关系 | 页脚仍链到 hello.cv 简历 | 保留外链还是只用站内简历 |

## 5. 案例页 `/work/<slug>`（共 8 篇）

每篇的通用结构：Hero（标题 + 一句免责声明 + 头图）→ Overview / Role / Timeline 元信息网格 → 若干章节 → 页脚上一篇/下一篇。
下面列每篇**特有**的东西。内容文件：`src/content/cases/<slug>.md`

| slug | 抽取结果 | 特有的媒体 / 交互 | 需要决定 | 决定 |
|------|----------|-------------------|----------|------|
| `ai-driven-product-design`（Opus Clip，深色） | 13 个 h2、21 图、8 lightbox | **7 段本地视频**（4 个 `.mov`：AI-Prompt / generate-footage / add-AI-video / edit-footage；3 个 mp4）自动循环播放；**1 个 Lottie** Showreel；11 处 IX2 动画 | `.mov` 转码；Lottie 保留否；深色主题 | |
| `mckinseyecommerce`（McKinsey） | 12 个 h2、44 图、28 lightbox | **3 个 Vimeo 竖屏 iframe**（background 自动播放）；Industry/Role/Form/Duration 元信息；18 处 IX2 | Vimeo 去留；lightbox 去留 | |
| `larkdesign`（Lark） | 13 个 h2、49 图、17 lightbox | 图最多；有 "Scroll" 提示 + 向下箭头图标；带编号的步骤卡（01–06） | 步骤卡组件化 | |
| `mifinance`（MiFinance） | 9 个 h2、30 图、14 lightbox | 编号章节（1. 2. 3.） | | |
| `cummins-digitalization`（Cummins） | 6 个 h2、27 图、22 lightbox | 标题原文是全小写粗体 | 标题改写 | |
| `alzheimerdisease`（Medical Assistive，深色） | 5 个 h2、19 图 | 品牌 preloader；无 lightbox；正文全是 div 文本块（已按段落抽出） | 深色主题；preloader 删除 | |
| `tiktok-research`（TikTok） | 1 个 h2、3 图 | 只有一节报告 + 2 张图表；Role/Team/Duration/Scope 元信息 | 页面是否保留 | |
| `fashion` | 1 个 h1、2 图 | 一张长图 collage + 裁切版；无导航页脚 | 保留为画廊？ | |
| `atlasnova` | 无页面，只有 frontmatter | 首页 featured，状态 in-progress，有视频 | 何时写正文 | |

### 案例页里反复出现、可以组件化的模式

- 元信息网格：Role / Scope / Duration / Form（或 Industry / Timeline）
- 带编号的步骤卡（Lark 01–06、MiFinance 1–3）
- 加粗引导句 + 正文段（Alzheimer、Cummins 大量使用）
- 图 + 注释小字（`paragraph-annotation`）
- 竖屏手机视频 / 截图三联
- 上一篇 / 下一篇

---

## 6. 明确不会带过来的东西（确认即可）

- Webflow 运行时：jQuery 3.5.1、`webflow.*.js`、IX2 动画数据（`data-w-id`）、`w-node-*` 网格属性
- Webflow 共享 CSS（19,577 行）
- yy-\* 自定义层：yy-chrome / yy-reveal / yy-scroll / yy-cursor / yy-flow / yy-slots / yy-canvas-motion / yy-link-preview 及对应 CSS
- Webflow 生成的 `-p-500…3200` 响应式图片副本（826 个文件）
- `landing.html` 兼容跳转页（改为 301）

---

## 7. 你回复时可以用的格式

```
G2 决定：页面式导航，Work / About / Resume 三个顶栏链接，不做面板
G9 决定：Lenis 删除；入场动画用 motion 重做；光标和链接预览删除
ai-driven-product-design：.mov 转 mp4；Lottie 删除，用首帧截图
```

我会按编号逐条落实到 `src/content/` 和新 UI 组件里。
