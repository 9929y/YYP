# Portfolio Inventory

作品集改版第 1 步：现状盘点与内容分诊
审计对象：`9929y/YYP` @ `a76478f`（`origin/main`），2026-09-05
审计范围：仓库全部文件 + 13 个远端分支的未合并内容
**本文档只做判断，不做任何修改。仓库代码、页面、资源均未被改动。**

---

## 1. Executive Summary

### 强的部分

**素材密度是这个作品集最被低估的资产。** 261 张唯一原图已被逐张看图写过描述（`docs/CATALOG.md`），带 `role`（flow / wireframe / persona / journey / competitive / chart / system）和 `reuse`（客户可识别性、肖像、NDA）两层标注。改版时不需要重新认图，直接按 `bucket` + `role` 查询即可。这份目录本身就是改版的最大加速器。

**三个已发布的重点案例有真实的量化证据，不是学生作业。** Lark 有竞品基准对照（钉钉 37.3s vs 飞书 121.4s 注册耗时）、行为数据（8 页引导完整看完的用户不足 10%）、AB 测试前后对照图；McKinsey 有 8 场概念测试、三份用户画像、买卖双方泳道图，且产品 2023 年真实上线；Opus Clip 有 6M 用户体量的真实产品背景、四组 AB 测试对照界面、三条用户原声。

**动效/交互代码层已经相当成熟，且大部分与内容解耦。** `yy-chrome.js`（1489 行 nav/footer/resume 面板）、`yy-flow.js`（221 行 ASCII canvas）、`yy-canvas-motion.js`（300 行滚动驱动图层）、`yy-cursor.js`（每项目 ASCII 光标）、四个 React island（ShaderGradient WebGL 首屏、Magic UI 文字 morph、逐词生成、案例笔记生成）。这些是 Playground 的现成原料，不是要丢弃的遗产。

### 碎的部分

**首页有两套，且两套都在线上。** `src/pages/index.astro`（Astro，4 个项目，`/`）和 `index.webflow.html`（Webflow 遗留，6 个项目，旧标题，仍被 `scripts/legacy-passthrough.mjs:1` 原样拷进 `dist/`）。两者项目集合、标题写法、层级都不一致。

**首页第 2 个位置的 AtlasNova 点进去是空的。** `src/data/projects.ts:102` 写着 `href: null`，`status: 'in-progress'`。它占据 4 个 featured 位中的一个，但全站只有 3 个相关文件：一段 969KB 视频、一张 poster、一个 SVG logo。没有案例页、没有截图、没有流程图。`src/pages/[slug].astro:2-6` 的注释自己承认："AtlasNova is engine:astro but status:in-progress, so this route emits zero pages today."

**案例页结构没有任何共用规范。** 8 个页面 8 种写法：Opus Clip 27 个标题、McKinsey 22 个且**没有 h1**、Lark 21 个且把 6 条个人能力（Localization Strategy / Business&Design Balance / Scope Definition / Proactivity&Leadership）当成 h3 标题排、Cummins 只有 6 个 h2 且**没有 h1**、TikTok 全页只有 2 个标题 3 张图。Opus Clip 和 McKinsey 还存在 h2 嵌在 h3 下面的倒置层级。

**素材量和项目重要性完全脱钩。** featured 的 Opus Clip 只有 21 张图（7.8MB），非 featured 的 MiFinance 有 29 张（13MB）、Cummins 25 张。首页想讲"这四个是我的主力"，素材密度讲的是另一个故事。

**全站被 `noindex` 锁死。** `vercel.json:19` 对 `/(.*)` 下发 `X-Robots-Tag: noindex, nofollow, noarchive`。这是 PR #41 有意为之，但改版上线前必须有一个明确的解锁决定，否则改完也搜不到。

### 该保住的

- `docs/CATALOG.md` + `docs/images-manifest.json`（261 条看图写的描述 + `legacy` 原文件名可回溯）
- Lark / McKinsey / Opus Clip 的证据类图（chart / competitive / persona / journey / AB 对照）——这些是重画也画不出来的一手材料
- 动效与交互代码层（11 个 `yy-*.js` + 4 个 island）
- `assets/videos/case-*.mp4` 四段首页卡片视频

### 需要最大幅度改造的

1. **AtlasNova**：从零建案例页。这是四个 featured 里唯一没有内容的，也是唯一能承载"AI 产品设计现在时"叙事的项目。优先级最高。
2. **案例页叙事结构**：三个已发布 featured 案例都是"研究 → 洞察 → 方案 → 结果"的完整 UX 流水账，长度 561–920 行。要压到一条主线 + 3–5 个证据。
3. **视觉系统**：22,697 行 CSS，其中 19,577 行是 Webflow 生成的共享表。两套字体系统（本地 Plus Jakarta Sans + 远端 WebFont.load 的 Montserrat/Georgia/Caveat）、6 套页面边距系统并存。年轮视觉系统落地前，这一层必须先收敛。

---

## 2. Site Map

```
/ ......................... src/pages/index.astro          [Astro · 线上首页]
│                           首屏 hero（MorphingStatement + ShaderGradient canvas）
│                           + Featured projects（4 张卡，ProjectIndex.astro）
│
├── /landing.html ......... → 301 重定向到 /               [vercel.json:7]
├── /landing .............. → 301 重定向到 /               [vercel.json:12]
├── /index.webflow.html ... index.webflow.html             [Webflow · 旧首页，仍在线]
│                           6 个项目卡，标题与 / 完全不同
│
├── /projects.html ........ projects.html                  [Webflow · 246 行，只有一个 h1 "Projects"]
│                           全站每页 nav/footer 都链到它
│
├── /aboutme.html ......... aboutme.html                   [Webflow · 170 行]
│                           I'm Yanice Yang / Fun Fact / A little about me
│                           4 个兴趣分组 × 2 张照片
│
├── 案例页（全部 Webflow 直出，不经 Astro 构建）
│   ├── /ai-driven-product-design.html ... Opus Clip       [760 行 · 20 图 · 7 视频] ★featured 1
│   ├── /mckinseyecommerce.html .......... McKinsey        [920 行 · 38 图] ★featured 3
│   ├── /larkdesign.html ................. Lark            [884 行 · 46 图] ★featured 4
│   ├── /mifinance.html .................. MiFinance       [638 行 · 26 图]
│   ├── /cummins-digitalization.html ..... Cummins         [561 行 · 25 图]
│   ├── /alzheimerdisease.html ........... Medical Assistive [265 行 · 14 图]
│   ├── /tiktok-research.html ............ TikTok Research [121 行 · 3 图]
│   └── /fashion.html .................... Fashion         [80 行 · 2 图]
│
├── ★featured 2：AtlasNova ................ 无页面（href: null）
│
├── 外链 Resume ........... https://302437672248143872.hello.cv/   [第三方托管]
│   + nav 内的 Resume 面板（yy-resume.js，367 行，自建）
│
└── 未使用但已建成的路由
    ├── src/pages/[slug].astro ........... 输出 0 个页面（无 published 的 astro 项目）
    └── src/pages/case-study-template.astro ... 脚手架，未接内容
```

**结构性问题**：`projects.html` 被全站每一页的导航链接，但它本身是空的（只有一个 `<h1>Projects</h1>`）。这是站内唯一一个"每个页面都指向它、但它什么都没有"的节点。

---

## 3. Project Inventory

