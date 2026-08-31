# Figma 设计系统 revamp 指令书

给能直接写 Figma 的 AI（Figma MCP / 插件）。整份文件可以原样粘贴过去当 prompt。

---

## 0. 这份文件是什么

代码侧的设计系统**已经建好了**。这份文件的作用不是描述目标，而是给出一份可执行的操作清单：把 Figma 里的变量改成和代码逐字一致。

**唯一的数据来源是仓库里的 `docs/design-tokens.json`。**它由 `scripts/build-tokens.mjs` 从 `assets/css/yy-tokens.css` 生成，包含 168 个 token 的层级、分类、原始值、解析后的值，以及每个值"为什么是这个数"的说明。

三条硬规则：

1. **不要发明任何数值。** 每个数字都来自 `design-tokens.json`，或者回来问 Yanice。JSON 里没有的东西，就是代码里不存在的东西。
2. **不要直接读 CSS 猜。** 仓库里有 300 多个 `--custom-property`，分属四类完全长得一样的东西：真 token、页面局部变量（`--ops-accent`、`--mif-ink-2`）、模式覆盖、以及历史遗留。扫 CSS 一定会猜错。JSON 已经把这件事解决了。
3. **token 名 = CSS 变量名，逐字符相同。** 不做映射表。Figma 变量就叫 `--text-body`，不叫 `text/body` 也不叫 `Text Body`。映射表是所有设计系统脱钩的起点。

---

## 1. 代码侧长什么样（这决定了 Figma 能做什么）

| 事实 | 对 Figma 的约束 |
|---|---|
| Astro 5 静态站，纯手写 CSS + CSS 自定义属性 | 接口就是 CSS 变量名本身。没有 Tailwind config 那层，所以**变量名就是契约** |
| 没有 CSS Modules、没有 scoped `<style>` | 组件样式不会被改名或加 hash，Figma 里的组件名可以直接对应 class 名 |
| 自托管字体子集：Plus Jakarta Sans 400/500/600/700 + Caveat 500 | **只有这 5 个字重存在。**任何其他字重会静默 fallback。不要在 Figma 里用 300 或 800 |
| 没有 theme runtime，没有用户可切的深色模式 | 深色是**表面（surface）**，不是模式。见第 4 节 |
| 三个 Shadow DOM 样式表（nav / about / work / resume 面板） | 它们继承自定义属性，但看不到 `:root` 的普通规则。所以颜色和字号必须走 token，不能走全局 class |
| 断点写在媒体查询里，不能是变量 | 断点在 JSON 的 `breakpoints` 字段里，Figma 侧当画板宽度用 |

---

## 2. 三层结构，和它们各自的规矩

```
Primitives (113)  →  Semantic (55)  →  Components
原始值，按"它是什么"命名      按"它干什么"命名        用 semantic，不用 primitive
--color-ink-900             --ink
--size-16                   --text-body
--space-28                  （spacing 直接用 primitive，见下）
```

在 Figma 里建成 **两个 collection**：

- `Primitives` — 113 个，全部 hidden from publishing（设计师不该直接选它们）
- `Semantic` — 55 个，这才是给设计师用的

**Components 不建 variable，建 component。**见第 7 节。

### spacing 是个例外，别改成 semantic

`--space-*` 21 级直接给页面用，没有 semantic 层。这是故意的：spacing 的"语义"是位置关系（这两个块之间），不是角色（这是 padding 还是 gap），硬造 `--space-section-gap` 只会造出 40 个只用一次的 token。**Figma 里 spacing 就用 primitive collection 里的 `--space-*`。**

---

## 3. 字号：一套阶梯，两个 mode（最重要的一节）

这是整个系统里唯一需要 mode 的地方，也是最容易做错的地方。

代码里有**两套字号阶梯，都在线上跑**：