| Project | Current Status | Homepage | Versions Found | Content Quality | Asset Quality | Future Treatment |
|---|---|---:|---:|---|---|---|
| **Opus Clip**<br>`ai-driven-product-design.html` | published · Webflow | ★ 1 | 2（线上页 + `camxmg` 分支已把 4 个 .mov 无损转 .mp4） | 强：AI 产品思维、AB 测试、用户原声、0→1；弱：27 个标题、层级倒置、Highlights 与 Final Design 内容重叠 | 21 张 / 7.8MB。4 个 `.mov` 浏览器兼容差 | **Full Revamp** |
| **AtlasNova**<br>（无页面） | in-progress · Astro | ★ 2 | 3（`brand-kit-v1` 分支有 `brand-kit-v1.astro` 结构草稿 + MediaGrid/MediaPlaceholder 组件；`cursor/atlasnova-ready-sept-3658` 有首页 hover chip） | 无内容 | 3 个文件：视频 969KB + poster + SVG logo | **Full Revamp（从零建）** |
| **McKinsey Ecommerce**<br>`mckinseyecommerce.html` | published · Webflow | ★ 3 | 1 | 强：0→1 商业推理、8 场测试、买卖双侧流程；弱：无 h1、"InsightsⅠ/Ⅱ/Ⅲ" 罗马数字写法不统一、竞品拆解 8 张几乎全 ⚠️ 客户可识别 | 43 张 / 15MB，其中 30+ 张标 ⚠️ 需脱敏 | **Full Revamp** |
| **Lark Design**<br>`larkdesign.html` | published · Webflow | ★ 4 | 1 | 最强：竞品基准数字、行为数据、AB 前后对照、跨平台落地；弱：My Role 下 6 条能力当标题排、46 张图无主次 | 50 张 / 26MB（全站最多），24 张标 ⚠️ | **Full Revamp** |
| **MiFinance**<br>`mifinance.html` | published · Webflow | — | 1 | h1 被截断："Create A Delightful User Experience for"（缺宾语）。内容本身完整：用户分层矩阵、失败态设计、竞品对比 | 29 张 / 13MB，质量高（失败弹窗七则、步骤条状态规格） | **Compress** |
| **Cummins**<br>`cummins-digitalization.html` | published · Webflow | — | 1 | 无 h1，只有 6 个 h2。真正的亮点是 0→1 设计系统 + 穷举式状态消息矩阵，但埋在流水账里 | 25 张 / 5MB，设计系统规格页质量高 | **Compress** |
| **Medical Assistive**<br>`alzheimerdisease.html` | published · Webflow | — | 1 | h2 "Ideation on" 被截断。田野研究（影随观察记录墙、护工时间表）是全站最独特的一手材料 | 20 张 / 13MB，含真实病房照 ⚠️ 肖像风险 | **Compress** |
| **TikTok Research**<br>`tiktok-research.html` | published · Webflow | — | 1 | 全页 2 个标题、3 张图。已经是压缩态，但压得没有结论 | 4 张 / 388KB，两张分组条形图数据清晰 | **Compress**（重写结论） |
| **Fashion**<br>`fashion.html` | published · Webflow | — | 1 | 1 个标题、2 张图，且这 2 张是同一张拼贴的完整版与裁切版 | 2 张 / 1.3MB，实为 1 张 | **Merge**（并入 About 或 Playground） |
| **Flluid Studio**<br>（未合并） | PR #37 open | — | 1（`cursor/flluid-studio-page-f755`） | 未评估，是一个"可玩"的 Astro 页 | `yy-flluid.js` + 独立 css | **Playground 候选** |
| **Projects 3D Carousel**<br>（未合并） | PR #13 open | — | 1（`cursor/projects-3d-carousel-d425`，31 commits） | 3D 转盘式项目架 + 7 张占位图 | `ProjectsCarousel3D.tsx` + Vite 独立入口 | **Playground 候选 / 或作 Work 页方案** |

---

## 4. Four Featured Projects

### 4.1 Opus Clip — `ai-driven-product-design.html`

#### Core story

**"当 AI 能一句话生成视频时，人还需要抓着哪根缰绳？"**
这个项目真正的产品判断是：用户不信任 AI 一次性生成的故事线，**手动控制不是退路，而是信任的前提**。页面上已有这句结论（h3 "Manual control is the key for user to feel safe in storyline generation process"），但它被埋在 Research 章节的第三条洞察里，和另外两条并列，没有被当成整个案例的论点。

#### Existing narrative

现结构（27 个标题）：
```
h1 AI-driven product design
h2 Overview / Role / Timeline
h2 Introduction
  h3 The Challenge
  h3 Design           ← 下面挂 4 个 h2（层级倒置）
    h2 Generate resources within AI prompts
    h2 AI generating storyboard & voiceover
    h2 Enhancing storyline with AI power
    h2 Final touchup through manual control
  h3 Research
    h3 What the competitors design
    h3 What our users said
    h3 [三条洞察，各占一个 h3]
  h3 Validation
    h3 What the AB testing tells
  h3 Highlights       ← 下面又挂 4 个 h2
    h2 AI-Powered Search / Control over AI outputs /
       Generate storyboard based on AI prompts / Customize the voiceover
  h3 Final Design
  h3 Impact
    h3 In Beta Testing stage
```
它想传达的是"我从 0 到 1 做了一个 footage-to-video 功能，做了研究、做了 AB 测试、上线到 Beta"。但 **Design 章节的 4 个功能点和 Highlights 章节的 4 个功能点在讲同一批东西**，只是一遍用流程语言、一遍用卖点语言。读者会觉得读了两遍。

#### Strongest content — **KEEP**

1. **三条用户原声卡**（`persona-user-quote-june-vlogger` / `-lexi-digital-marketer` / `-nick-content-creator`）。Lexi 那条"我库里有 5000+ 自制素材"直接支撑了"复用存量素材"这个产品方向，不是装饰性引用。
2. **四组 AB 测试对照界面**（`hifi-ab-test-video-creation-entry-2up` / `-clip-selection-2up` / `-create-storyboard-2up` / `-refine-storyboard-2up`）。左右两版并列，这是全站唯一一处"两个方案摆在一起被真实用户判过"的证据。
3. **"手动控制 = 安全感"这条结论**及其配图 `screen-manual-clip-reorder-and-edit`（悬停出现拖拽/编辑/删除工具条 + 分段文案编辑态）。
4. **真实产品语境**：6M 用户体量、两个月设计周期、与 PM/工程对齐后主动 pivot（从"生成全新视频"改为"footage-to-video"）。这个 pivot 决策是全案例最有分量的一句，现在只在 Overview 里一笔带过。
5. **7 段真实操作录屏**（`1.mp4` `2.mp4` `3.mp4` + 4 个 `.mov`）。

#### Weak content — **CUT / COMPRESS**

- **Design（4 个 h2）与 Highlights（4 个 h2）二选一。** 建议保留 Highlights 的表述、删掉 Design 章节的复述。
- **竞品分析章节**：4 张拆解图（Captions / Descript / Riverside / VEED）结论只有一句"竞品用不同策略降低 AI 学习曲线"。要么给出取舍结论，要么压成一张对比表。
- **"Introduction" + "The Challenge" + "Overview" 三段开场**讲的是同一件事，压成一段。
- **`icon-challenge-callout-lightbulb.webp`**：CATALOG 明确记录"下方一行文字因用浅色（近白）几乎不可见"——这是一个坏掉的资产。

#### Asset audit

| 资产 | 判定 | 说明 |
|---|---|---|
| `hero-opusclip-footage-to-video-intro.webp` | **KEEP** | 开篇卡，深色，与项目调性一致 |
| `hero-opusclip-ai-video-editing-cover.webp` | **RETOUCH** | 首页卡封面，紫色胶囊标签压在编辑器上；年轮系统落地后需重新裁切与配色 |
| 4 张 AB 对照图（`hifi-ab-test-*-2up`） | **REBUILD** | 信息极有价值，但现在是两张截图并排、无版本标签、无"哪个赢了"的结论标注。新版应把胜出方案标出来 |
| 3 张用户原声卡（`persona-user-quote-*`） | **RETOUCH** | 深色卡 + 插画头像，信息好，排版是模板感；统一到新字体与间距即可 |
| 4 张竞品拆解（`competitive-*`） | **REPLACE** | 目前是"logo + 截图"的堆叠，没有对比维度。新视觉应传达：四家在"AI 自动程度 vs 用户可控程度"两轴上的位置 |
| `icon-challenge-callout-lightbulb.webp` | **REMOVE** | 文字不可见，只剩一个 emoji |
| `flow-footage-to-video-search-to-storyboard-2up.webp` | **KEEP** | 带序号标注的两屏流程，是唯一一张说清主路径的图 |
| `screen-ai-storyline-generation-annotated.webp` | **KEEP** | 标注了三个关键交互点，是"手动控制"论点的直接证据 |
| `1.mp4` `2.mp4` `3.mp4` | **RETOUCH** | 文件名无意义，需重命名；内容可用 |
| `AI-Prompt.mov` `add-AI-video.mov` `edit-footage.mov` `generate-footage.mov` | **REBUILD（技术性）** | QuickTime 容器，浏览器兼容差。**`claude/website-tech-stack-eval-camxmg` 分支 commit `a1284ac` 已完成无损转码为 .mp4，直接取用** |

#### Missing visuals

- **那次 pivot 没有任何视觉。** "从生成全新视频 → 改为 footage-to-video"是本案例最有分量的产品决策，页面上只有一句话。需要一张图说明：原始需求是什么、为什么不做、改成了什么、依据是什么。
- **AI 自动 / 人工控制的责任划分图**。整个案例的论点是这条边界，但没有一张图画出这条边界在产品里落在哪里。
- **Beta 阶段的结果没有数字。** h3 "In Beta Testing stage" 下面没有可量化的成果。若拿不到数字，就不要保留这个标题。

#### Potential hero moment

**一条 prompt 输入后，故事板逐帧生成 → 用户拖动重排其中一段 → 生成结果随之更新。** 素材已经全部存在（`screen-ai-prompt-search-entry` → `screen-prompt-generated-storyboard-scenes` → `screen-manual-clip-reorder-and-edit` → `screen-storyboard-scene-inline-edit`，加上 7 段录屏）。这一串正好演的就是"AI 生成 + 人接管"这个核心论点，是全站最适合做成滚动驱动动效的一段。此处只描述机会，不做设计。

---

### 4.2 AtlasNova — 无页面

#### Core story

从 `src/data/projects.ts:101-104` 现有文案推断：**"让没有品牌团队的小企业，也能在所有营销物料上说同一种视觉语言。"**（`headline: 'AI-Guided Brand Discovery'`，`note: 'Designing a brand kit that helps SMB build up visual language across marketing assets'`）

#### Existing narrative

**不存在。** 全站关于 AtlasNova 的全部内容是：
- `assets/videos/case-atlasnova.mp4`（969KB，brand kit 输入界面）
- `assets/images/home/case-atlasnova-frame.jpg`（50KB poster）
- `assets/images/brands/logo-atlasnova.svg`
- `src/data/projects.ts:99-127` 的 12 行元数据

`src/pages/[slug].astro:2-6` 的注释确认：这条路由今天输出 0 个页面，且里面的占位文案（"Add the project's strongest evidence artifact here"、`CaseStat value="—"`）会在 status 一翻成 published 的瞬间上线。

#### Strongest content — **KEEP**

- 那段 969KB 视频是唯一的产品画面证据，必须保住。
- `brand-kit-v1` 分支（`6687be7`）的 `src/pages/brand-kit-v1.astro` 结构草稿 + `MediaGrid.astro` + `MediaPlaceholder.astro` 两个组件。commit message 明确写着 "Record that Brand Kit v1 is the atlasnova project, not a second one"——**这是同一个项目，不要当成两个**。

#### Weak content — **CUT / COMPRESS**

不适用（无内容）。

#### Asset audit

| 资产 | 判定 | 说明 |
|---|---|---|
| `case-atlasnova.mp4` | **KEEP** | 唯一产品证据 |
| `case-atlasnova-frame.jpg` | **KEEP** | 从视频截的 poster，与视频一致 |
| `logo-atlasnova.svg` | **KEEP** | 矢量，可随新视觉系统调色 |
| 其余全部 | **缺失** | 见下 |

#### Missing visuals

这里不是"某张图需要重画"，而是**整个证据链都不存在**。至少需要：

1. **产品主流程**（输入 → AI 推导 → 品牌套件产出 → 应用到物料）
2. **输入界面的实际形态**——视频里有，但需要静帧 + 标注
3. **产出的 brand kit 长什么样**（色板、字体、logo 变体、应用示例）
4. **"跨物料一致性"的前后对比**——这是整个项目的价值主张，必须有一张图证明它成立
5. **为什么 SMB 需要它**：一条能立住的问题陈述证据（哪怕是一句用户原话 / 一组现状截图）

#### Revamp opportunities

AtlasNova 是四个 featured 里唯一的**现在时 AI 产品项目**，也是唯一还没被 Webflow 结构污染的项目。它应该成为新案例结构的**样板**——先把它按新规范建出来，其余三个再往这个模子里改，而不是反过来。

#### Potential hero moment

**输入一句品牌描述 → 一整套视觉物料同时生成并铺开。** 与年轮视觉系统天然契合（一个中心输入向外层层生长出应用层）。素材尚不存在，需要在下一步一并产出。此处只描述机会。

---

### 4.3 McKinsey Ecommerce — `mckinseyecommerce.html`

#### Core story

**"帮一家没有数字业务的传统巨头，从零长出第一条直播电商生意线——并且要让 Gen Z 真的愿意在里面待着。"**
现在页面把它讲成了一个"我做了很多研究方法"的故事。真正稀缺的是**咨询语境下的 0→1**：既要对客户的商业目标负责，又要"coach"客户自己学会做产品（页面原话）。这条线现在只在 My Role 里出现一次。

#### Existing narrative

现结构（22 个标题，**无 h1**）：
```
h2 Overview / My Role / Industry / Role / Form / Duration
  h3 Core Challenge
    h2 How to create the most entertaining "live" shoppable moments for Gen Z
  h3 Research → h2 Competitive Analysis to identify design opportunities
  h3 Research → h2 Interviews to understand common pattern of users
  h3 InsightsⅠ  → h2 Warm and vibrant Color represents the culture of Gen Z
  h3 InsightsⅡ  → h2 Taking care of user habits in Single-hand mode...
  h3 Insights Ⅲ → h2 Streamlined the userflow...
  h3 Product Ideation / Design Process / User Testing / Takeaways
```
注意 `Role` 出现两次（`h2 My Role` 和 `h2 Role`），`Research` 作为 h3 出现两次，`InsightsⅠ`/`InsightsⅡ`/`Insights Ⅲ` 三种罗马数字写法不一致（第三个多一个空格）。

#### Strongest content — **KEEP**

1. **单手可达性论证**（`wireframe-single-hand-key-zone-callouts` + `wireframe-single-hand-reach-heatmap-action-menu`）。橙框标出难以单手触达的区域，再用热区图证明操作条落在拇指易达区。这是整页唯一一个"提出问题 → 用可视化证明 → 改设计"闭环完整的段落。
2. **买卖双侧泳道图**（`flow-liveshop-mvp-flow-buyer` / `-seller` / `-buyer-seller-combined`）。合并视图展示了买卖双方流程的交叉触点，这是"从零建一条生意线"而非"做一个 App"的直接证据。
3. **三份用户画像**（Betty 冲动型 Gen Z 买家 / Claire TikTok 达人 / Coco 直播运营）。覆盖了供需两侧，不是标准的三张同质画像。
4. **8 场概念测试的四份结论页**（Discover flow / Purchase flow / Events&Calendar flow / Save-favorites flow，均为"已验证 / 机会点 / 待验证"三栏）。有明确的"哪些没验成"（`chart-additional-insights-to-validate` 列了 5 条开放问题）——诚实度是加分项。
5. **2023 年真实上线**。

#### Weak content — **CUT / COMPRESS**

- **8 张竞品拆解全部标 ⚠️ 客户可识别**（`competitive-ia-*` / `competitive-interaction-*` / `competitive-userflow-*` / `competitive-feature-set-*`）。这是 8 张图换 1 句结论的投入产出比，且带脱敏风险。**建议压成 1–2 张**。
- **三张品牌样张**（Founders Grotesk / Gotham / Inter）+ 一张品牌总览板 + 三张落地页概念稿 = 7 张视觉方案候选。这些是"我们探索了很多视觉方向"，不是产品决策证据。**压到 1 张**。
- **`Role` 和 `My Role` 重复**，`Industry` / `Form` / `Duration` 属于元数据，不该是 h2。
- **"Warm and vibrant Color represents the culture of Gen Z"** 作为一条与"单手模式"、"流程精简"并列的洞察，量级明显不对等——前两条有数据和线框支撑，这条只有一个色彩主张。

#### Asset audit

| 资产 | 判定 | 说明 |
|---|---|---|
| `wireframe-single-hand-reach-heatmap-action-menu` | **KEEP** | 全案最强的一张论证图 |
| `wireframe-single-hand-key-zone-callouts` | **KEEP** | 与上图配对 |
| `flow-liveshop-mvp-flow-buyer-seller-combined` | **RETOUCH** | 信息正确但密度过高，需按阅读顺序分层重排 |
| `hifi-liveshop-buyer-app-hifi-8up` | **RETOUCH** | 8 屏拼图，做开篇总览是对的，但缺少"哪一屏是主场景"的引导 |
| 3 份 persona 卡 | **RETOUCH** | 统一到新字体/新卡片规范 |
| 4 张测试结论三栏页 | **REBUILD** | 现在是 PPT 截图（三栏文字），信息密度高但可读性差。新视觉应做成"验证通过 / 发现机会 / 待验证"三态可扫描的结论板 |
| 8 张 `competitive-*` | **REPLACE**（保留 1–2 张） | 新视觉应传达一件事：竞品在"沉浸感 vs 购买效率"上各自的取舍位置，以及我们选了哪一格 |
| 3 张 style tile + `system-liveshop-brand-direction-board` | **REPLACE**（合成 1 张） | 新视觉只需说明最终方向及其理由 |
| 3 张落地页概念稿 | **REMOVE** | 营销页视觉探索与产品故事无关 |
| 2 张低保真线框全景 + 1 张 beta 线框全景 | **RETOUCH**（保留 1 张） | 三张同类，选信息最全的那张 |
| `bg-navy-wireframe-curve-lines.webp` | **REPLACE** | 纯装饰背景，年轮系统落地后由新背景取代 |
| 4 张 spot 插画（`illustration-*-spot`） | **REMOVE** | 通用扁平插画，对内容零贡献，且是最典型的"模板作品集"信号 |