| token | document 模式 | landing 模式 | 用在哪 |
|---|---|---|---|
| `--text-micro` | 11px | 10px | eyebrow、scroll 提示、nav 方向标 |
| `--text-caption` | 13px | 11px | 图注、标签、meta、小标题 |
| `--text-body` | 16px | 14px | 正文，以及页面根字号 |
| `--text-lead` | 20px | 18px | 卡片名、resume 职位 |
| `--text-title` | 25px | 22px | 段落 h2、引言 |
| `--text-heading` | 32px | 28px | case study 的 h1 |
| `--text-display` | 40px | 35px | case 标题、resume 姓名 |
| `--text-figure` | 48px | 42px | 数据、count-up 数字 |
| `--text-hero` | 64px | 56px | 只有首页大标题 |

**在 Figma 里建成一个 collection、两个 mode**，mode 名就叫 `document` 和 `landing`。

**不要**建成两套 token（`--text-body` 和 `--text-body-landing`）。**不要**只取一套然后当另一套是缩放。landing 那套的取整是一个个眼睛定的（16→14，不是 16×0.875=14），浏览器算不出来。

为什么要单独讲这么多：这套阶梯原本叫 `--t-11 / --t-13 / --t-16 …`，按像素值命名，而首页把每一级都往下改了约 12.5%——所以 `--t-16` 在首页是 14px，**名字在说谎**。这也是整个设计系统里唯一没法同步到 Figma 的部分，因为一个 Figma 变量装不了两个值。现在已经改好了（改动经过逐点验证，124 个字号位置渲染结果一字不差）。**如果你在 Figma 里看到任何叫 `t-16`、`t-40` 这类名字的变量，那是旧的，删掉。**

### 行高不跟着 mode 变

`--lh-*` 5 个只有一套值，两个 mode 下都一样：

`--lh-display: 1` · `--lh-tight: 1.15` · `--lh-heading: 1.25` · `--lh-caption: 1.45` · `--lh-body: 1.55`

行高是**角色系统，不是尺寸系统**——16px 的标签和 16px 的正文需要不同行高，所以从字号推行高是错的。这条已经在代码里立过一次，不要在 Figma 里改回按字号推。

---

## 4. 深色是表面，不是模式

只有两个项目是深色页（Opus Clip 和医疗穿戴），chrome 靠 `assets/js/yy-chrome.js` 里两张按文件名的表适配。**代码里没有任何 theme runtime，没有用户可切的开关。**

所以 Figma 里建：

- `surface/default` — 浅色地（`--ground` = `#ffffff`。注意不是 `--color-offwhite`／`#fbfaf9`——那是 primitive，实测浅色 case 页的 body 全都渲染成纯白）
- `surface/inverse` — 深色地

**不要建 Light / Dark 两个 mode。**那会承诺一个不存在的能力，而且会让每个颜色 token 都被迫有两个值——其中一半是编的。

### 以后要做真深色模式的路径（现在别做）

写在这里是为了那天不用重建：真深色模式的做法是给 `Semantic` collection 加第三个 mode，因为语义色（`--ink`、`--ground`、`--hair`、`--rule`）已经是按角色命名的，加 mode 就够。`Primitives` 不动——`--color-ink-900` 永远是 `#242220`，深色模式改的是"`--ink` 指向哪个 primitive"，不是 primitive 本身。这也正是现在这套分层的价值。

---

## 5. Primitives：照抄，不要改

全部 113 个在 `docs/design-tokens.json` 里，`layer: "primitive"`。这里只点出几个容易做错的。

### 四个 RGB 三元组必须是三元组

```
--color-shadow-rgb: 62, 65, 116     卡片阴影里的那个蓝（13 处用到）
--color-glass-rgb:  255, 255, 255   玻璃填充 / 高光 / 描边（19 处）
--color-ink-rgb:    36, 34, 32      ink 带透明度（8 处）
--color-frost-rgb:  255, 250, 250   面板霜化——第三种白（3 处）
```