#### Missing visuals

- **商业结果为零。** 产品 2023 年上线了，但页面上没有任何上线后的数字或反馈。若受 NDA 限制，至少要有一句明确的"因保密不便披露"，而不是让 Takeaways 直接结束。
- **"coach 客户自己做产品"这条线没有视觉。** 这是咨询项目区别于甲方项目的关键，值得一张图（谁做什么、我们退出后客户怎么接手）。
- **一张能立住"Gen Z 为什么买直播"的证据图。** 现在这个前提是被假设的，不是被证明的。

#### Potential hero moment

**单手热区那一段。** 一只拇指的可达半圆扫过界面，把够不着的操作一个个点亮成红色，然后界面重排、操作条落进拇指区。素材（两张线框标注图）已经存在，只差把静态论证变成一次可看的演示。此处只描述机会。

---

### 4.4 Lark Design — `larkdesign.html`

#### Core story

**"在一个已经很拥挤的协作工具市场里，新用户的前 121 秒决定他会不会留下来。"**
Lark 是全站证据最硬的一个案例，但现在的页面把它讲成了"我在字节做了一个 onboarding 改版，涉及六个平台"。真正的论点应该是那组对照数字：**竞品 37.3s，我们 121.4s**——这一个对比就能立住整个项目的必要性。它现在藏在正文段落里，没有被当成开场。

#### Existing narrative

现结构（21 个标题）：
```
h1 User Onboarding & Team Formation
h2 Overview
  h3 My Role
    h3 User Insights & Ideation
    h3 Design Execution
    h3 Localization Strategy      ← 这 6 条是个人能力清单，
    h3 Business&Design Balance       不是案例章节
    h3 Scope Definition
    h3 Proactivity&Leadership
    h3 Final Impact
  h3 The Challenge
  h3 The Approach
    h2 A Time-Consuming Process Detracts From Its User-Friendliness
      h3 Long Registration Time
      h3 Privacy concern from users
    h2 Speeding up registration for efficiency
    h2 A faster, more accessible and User-friendly Design
    h2 User Prefer to Skip the Feature
      h3 Cannot Access Lark Through Links
      h3 Competition Results in User Loss
      h3 Privacy Concern from Users     ← 与上面 "Privacy concern from users" 重复
    h2 Final Design
```
"Privacy concern from users" 作为 h3 出现两次，分属两个不同的父章节。

#### Strongest content — **KEEP**

1. **竞品耗时基准对照**：`chart-registration-time-benchmark-37s-vs-121s.webp`（钉钉 37.3s vs 飞书 121.4s）。全站最有说服力的一张图。
2. **引导跳过行为数据**：`chart-feature-tour-skip-behavior-breakdown.webp`（8 页引导，完整看完的不足 10%；第一页就跳过 / 中途跳过 / 未读先跳的四切片拆解）。这是"用户不看引导"从主观印象变成可测事实的一步。
3. **AB 测试前后对照**：`chart-instruction-read-efficiency-before` / `-after`（说明阅读效率从一小角变成大半扇区）。有前后、有对照。
4. **新旧注册流程对照图**：`flow-registration-workflow-before`（7 步）vs `-after`（4 步）。改动可视、可验证。
5. **跨平台落地证据**：桌面端 3 张、移动端 5 张，覆盖注册 / 建团队 / 邀请成员 / 加外部联系人四条路径。"六个平台"这个规模是真的做出来了，不是说说。
6. **引导策略框架**：`system-engagement-pyramid-guidance-strategy.webp`（Retention / Exploration / Engagement 三层映射到具体触点）。这是系统思维的直接证据。

#### Weak content — **CUT / COMPRESS**

- **My Role 下的 6 条能力清单**（Localization Strategy / Business&Design Balance / Scope Definition / Proactivity&Leadership / …）。这是简历语言，不是案例内容，而且它们占据了与 The Challenge、The Approach 同级的标题位。**全部压成 Overview 里的一两行**。
- **"Privacy concern from users" 重复出现两次**，且两处内容不同。合并成一处。
- **50 张图无主次。** 这是全站图最多的案例（26MB），其中 24 张标 ⚠️ 客户可识别。压缩到 12–15 张。
- **5 张 spot 插画**（`illustration-blocked-invite-access-vault-spot` / `-blocked-link-404-spot` / `-slow-registration-waiting-spot` / `-team-communication-challenge-spot` / `-eight-page-feature-tour-skip-frustration`）。灰蓝扁平插画配痛点卡片，是典型的模板作品集手法。
- **3 张 HMW 分节封面**（`hero-hmw-*`）。用冰山、设备摆拍做章节封面，与年轮视觉系统冲突，且这类"HMW 三连"结构本身就是学院派 UX 模板的标志。

#### Asset audit

| 资产 | 判定 | 说明 |
|---|---|---|
| `chart-registration-time-benchmark-37s-vs-121s` | **REBUILD** | 数字极强，但现在画成"人物倚靠在长条上"的图库风格。新视觉只需两个数字和一条差距 |
| `chart-feature-tour-skip-behavior-breakdown` | **REBUILD** | 四切片饼图读不出"绝大多数人根本没看完"这个结论。改成单一强对比 |
| `chart-instruction-read-efficiency-before` / `-after` | **RETOUCH** | 前后对照结构正确，统一到新配色即可 |
| `flow-registration-workflow-before` / `-after` | **KEEP** | 7 步 vs 4 步，信息与形式都对 |
| `flow-new-signup-flow-desktop-and-mobile-9up` | **RETOUCH** | 9 屏并列，需要标出"哪几步被删掉了" |
| `system-engagement-pyramid-guidance-strategy` | **RETOUCH** | 框架图，重排字体与配色 |
| `journey-team-onboarding-experience-map` | **RETOUCH** | 四阶段体验地图，信息完整，视觉是 PPT 感 |
| `hero-lark-onboarding-three-phone-mockup` | **KEEP** | 开篇视觉，一眼交代产品形态 |
| 10 张 `flow-lark-*-Nup` 跨平台流程图 | **压到 4 张** | 每条路径留最能说明问题的一张；`⚠️` 标记的需脱敏 |
| 3 张 `hero-hmw-*` | **REPLACE** | 章节封面应由新视觉系统统一承担 |
| 5 张 `illustration-*-spot` | **REMOVE** | 模板插画 |
| 2 张团队合影（`photo-feishu-ux-team-*`） | **REMOVE 或移到 About** | 与产品论点无关，且 ⚠️ 涉及可辨认人物 |
| `chart-solution-assessment-radar-5axis` | **REBUILD** | 五维雷达图不可读；若要保留"方案评估"这一步，改成一句结论 + 取舍理由 |
| `wireframe-add-team-member-dialog-explorations` | **KEEP** | 三个探索方案并列，是少见的"过程留痕"好素材 |

#### Missing visuals

- **改版后的效果没有量化图。** 页面有 "Final Impact" 章节和一堆最终界面，但没有一张图回答"121.4s 变成了多少秒"。这是整个案例最该有、也最可能拿得到的一个数字。
- **"六个平台"的规模没有一张图。** 现在靠 10 张分散的流程图暗示，应该有一张统一的平台/触点覆盖图。
- **隐私与合规约束怎么影响了设计**。页面两次提到 privacy concern，但没有视觉说明它最终改变了什么。这是 B 端设计里最能体现约束思维的一段。

#### Potential hero moment

**旧注册流的 7 步逐个折叠成新流的 4 步，同时右侧计时器从 121.4s 掉到目标值。** 两张流程图（before / after）和那组基准数字都已存在，缺的只是把"两张并排的静图"变成一次可感知的收缩。这与年轮"层层收拢/生长"的意象是同一种运动。此处只描述机会。

---

## 5. Secondary Projects

### MiFinance — `mifinance.html`

**Why keep it**：全站唯一的金融合规场景，且失败态设计（7 则失败/挽留弹窗）是稀缺的"设计不只是快乐路径"的证据。

**Proposed one-line story**：为一条被合规切成六种走法的开户流程，做出一套让用户随时知道自己在哪、失败了该往哪走的引导。

**Role**：UX Designer（小米金融电子账户开户）

**Recommended visuals (1–4)**
1. `flow-eaccount-task-matrix-by-user-group.webp` — 六类用户各自要走的路径差异，一图说清问题
2. `hifi-failure-and-retention-dialog-designs.webp` — 7 则失败与挽留弹窗，本案最强证据
3. `system-eaccount-failure-message-audit.webp` — 旧版三类失败弹窗共用一句笼统报错的对照
4.（可选）`hifi-id-photo-upload-guidance-screen.webp` — 用图文预防拍摄失败

**What to remove**：竞品对比、用户旅程图、3 张低保真流程全景图（`lowfi-eaccount-lowfi-wireflow-*`）、第一轮迭代线框、开户步骤条的两套状态规格（`system-account-opening-stepper-states` 与 `system-eaccount-step-indicator-states` 内容重叠，选一）、spot 插画。**h1 "Create A Delightful User Experience for" 缺宾语，必须重写。**

**Recommended status**：**Compress**

---

### Cummins — `cummins-digitalization.html`

**Why keep it**：唯一的重工业 / 现场服务场景，且"从 0 到 1 搭设计系统"+"穷举式状态消息矩阵"这两件事在其他项目里都没有。

**Proposed one-line story**：给一群整天泡在诊断工具里的现场技师，把散落的诊断流程收敛成一套跨 PC/Android/iOS 的系统，并把每一种出错情况都提前写好了下一步。

**Role**：UX Designer（Cummins Guidanz 诊断工具）

**Recommended visuals (1–4)**
1. `system-guidanz-design-system-grid-margin-spacing.webp` — 0→1 设计系统的规范页
2. `system-ecm-install-message-matrix-part1.webp` — 状态消息矩阵，"穷举机器所有异常分支"的直接证据
3. `flow-multi-module-calibration-result-3up.webp` — 三屏标定流程，说明产品实际长什么样
4.（可选）`system-guidanz-icon-library-pc-android-ios.webp` — 跨平台一致性

**What to remove**：整个 MarketPlace 研究章节（甘特图、访谈参与度、研究方法汇总、两张服务蓝图）——那是另一个项目，不该和 Guidanz 挤在一页；消息矩阵 part2/part3（留 part1 代表即可）；三份设计系统文档并排图选一。

**Recommended status**：**Compress**（若 MarketPlace 研究本身有价值，考虑单独 **Merge** 成一条研究类条目）

---

### Medical Assistive — `alzheimerdisease.html`

**Why keep it**：全站唯一有真实田野研究的项目。影随观察（shadowing）记录墙、护工 7:00–22:00 时间表、"被家属察觉 / 未被察觉的工作量"对半切分图——这类一手材料在产品设计作品集里极罕见。

**Proposed one-line story**：通过影随一位阿尔茨海默照护者的一整天，发现家属看不见的那一半工作量才是协作失效的根源，并为此设计了一套让隐形劳动被看见的沟通系统。

**Role**：UX Designer / Researcher

**Recommended visuals (1–4)**
1. `chart-caregiver-tasks-perceived-vs-unperceived.webp` — 中轴线劈开"被察觉 / 未被察觉"，直接支撑核心论点
2. `journey-caregiver-shadowing-timeline-notes-full-day.webp` — 手写便利贴时间墙，一手研究的质感
3. `chart-caregiver-daily-time-schedule.webp` — 7:00–22:00 工作密度
4.（可选）`system-lighting-and-data-visualization-components.webp` — 最终产品组件（三态灯光信号）

**What to remove**：5 张无文字标签的抽象概念示意（`illustration-caregiver-family-attention-curves` / `-narrow-overlap-line-diagram` / `-visible-vs-invisible-intentions` / `-caregiver-family-overlap-coherent-actions` / `-diverse-trials-to-success-through-collaboration`）——这些是学术论文式的抽象模型图，读者读不出信息；病房实拍照片（`photo-caregiver-assisting-patient-in-wheelchair`、`photo-patient-in-bed-with-vital-monitor`、`photo-hospital-ward-observation-contact-sheet`）**涉及可辨认患者，公开展示前必须确认授权，否则移除**；h2 "Ideation on" 标题被截断，需重写。

**Recommended status**：**Compress**

---

### TikTok Research — `tiktok-research.html`

**Why keep it**：唯一的量化研究条目，且切入点（埃及市场女性用户安全感知）足够具体，不是泛泛的"我会做定量研究"。

**Proposed one-line story**：在埃及市场做安全感知调研，用分性别的数据证明女性用户遭遇的有害内容类型与顾虑显著高于整体，据此给出安全策略的优先级。

**Role**：Quantitative Research & Analysis

**Recommended visuals (1–2)**
1. `chart-unsafe-content-types-female-vs-all.webp` — 女性 vs 整体的有害内容类型分布
2. `chart-reasons-for-not-sharing-videos-female-vs-all.webp` — 不愿分享的原因排序

**What to remove**：`hero-egypt-female-safety-perception-title.webp`（标题图，压缩版本用不上）。**当前页面最大的问题不是内容多，而是没有结论**——两张图摆在那里，没有说出"所以安全策略应该先做什么"。压缩版必须补上这一句。

**Recommended status**：**Compress**（已是压缩态，需补结论）

---

### Fashion — `fashion.html`

**Why keep it**：能证明视觉/材质训练背景，与"AI-first 产品设计"形成对照，说明设计判断力的来源。但它不该以一个独立页面的形式存在——全页只有 1 个标题、2 张图，而这 2 张还是同一张拼贴的完整版与裁切版。

**Proposed one-line story**：服装设计训练留下的东西：对材质、廓形和成组视觉关系的判断，现在用在界面上。

**Recommended visuals**：`photo-beach-editorial-collection-collage-trimmed.webp` 一张（裁切版构图更紧凑，完整版留白过多）

**What to remove**：`photo-beach-editorial-collection-collage-full.webp`（与裁切版重复）、整个独立页面

**Recommended status**：**Merge** — 并入 About 页作为背景段落的一张图，或放进 Playground 的"视觉训练"分区。同时移除全站 footer/nav 对 `fashion.html` 的链接。

---

## 6. Asset Inventory

**总量**：261 张唯一原图 + 827 个响应式变体，94 MB（`docs/CATALOG.md:3`）；11 段视频 15.7 MB；2 个 Lottie。

### Strong reusable assets（直接可用）

| 类别 | 代表 | 为什么强 |
|---|---|---|
| 前后对照 | `flow-registration-workflow-before/after`、`chart-instruction-read-efficiency-before/after`、`screen-legacy-account-opening-screens-cn` | 有基线、有改动、可验证 |
| 量化证据 | `chart-registration-time-benchmark-37s-vs-121s`、`chart-feature-tour-skip-behavior-breakdown`、`chart-unsafe-content-types-female-vs-all` | 数字来自真实后台/调研，不是示意 |
| 一手研究 | `journey-caregiver-shadowing-timeline-notes-*`（3 张）、`chart-caregiver-interview-quotes-affinity-board` | 田野记录，无法重现 |
| 系统规格 | `system-guidanz-design-system-grid-margin-spacing`、`system-ecm-install-message-matrix-part1`、`system-eaccount-failure-message-audit` | 展示穷举式的系统思维 |
| 方案论证 | `wireframe-single-hand-reach-heatmap-action-menu`、`wireframe-add-team-member-dialog-explorations` | 提出问题 → 可视化证明 → 改设计的完整闭环 |
| 视频 | `case-lark.mp4` `case-mckinsey.mp4` `case-opusclip-marquee.mp4` `case-atlasnova.mp4` | 首页四张卡的现役素材，已有配套 poster |

### Assets needing RETOUCH（信息好，排版/裁切/字体需统一）

- 全部 persona 卡（McKinsey 3 张 + Opus Clip 3 张原声卡）
- 全部 journey / experience map（Lark、MiFinance、Cummins 各 1–2 张）
- 跨平台流程 `flow-*-Nup` 系列（Lark 10 张、Cummins 3 张）
- 各案例开篇 hero（`hero-lark-onboarding-three-phone-mockup`、`hifi-liveshop-buyer-app-hifi-8up`、`hero-cummins-diagnostic-session-screens`、`hero-mi-finance-eaccount-app-showcase`）

### Assets needing REBUILD（信息有价值，视觉要重做）