它们存成 `R, G, B` 字符串而不是颜色，因为代码要写 `rgba(var(--color-shadow-rgb), 0.12)`。**Figma 里存成 color，然后 alpha 变体从它派生**（Figma 支持 color 变量 + opacity）。不要把 13 个 alpha 变体各建一个 token。

注意 `--color-frost-rgb` 是**第三种白**，和 `--color-white`（`#ffffff`）、`--color-offwhite`（`#fbfaf9`）都不同。原来的 Figma 设计系统极可能把这三个压成了一个——那是错的，霜化面板会因此偏色。

### 两条线不是一个颜色

```
--rule:      #e9e9e9   普通分隔线
--rule-hero: #939393   hero 区的那条线
```

深浅差很多，原来的设计系统大概率压平了。

### spacing 是 4px 网格，28px 是一等公民

21 级，从 0 到 200px。`28px` 是全站用得最多的值（16 处），它不是 24 和 32 之间的将就，**它是主力**。原来的设计系统如果只给了 8 的倍数，`--space-28` 会缺。

不在 4px 网格上的例外只有三个，都在 layout 里，都是量出来的：`--col-gap: 17px`、以及两个 3px / 7px 的描边。不要"修"它们。

### 字号 primitive 现在有 17 个

两套阶梯一共用到 17 个不同的字号（10 / 11 / 13 / 14 / 16 / 18 / 20 / 22 / 25 / 28 / 32 / 35 / 40 / 42 / 48 / 56 / 64）。全都要，因为 mode 要指向 primitive。

---

## 6. Semantic：55 个，名字就是这些

```
色       --ink --ink-2 --ink-3 --ground --slot --hair --rule --rule-hero
玻璃     --glass-fill --glass-highlight --glass-border --glass-blur --glass-saturate --frost-fill
高度     --shadow-1 --shadow-2 --shadow-3 --shadow-hover
状态     --state-hover-opacity --focus-ring-color --focus-ring-width --focus-ring-offset --focus-ring-radius
层级     --z-canvas --z-cover --z-content --z-above --z-frost --z-nav --z-cursor
字号     --text-micro --text-caption --text-body --text-lead --text-title --text-heading --text-display --text-figure --text-hero
行高     --lh-display --lh-tight --lh-heading --lh-caption --lh-body
栅格     --frame-index --frame-case --frame-spine --col-label --col-label-case --rule-x --col-gap --col-content --edge
圆角     --slot-radius --case-radius
```

`--z-*` 分两段：0–3 是内容，8990 / 9000 / 9800 是 chrome。Figma 里这些不影响画布，但要建，因为它们是系统的一部分，而且能防止有人在设计稿里画出一个层级不可能实现的浮层。

---

## 7. Components：建什么，不建什么

### 建这些（代码里真实存在、且复用）

| 组件 | 状态 / 变体 |
|---|---|
| spine row（`.hero.row--ruled`） | 标签列 + 竖线 + 内容列，宽度全走 `--col-*` |
| case row（`.case.row--ruled`） | 同上，但 `--col-label-case` |
| eyebrow | 大写 + `0.12em` 字距 + `--text-micro` + 600 + `--ink-3`。这个组合在 7 个样式表里**逐字重复了 16 次**，它就是个没被提取的组件。（`--tracking-eyebrow` token 已经存在，但还没有任何地方用它——这 16 处仍然写着裸值 `0.12em`。代码侧待收。） |
| nav capsule | 561px 以上 / 560px 以下两态，外加 Resume 子态 |
| glass panel | default / expanded |
| cursor | default / on / chip |
| link preview card | — |
| footer credit bar | — |

**glass panel 特别注意**：代码里这个配方曾经有**三个互相飘掉的版本**（blur、saturate 和 6 个 alpha 值都不同）。现在统一成 `--glass-*` 五个 token。Figma 里必须只有一个 glass 组件，不要按页面各建一个。

### 不建这些