| 资产 | 新视觉要传达什么 |
|---|---|
| `chart-registration-time-benchmark-37s-vs-121s` | 只有两个数字和它们之间的差距。去掉图库人物 |
| `chart-feature-tour-skip-behavior-breakdown` | "绝大多数人根本没看完"这一个结论，而不是四个并列切片 |
| Opus Clip 4 张 AB 对照图 | 两版并列 + **明确标出哪版胜出、依据是什么** |
| McKinsey 4 张测试结论三栏页 | "已验证 / 机会点 / 待验证"三态可快速扫描，而不是三栏正文 |
| Opus Clip `.mov` 四段 | 技术性重建（容器格式）。**`camxmg` 分支 `a1284ac` 已完成，取用即可** |
| `chart-solution-assessment-radar-5axis` | 五维雷达图不可读；改成一句取舍结论 |

### Assets needing REPLACE（当前视觉弱，需要新图）

| 资产 | 新视觉要传达什么 |
|---|---|
| McKinsey 8 张 `competitive-*` → 1–2 张 | 竞品在"沉浸感 vs 购买效率"上各自的位置，以及我们选了哪一格 |
| Opus Clip 4 张 `competitive-*` → 1 张 | 竞品在"AI 自动程度 vs 用户可控程度"上的分布 |
| Lark 3 张 `hero-hmw-*` | 章节封面统一由新视觉系统承担 |
| 所有 `bg-*` 装饰背景（bg/ 目录 5 张 + 各案例 2 张弦线艺术图） | 由年轮视觉系统统一替换 |

### Assets to REMOVE

- **全部 spot 插画**：Lark 5 张、McKinsey 5 张、MiFinance 1 张、Alzheimer 5 张抽象示意 = **16 张**。这些扁平风配图对内容零贡献，且是最典型的"模板作品集"信号。
- `icon-challenge-callout-lightbulb.webp` — CATALOG 记录其文字近白不可见，是坏掉的资产
- `photo-beach-editorial-collection-collage-full.webp` — 与裁切版重复
- Lark 2 张团队合影 — 与产品论点无关且涉及可辨认人物
- McKinsey 3 张落地页概念稿 — 营销视觉与产品故事无关
- `docs/CATALOG.md` 标 `💤` 的项 — CSS 有规则但选择器从不命中，站上从不渲染
- **827 个 `-p-NNN` 响应式变体**：这是 Webflow 的 srcset 机制产物。一旦离开 Webflow（`camxmg` / `1uadnd` 两个分支都在做这件事），Astro 的图片管线会自行生成，这批文件即全部失效。**这是最大的一块死重量，但必须等迁移决定之后再动。**

### 有肖像/客户可识别风险的资产（⚠️）

CATALOG 已逐张标注。改版对外发布前需要一次集中确认：
- Lark 24 张、McKinsey 30+ 张（竞品拆解与测试页几乎全部）、MiFinance 12 张、Cummins 9 张、Alzheimer 6 张（含真实患者照片）、Fashion 2 张
- **Alzheimer 的三张病房实拍风险最高**（可辨认患者 + 医疗场景），必须先确认授权

### Videos / animations worth preserving

- `case-*.mp4` 四段（首页现役）— **KEEP**
- `1.mp4` `2.mp4` `3.mp4`（Opus Clip 操作录屏）— **KEEP**，但文件名需重命名为有意义的名字
- 4 段 `.mov` — 用 `camxmg` 分支的 mp4 版本替换
- `assets/lottie/67e4cc9be538c95e85af1a9e_Showreel...json`（Opus Clip 页用）— 评估是否仍需要
- `assets/lottie/67f757f6b131fbe53d1af697_Flow_2.json` — **只被 `index.webflow.html` 引用**，旧首页下线后即成孤儿

---

## 7. Homepage Audit

*（仅记录内容与结构观察，不做重设计）*

### 现有 sections（`src/pages/index.astro`）

1. **Hero**（`section.hero`，两栏）
   - 左栏：eyebrow "Yanice Yang" + meta "Product Designer / Bay Area, US"
   - 右栏：eyebrow "Portfolio" + h1 = `<MorphingStatement>` React island（文字 morph 动效）
   - 背景：`LandingCanvasGradient`（ShaderGradient WebGL）+ 静帧兜底 + 两层 cover 遮罩 + `#yy-flow` ASCII canvas
2. **Featured projects**（`section.index#work`）
   - eyebrow "Featured projects" + `<ProjectIndex>` 渲染 4 张卡

### 项目层级

`landingProjects()` 按 `landingOrder` 取 `featuredOnLanding: true`：
1. Opus Clip（`landingOrder: 1`）
2. **AtlasNova（`landingOrder: 2`，`href: null`）**
3. McKinsey Ecommerce（3）
4. Lark Design（4）

### 观察

- **第 2 张卡点不进去。** AtlasNova 占据了黄金的第二位，但没有目标页面。首页最强的一个位置目前是空转的。
- **h1 是一个动效组件，不是一句话。** `MorphingStatement` 在 morph 多句文案。SEO 上首页没有稳定的 h1 文本；叙事上，访客第一眼看到的是"文字在变"，而不是"她是做什么的"。
- **首页没有任何一句说明"她做什么、为谁做、做成过什么"。** 现有全部文案是：姓名、Product Designer、Bay Area US、Portfolio、Featured projects，加上 morph 的句子。四张卡各带一句 `note`。没有 About 引导、没有联系方式、没有 Resume 入口（这些都在 nav 面板里）。
- **两套首页并存**：`index.webflow.html` 仍被 `scripts/legacy-passthrough.mjs` 拷进 `dist/`，展示 6 个项目、旧标题（"Build new AI feature for video snippet tool"、"Improve onboarding experience in Lark..."）。这批旧标题实际上比现在的 `note` 更说明项目做了什么，**重写文案时值得回头取用**。
- **卡片素材不齐**：Opus Clip / AtlasNova 只有 video（无 cover），McKinsey / Lark 有 cover + video。`validateProjects()`（`src/data/projects.ts:357`）只校验"至少有其一"，所以不齐是被允许的，但呈现上会不一致。
- **Footer 在 `yy-chrome.js` 里全站共用**，首页没有独立 footer 内容。
- **Nav 结构**：Work / About / Resume 三个面板（`yy-chrome.js`）。Work 面板标题 "Selected projects"，与首页的 "Featured projects" 说的是同一批东西但用了两个词。

### 未来需要重构的内容（不在本步做）

- AtlasNova 卡的落地目标
- 一句能立住的定位陈述（现在完全缺失）
- Featured / Selected 用词统一
- 旧首页（`index.webflow.html`）的去留决定

---

## 8. About Audit

*（仅记录内容与结构观察，不做重设计）*

### 现有内容（`aboutme.html`，170 行）

```
h1  I'm Yanice Yang            + illustration-ai-generated-self-avatar.webp（AI 生成头像）
    背景：bg-aurora-light-accent.png（彩虹弥散光晕）
h2  Fun Fact
h2  A little about me
h3  I am a dog lover!          + photo-pet-photobooth-strip / photo-feeding-two-dogs-treat
h3  I enjoy Skiing;)           + photo-snowboarder-on-slope-portrait / photo-ski-resort-gondola-slope
h3  I am a home cook           + photo-hotpot-table-with-dog / photo-hotpot-spread-kitchen
h3  I am passionate of traveling + photo-jeep-summit-above-clouds / photo-sandstone-canyon-group-photo
```

### 链接与联系方式

- `mailto:yaniceydesign@gmail.com`
- `https://www.linkedin.com/in/yanice-yang`
- **Resume：`https://302437672248143872.hello.cv/`（第三方托管，hello.cv）**
- 站内：`index.html` / `projects.html` / `fashion.html` / `aboutme.html`

### 观察

- **没有职业履历。** 整个 About 页只有 4 个兴趣分组 + 8 张生活照。没有工作经历、没有教育背景、没有能力陈述、没有职业叙事。而 nav 里的 Resume 面板（`yy-resume.js`，367 行）恰恰有 Work / Education / Awards / Publication / Skills 五个分区——**履历信息在 nav 面板里，About 页里没有**。
- **Resume 有三个来源**：nav 面板（自建）、`hello.cv` 外链、footer 的 resume 图标。三处内容是否同步无法从代码判断，需人工核对。**这是一个明确的单点真相问题。**
- **两个标题重复**："Fun Fact" 和 "A little about me" 下面是同一批兴趣内容。
- **文案有语法错误**："I am passionate of traveling"（应为 `about`）、"I enjoy Skiing;)"（分号笑脸 + 大写 S）。
- **alt 文本与图不符**：`photo-snowboarder-on-slope-portrait.webp` 的 alt 写 "Skier in a purple jacket... beside a snowboard"（滑雪者 vs 单板，混用）；`photo-hotpot-table-with-dog.webp` 的 alt 完全没提那只狗。
- **四张照片被存成横向但内容旋转了 90°**（CATALOG 逐张记录：`photo-feeding-two-dogs-treat`、`photo-sandstone-canyon-group-photo`、`photo-ski-resort-gondola-slope`、`photo-snowboarder-on-slope-portrait`）。这是需要在源文件上修的图像缺陷。
- **`docs/CATALOG.md` 中 about 段落的"HTML 章节标为 X"注记是错的。** 经 DOM 顺序核对（`aboutme.html:130/132`、`137/139`、`144/146`、`151/153`），图片与标题的配对实际上是正确的。改版时不要按 CATALOG 那几条注记去"修复"一个不存在的问题。