- **Button / Input / Card 这类通用组件**——代码里没有。建了就是给未来埋一个"设计稿里有、代码里没有"的坑。
- **`ProjectSlot` 的 `panel` / `gallery` 变体**——代码里是死分支。

### 还没定的一块（做之前问 Yanice）

`CaseStudyLayout` 加 7 个 case 组件（`CaseSection` / `CaseQuote` / `CaseStat` / `CaseMetaGrid` / `MediaFigure` / `MediaVideo` / `CaseStudyNav`）目前只被一个 noindex 的模板页用到，6 个真实 case study 各自有自己的页面。**在 Yanice 决定这套要留、要补完、还是要删之前，不要按它们建 Figma 组件。**

---

## 8. 交互状态：代码里有一条克制的规则，请保住它

**hover 只允许动 `opacity` 和 `transform`。**全站只有 3 处硬编码了 hover 颜色，其余全部只动透明度和位移。这是一套难得自律的系统，Figma 里不要给每个组件加 hover 色。

- hover：`--state-hover-opacity`（0.64）
- focus：`--focus-ring-color` / `-width` / `-offset` / `-radius` 四个 token 一组
- **`:active` 和 `[disabled]` 在代码里完全不存在。**如果 Figma 需要它们，那是新设计决定，先问 Yanice，不要自己编。

---

## 9. 每个变量的 description 必须写什么

这是这份文件里最容易被跳过、但长期收益最大的一条。

**每个 Figma 变量的 description 必须回答"为什么是这个值"，而不是重复这个值。**

`docs/design-tokens.json` 里 168 个 token 有 49 个已经带 `description` 字段——**直接用**。剩下的照下面三个例子的写法补。

写得好的三个例子：

> **`--ink-3`** ❌"三级文字色" ✅"`#6d6a63`。原来是 `#8a877f`，对 `--ground` 只有 3.44:1，不过 AA。调到 5.18:1。不要为了更浅回调。"

> **`--col-content`** ❌"内容列宽" ✅"492px。从线上实测出来的内容列宽度，不是设计挑的数。它和 `--col-label-case`（372）、`--col-gap`（17）一起决定竖线的 x 坐标，动任何一个，6 个 case 页的竖线就会各自站在不同位置。"

> **`--lh-body`** ❌"正文行高 1.55" ✅"1.55，无单位。行高按**角色**给，不按字号推——16px 的标签和 16px 的正文需要不同行高。所以 `--lh-*` 只有 5 个，且不随字号 mode 变。"

判断标准很简单：**如果 description 删掉之后，读者对这个 token 的理解没有任何损失，那它就没写。**

---

## 10. 同步机制

现在没有 Figma REST API，只能走 MCP，所以同步是**半自动的**，方向必须明确：

```
代码（yy-tokens.css）  ──  build-tokens.mjs  ──▶  docs/design-tokens.json  ──▶  Figma
                                                        ▲
                                                   唯一的真相
```

**这一轮：代码是源，Figma 对齐代码。**不要反向写回代码。

具体做法：

1. 读 `docs/design-tokens.json`。
2. 按 `layer` 建两个 collection，按 `category` 分组。
3. 每个变量的 `codeSyntax` 设成 `var(--变量名)`。这样 Dev Mode 里直接给出能用的 CSS，工程侧不需要查表。
4. 字号 collection 建两个 mode，值取 JSON 的 `modes[]`。
5. `description` 按第 9 节写。
6. 做完回报：建了多少个、跳过了哪些、哪些和你在 Figma 里看到的旧值冲突。**冲突清单比成功清单重要。**

以后如果 Figma REST API 可用了，正确的架构是 `scripts/sync-tokens.mjs` 拉 Figma variables 生成 `yy-tokens.generated.css`，由手写的 `yy-tokens.css` `@import`——这样生成永远盖不掉手写的注释和 motion 块。现在不做。

---

## 11. 从旧 Figma 设计系统里删掉什么

原来的设计系统是让 Figma agent 读线上网站反推出来的，而当时的线上网站是**两套系统穿一件外套**：一套 Astro + token，一套导出的静态页面加一个 19,487 行的样式表。所以旧设计系统里几乎必然有代码永远不会采用的值。

删掉：

1. **任何 `--t-<数字>` 命名的字号变量**（`t-11`、`t-16`、`t-40`…）。名字在说谎，已被 `--text-*` 取代。
2. **`--t-21`**。它只在首页被声明过，从来没有任何地方用它。
3. **`--resume-brand-cyan`、`--cover-blur`、`--blur-small/medium/large`、`--frame`、`--col-gap-case`、`--slot-w`、`--slot-h`**——代码里零引用，已删。
4. **任何从那个 19k 行样式表量出来的值。**判断方法：值不在 `design-tokens.json` 里 → 代码里没有 → 删。那套样式表连同它的运行时和 8 个存档已经在 2026-08 全部删除了。
5. **Light / Dark 两个 mode**（如果建了）。换成第 4 节的 surface。

---

## 12. 验收清单（Yanice 可以照着逐条对）

- [ ] Figma 里每个变量名和 `docs/design-tokens.json` 里的 `name` 逐字符相同，没有映射表
- [ ] 两个 collection：`Primitives`（113，不发布）+ `Semantic`（55）
- [ ] 字号是**一个** collection 两个 mode（`document` / `landing`），不是两套 token
- [ ] `--lh-*` 只有一套值，不随 mode 变
- [ ] `surface/default` + `surface/inverse`，**没有** Light/Dark mode
- [ ] 四个 RGB 三元组存成 color 变量，alpha 变体由 opacity 派生，不是 13 个独立 token
- [ ] `--color-white` / `--color-offwhite` / `--color-frost-rgb` 是三个不同的白，没被压平
- [ ] `--rule` 和 `--rule-hero` 是两个颜色，没被压平
- [ ] `--space-28` 存在
- [ ] 每个变量的 `codeSyntax` = `var(--名字)`
- [ ] 每个变量的 description 回答"为什么是这个值"，不是重复值
- [ ] 没有任何 `--t-<数字>` 残留
- [ ] 没有 Button / Input / Card 这类代码里不存在的通用组件
- [ ] 交回一份**冲突清单**：哪些旧值和 JSON 不一致

---

## 13. 需要 Yanice 拍板的事（不要自己决定）

1. **`:active` 和 `[disabled]`** — 代码里完全没有。要不要进设计系统？
2. **7 个 case 组件 + `CaseStudyLayout`** — 留、补完、还是删？（见第 7 节）
3. **两套字体规范** — McKinsey 和 Opus Clip 两个 case 页仍用自己的 rem 字号，没上 token 阶梯。要不要统一？统一是**设计改动**，不是同步。
4. **Lark 和 Opus Clip 在 767px 以下隐藏了影响力数字** — 手机上真的看不到那些研究数据和转化提升。这是从旧页面照搬的行为，值得重新决定。
5. **78 个还没进 token 的 hex 值** — 主要在 case study 样式表里。代码侧有 ratchet 保证只减不增。要不要现在收？
6. **首页 case 页颜色系统** — 每个 case 页有自己的一套局部色（`--ops-accent`、`--mif-ink-2` 等），刻意没进 token。要不要收进设计系统？

---

## 附：读 JSON 的时候注意两个字段

- **`modes`** — 被明确声明的模式。目前只有一个（landing 字号阶梯）。这些是**系统认可的**双值，建成 Figma mode。
- **`scopeOverrides`** — 页面样式表偷偷改了一个共享 token 的值。目前 13 条：7 条是 case study 重复了一遍深色调色板（代码侧待收），6 条是首页自己的栅格常量。**这些一条都不要照抄进 Figma。**每一条要么应该被提升成 mode，要么是独立 token，要么是 bug。