### Recommend eventually stay vs disappear

**留**：AI 生成头像（有个性且与 AI-first 定位呼应）、狗 / 火锅 / 滑雪 / 旅行四组中挑 2 组最强的、邮箱与 LinkedIn。

**去**："Fun Fact" 与 "A little about me" 二选一、8 张照片压到 3–4 张、`fashion.html` 的独立链接（内容并进来）。

**必须补**：职业叙事——她是谁、做过什么、现在关心什么。这是全站最大的内容空洞：一个作品集网站的 About 页面完全没有职业信息。

**必须定**：Resume 的单一真相源（nav 面板 / hello.cv / 下载文件，三选一）。

---

## 9. Playground Sources

现有材料足够开出一个 Playground，不需要从零做。按可用度排序：

### 已在 main 上、已上线运行的

| 材料 | 位置 | 类型 |
|---|---|---|
| **ShaderGradient 首屏 canvas** | `src/components/islands/LandingCanvasGradient.tsx`（7982 B） | WebGL / 生成式图形 |
| **Morphing Text** | `src/components/islands/MorphingStatement.tsx`（6900 B，改自 Magic UI MIT 版本） | 排版动效 |
| **逐词生成效果** | `src/components/islands/TextGenerateEffect.tsx` | 排版动效 |
| **案例笔记生成** | `src/components/islands/CaseNoteGenerate.tsx` | AI 感交互 |
| **ASCII flow canvas** | `assets/js/yy-flow.js`（221 行）+ `<canvas id="yy-flow">` | Canvas / 创意编程 |
| **每项目 ASCII 光标** | `assets/js/yy-cursor.js`（142 行）+ `yy-cursor.css` | 交互实验 |
| **链接悬停预览** | `assets/js/yy-link-preview.js`（196 行） | 交互实验 |
| **滚动驱动图层系统** | `assets/js/yy-canvas-motion.js`（300 行，驱动 canvas/cover 的 CSS 变量） | 动效系统 |
| **玻璃态 nav / 面板系统** | `assets/js/yy-chrome.js`（1489 行）+ `yy-chrome.css` | 界面系统 |
| **动效 token 体系** | `assets/css/yy-tokens.css` — 时长/缓动/位移按**用途**而非数值命名，注释里写明来源是 transitions.dev 且"MEASURED, not invented" | 视觉系统 |

### 在未合并分支上（需要先取出来）

| 材料 | 分支 | 状态 |
|---|---|---|
| **3D 项目转盘**（五座位、惯性摇摆、滚动选中、磨砂玻璃卡） | `cursor/projects-3d-carousel-d425`（PR #13 open，31 commits） | `ProjectsCarousel3D.tsx` + 独立 Vite 入口 + 7 张占位图。**投入最大的一个未上线实验** |
| **Flluid Studio 可玩页** | `cursor/flluid-studio-page-f755`（PR #37 open） | `flluid-studio.astro` + `yy-flluid.js` + 独立 css |
| **Brand Kit v1 结构** | `brand-kit-v1`（无 PR） | `brand-kit-v1.astro` + `MediaGrid.astro` + `MediaPlaceholder.astro`。**注意：这是 AtlasNova 项目本身，不是一个独立实验** |
| **磨砂玻璃缩略图框** | `claude/thumbnail-animation-design-zk3vy6`（无 PR） | 把 Opus Clip 首页缩略图套上 nav 同款玻璃框 |
| **设计系统 token 层 + Figma 机读清单** | `claude/figma-design-system-code-sync-1uadnd`（PR #39 closed，17 commits） | token manifest、按角色命名的字阶、Figma 交接文档。**这是年轮视觉系统落地时最相关的一份前置工作** |
| **METHOD.md（推理循环 / 评估清单）** | `claude/website-tech-stack-eval-camxmg`（无 PR，5 commits，2026-09-05 最新） | 文档类，非 Playground 材料，但**是全仓最新的未合并工作，不要误删** |

### 现有的、可作为 Playground 条目的设计文档

- `docs/superpowers/specs/2026-08-27-landing-case-wipe-enter-design.md`
- `docs/superpowers/specs/2026-08-27-ux-polish-structure-cleanup-design.md`

**Playground 的现成叙事**：这些不是"我做了些动效小玩具"，而是"我在自己的作品集上把设计判断直接写成了代码，并且量过效果"——`yy-tokens.css` 的注释、README 里的图片压缩数据（321MB→96MB，-70%）、移动端字号审计（479px 下小于 11px 的元素从 110 个降到 6 个）都是这条叙事的证据。**这条线目前在网站上完全不可见。**

---

## 10. Design Consistency Issues

按复现模式归组，不逐条列举。

### A. 两套字体系统并行

`assets/css/yy-tokens.css` 用本地 woff2 定义 Plus Jakarta Sans（4 个字重）+ Caveat；同时 8 个 Webflow 页面仍通过 `WebFont.load` 远程加载 Montserrat / Georgia / Caveat（README 记录：从 8 个家族 52 个变体裁到 4 个家族 29 个变体）。**结果是 Astro 首页和 Webflow 案例页用的根本不是同一套字体**，访客从首页点进案例页时字形会变。年轮视觉系统落地前必须先解决这一层。

### B. 六套页面边距系统

跨全部 CSS 统计 `padding-left`：`0%`(51 处) / `0`(47) / `5%`(35) / `10%`(34) / `15%`(13) / `20%`(6) / `25%`(3)，另有 `20px` / `36px` / `18px` / `10px` / `12px` 等固定值。`max-width` 同样散：`100%`(75) / `none`(23) / `80%`(14) / `90%`(12) / `70%`(9) / `600px` / `36em` / `900px` / `80vw` / `45%` / `var(--frame-spine)`。**同一个网站里，"内容离屏幕边缘多远"有至少六个互不相干的答案。** PR #38（open，`cursor/unify-edge-gutter-a8c8`）正是在做这件事的收敛，改版前应先决定它的去留。

### C. 案例页标题层级各写各的

| 页面 | h1 | 标题总数 | 具体问题 |
|---|---|---|---|
| Opus Clip | 有 | 27 | h2 挂在 h3 下面（Design→4×h2，Highlights→4×h2） |
| McKinsey | **无** | 22 | 同样 h2 挂 h3 下；`Role` 出现两次；罗马数字三种写法 |
| Lark | 有 | 21 | 6 条个人能力当 h3 排；"Privacy concern" 重复出现 |
| MiFinance | 有（**被截断**） | 10 | h1 "Create A Delightful User Experience for" 缺宾语 |
| Cummins | **无** | 6 | 全页只有 6 个 h2，无层级 |
| Alzheimer | 有 | 10 | h2 "Ideation on" 被截断 |
| TikTok | 有 | 2 | 无结论 |
| Fashion | 有 | 1 | — |

这不是"标题不好看"，是**读者无法用同一套心智模型读第二个案例**——每换一页都要重新学一遍这个页面怎么组织。

### D. 两套案例样式系统，其中一套完全空转

- `assets/css/yy-case-layout.css`(363 行) + `yy-case-type.css`(194 行) — Webflow 案例页在用
- `src/styles/case-study.css`(269 行) + 6 个 `Case*.astro` 组件 + `CaseStudyLayout.astro` — **零个已发布项目在用**。`src/pages/[slug].astro` 的 `getStaticPaths()` 依赖 `astroCaseStudies()`，而唯一的 astro-engine 项目 AtlasNova 是 `in-progress`，所以这条路由今天输出 0 个页面。

新案例结构应该建在已有的 Astro 组件上，而不是再起一套。

### E. 视觉密度与素材配比失衡

| 项目 | 图数 | 体积 | featured? |
|---|---:|---:|---|
| Lark | 50 | 26 MB | ★ |
| McKinsey | 43 | 15 MB | ★ |
| MiFinance | 29 | 13 MB | — |
| Cummins | 25 | 5 MB | — |
| Opus Clip | **21** | 7.8 MB | **★** |
| Alzheimer | 20 | 13 MB | — |
| TikTok | 4 | 0.4 MB | — |
| AtlasNova | **0** | — | **★** |

**素材密度和项目重要性完全反向。** 首页宣称的四个主力里，一个 0 张图、一个 21 张图（少于两个非 featured 项目）。

### F. 装饰图形来自四个互不相干的来源

弦线艺术（McKinsey 深蓝 / Cummins 深红 / bg 蓝）、渐变色块群（`bg-gradient-blob-cluster`）、彩虹弥散光晕（About）、扁平 spot 插画（16 张，四种画风）、图库时装照（`photo-three-models-black-outfits-studio` 作通用背景）。**没有任何一条视觉线索把这些串起来。** 这也正是年轮系统要解决的核心问题。

### G. 设备样机处理不统一

等距三机身白色样机（Lark hero）、无框截图并列（Opus Clip AB 对照）、斜置界面堆叠（Cummins hero、MiFinance 封面）、纯平铺网格（McKinsey 8up）——四种截然不同的产品展示语言。

### H. 图注体系缺失

全站没有统一的图注（caption）样式。图片信息全部依赖图内文字，`docs/CATALOG.md` 里那 261 条"这张图在页面里做什么"的描述**没有任何一条出现在页面上**。这是一份现成的图注库，一次都没被用过。

### I. 项目元数据字段各页不同

Opus Clip：`Overview / Role / Timeline`；McKinsey：`Overview / My Role / Industry / Role / Form / Duration`；Lark：`Overview / My Role`；Cummins：`Overview / My Role`；MiFinance / Alzheimer / TikTok：无。`src/data/projects.ts` 里的 `scope` 字段写法也不齐（"Web-based AI SaaS" / "Web App" / "Mobile App" / "Web&Mobile App" / "Interaction & Craft" / "Enterprise · Digitalization" / "Health · Wearable" / "Gallery" / "Quantitative research & analysis"）——**九个项目九种粒度**。

### J. 全站被搜索引擎屏蔽

`vercel.json:19`：`X-Robots-Tag: noindex, nofollow, noarchive` 覆盖 `/(.*)`。这是有意的（PR #41），但改版上线前需要一个明确的解除决定。

---

## 11. Recommended Revamp Order

排序依据是**依赖关系**和**能否解锁后续工作**，不是导航顺序。

### 阶段 0 — 决策，不写代码（先做，因为它决定后面全部工作的底座）

**必须先定三件事，否则后续每一步都会返工：**

1. **技术底座：留在 Webflow 直出，还是全面迁 Astro？**
   两个分支已经各自做过一遍：`camxmg`（重建为 Astro + React + Tailwind，抽出 Webflow 内容，5 commits，最新）和 `1uadnd`（把最后两页迁到 Astro 并删掉 Webflow 运行时，17 commits，PR #39 已关闭）。这个决定直接决定：827 个响应式变体的去留、两套字体系统能否合并、六套边距系统能否收敛、`src/styles/case-study.css` 那套空转的组件能否启用。**在没有这个答案之前做任何视觉工作都是在两套系统上各做一遍。**
2. **Resume 的单一真相源**：nav 面板 / hello.cv 外链 / 下载文件，三选一。
3. **`index.webflow.html` 和 `projects.html` 的去留**：一个是仍在线的旧首页，一个是全站每页都链接的空页面。

### 阶段 1 — AtlasNova 建页（它是新结构的样板，不是第四个待改的项目）

放在最前面的理由：
- 它是首页四个 featured 里唯一点不进去的，损失最直接
- 它是唯一没有 Webflow 遗留结构的项目，**可以直接在 `src/styles/case-study.css` + `Case*.astro` 那套已建好但空转的组件上做**
- 一旦它按新规范建成，其余三个 featured 就有了明确的改造目标，不用边改边定规范
- `brand-kit-v1` 分支已有结构草稿 + MediaGrid/MediaPlaceholder 组件可取用

**依赖**：阶段 0 的技术底座决定。**产出**：新案例结构规范 + `[slug].astro` 路由第一次真正输出页面。

### 阶段 2 — 视觉系统收敛（年轮系统的地基）

顺序上必须在年轮设计之前，因为年轮系统要落在一套确定的字体/间距/边距上：
1. 字体统一（消除 Plus Jakarta Sans 与 Montserrat 双轨）
2. 边距收敛（评估 PR #38 `cursor/unify-edge-gutter-a8c8` 的方案是否可直接采用）
3. 建立图注体系（把 `docs/CATALOG.md` 那 261 条描述接进页面）
4. 取用 `1uadnd` 分支的 token manifest 与按角色命名的字阶

**依赖**：阶段 0。**解锁**：年轮视觉系统才有落点。

### 阶段 3 — 三个已发布 featured 案例改造

按"改造难度 × 证据强度"排序：

1. **Lark 先改**——证据最硬（37.3s vs 121.4s 基准、跳过率数据、AB 前后对照），改造主要是**做减法**（50 张图砍到 12–15 张、6 条能力清单收进 Overview、删 16 张模板插画里的 5 张）。减法比补内容快，且立刻能看到新结构是否成立。
2. **Opus Clip 次之**——需要**做加法**（pivot 决策的视觉、AI/人工责任边界图、Beta 结果数字），且要先解决 `.mov` 转码（`camxmg` 分支现成）。
3. **McKinsey 最后**——工作量最大：8 张竞品拆解要压成 1–2 张、7 张品牌探索压成 1 张、4 张测试结论页要重画，且 30+ 张图需要脱敏确认。

### 阶段 4 — 五个次要项目压缩

MiFinance / Cummins / Medical Assistive / TikTok Research / Fashion。压缩模板在阶段 1–3 已经定型，这一阶段是套模板执行，可以并行。

**注意两件事**：Medical Assistive 的三张病房实拍需先确认肖像授权；Cummins 的 MarketPlace 研究章节属于另一个项目，要单独决定去留。

### 阶段 5 — 首页与 About 重写

放在最后的理由：**首页是对下面所有内容的索引，About 是对整个职业叙事的总结。内容没定型之前写这两页，一定会重写。**

- 首页：补上目前完全缺失的定位陈述；决定 `MorphingStatement` 作为 h1 是否保留；四张卡的素材配齐（cover + video 一致）
- About：补上目前完全缺失的职业履历；照片从 8 张压到 3–4 张；修四张旋转 90° 的源图；修 alt 文本与语法

### 阶段 6 — Playground

放在最后不是因为不重要，而是因为它的材料**不依赖任何前面的阶段**（全部是独立的交互实验），随时可以插队做；但它需要阶段 2 的视觉系统才能与全站统一。

取材优先级：3D 项目转盘（PR #13，31 commits 的投入不该浪费）→ Flluid Studio（PR #37）→ 已上线的 island 与 canvas 实验 → 作品集自身的工程决策叙事（图片压缩 -70%、移动端字号审计）。

### 阶段 7 — 解除 `noindex`

改版内容全部就位后，移除 `vercel.json` 的 `X-Robots-Tag`，让站点可被检索。

---

### 依赖关系摘要

```
阶段 0（技术底座决定）
   ├──> 阶段 1（AtlasNova 建页 = 新结构样板）
   │        └──> 阶段 3（三个 featured 改造）──> 阶段 4（五个次要压缩）
   └──> 阶段 2（视觉系统收敛）
            ├──> 年轮视觉系统设计（下一步，不在本次范围）
            └──> 阶段 6（Playground）

阶段 3 + 阶段 4 完成 ──> 阶段 5（首页 + About 重写）──> 阶段 7（解除 noindex）
```

**关键路径上的唯一阻塞点是阶段 0。** 在"留 Webflow 还是迁 Astro"这个问题有答案之前，阶段 1 和阶段 2 都无法开始，而它们各自都是后面所有工作的前置。

---

## 审计边界说明

- 本次审计基于仓库代码、`docs/CATALOG.md` 的图片描述、以及 13 个远端分支的 diff。**没有打开线上站点做视觉核对**，也没有逐张重新看图（CATALOG 已有逐张描述，本文引用它并在发现矛盾处标注）。
- `docs/CATALOG.md` 中 about 段落的"HTML 章节标为 X"注记与实际 DOM 顺序不符（已在第 8 节说明）。CATALOG 其余部分未做全面复核。
- 各项目的"⚠️ 客户可识别 / 肖像"标记来自 CATALOG 的 `reuse` 字段，**对外发布前仍需人工逐张确认**，本文档不构成授权判断。
- 「项目年龄」未逐一确认：仓库 git 历史始于 Webflow 导出后的清理阶段，不反映项目实际发生时间。需要时应从简历或原始设计文件确认。

**本次审计未修改任何文件。除新增本文档外，仓库内容与 `origin/main` 一致。**
