# Dailywork Matters — Brand Image Generation Prompts

## 设计理念

核心概念：**"一天结束，你的成果被干净地记录"**
情感关键词：克制、清晰、宁静、优雅、日式美学
视觉关键词：单色线条、留白、版画质感、几何构图、文具/笔记本意象

**风格参考：**
- 单色/双色调（teal-gray 青蓝灰 为主色）
- 强线条感，干净利落，近版画/丝网印刷
- 日式插画美学但克制（不是花哨动漫）
- 大面积留白，图形感强
- 低饱和度，高级感

---

## Banner (推荐尺寸: 1920×480 或 1600×400, 比例 4:1)

### Prompt 1 — 文字为主 + 素描辅助元素（首推）

**English:**
```
Wide banner (4:1 aspect ratio) with the text "Dailywork Matters" as the dominant centerpiece in a modern serif or elegant sans-serif typeface. The text is rendered in muted teal-blue (#4a7c8a) with a hand-drawn pencil sketch quality — slightly textured strokes as if drawn with a soft graphite pencil. Around and behind the text: delicate pencil sketches of productivity symbols — a half-open notebook, a small line chart trending upward, scattered checkmarks, a coffee cup, a clock showing 6pm, a pen. These sketches are lighter and thinner than the main text, serving as subtle background texture. Style: pencil/graphite sketch on off-white paper (#fafbfb), single color palette (teal-gray tones only), hand-drawn imperfect lines with natural pencil texture, generous whitespace on left and right edges. The overall feel is elegant, calm, and crafted — like a beautiful journal header. Aspect ratio 4:1.
```

**中文参考：**
```
宽幅横幅（4:1比例），以"Dailywork Matters"文字为画面主体，使用现代衬线或优雅无衬线字体。文字用低饱和青蓝色（#4a7c8a）呈现，带有手绘铅笔素描质感——笔触略有纹理，仿佛用软铅笔绘制。文字周围和背后：精致的铅笔素描效率符号——一本半开的笔记本、一个向上的小折线图、散落的勾选标记、一杯咖啡、一个指向6点的时钟、一支笔。这些素描比主文字更轻更细，作为微妙的背景纹理。风格：铅笔/石墨素描在米白纸上（#fafbfb），单色调（仅青蓝灰色系），手绘不完美线条带自然铅笔纹理，左右留有充裕白空间。整体感觉优雅、安静、有手工感——像一个漂亮的手账页眉。比例 4:1。
```

### Prompt 2 — 文字为主 + 素描场景带状

**English:**
```
Panoramic banner (4:1 ratio). Center: large elegant text "Dailywork Matters" in teal-gray (#4a7c8a), styled with pencil sketch texture and subtle shadow. Left and right sides: a continuous pencil sketch vignette — on the left, scattered loose papers and a pen transforming into organized stacked documents on the right, with a small upward chart and checkmarks. The sketch elements fade into white at the edges. Style: graphite pencil drawing, single teal-blue-gray color, hand-drawn linework varying from loose gestural strokes (left) to cleaner precise lines (right), symbolizing chaos→clarity. Off-white background. Aspect ratio 4:1.
```

### Prompt 3 — 极简文字 + 底部素描边框

**English:**
```
Clean wide banner (4:1). The words "Dailywork Matters" centered in large, confident, slightly hand-lettered style using muted teal (#4a7c8a). Below the text: a thin decorative border made of delicate pencil-sketched icons in a horizontal line — tiny notebook, chart, clock, checkmark, coffee cup, calendar page — connected by a subtle pencil-drawn line. Above the text: nothing (pure white space). Style: pencil sketch on cream paper, single color, the text dominates while the icon border provides subtle context. Quiet, refined, editorial quality. Aspect ratio 4:1.
```

---

## Logo / Icon (推荐尺寸: 512×512)

### Prompt 4 — 笔记页图标（推荐）

**English:**
```
Minimal icon design in single-color line art style. A stylized notebook page with a small checkmark and a tiny bar chart at the bottom. Drawn with clean, confident strokes in muted teal-blue (#4a7c8a) on white background. Style: Japanese graphic design, screen-print quality linework, geometric but slightly organic edges. Square composition with generous padding. No text.
```

### Prompt 5 — DM 字母标志

**English:**
```
Monogram logo combining letters "D" and "M" in a single clean stroke. Style: Japanese calligraphic influence meets geometric modernism. Single color: muted teal-blue (#4a7c8a) on white. The stroke weight is bold and confident like a woodblock print. The letters subtly suggest a page or document shape. No additional decoration. Square canvas.
```

### Prompt 6 — 方框印章风（最接近参考图）

**English:**
```
A square stamp-style logo mark. Inside a thin rectangular border: a minimalist icon of an open book or daily planner with a small rising chart on its page. Style: exactly like a Japanese hanko stamp or screen-print badge — single color (teal-gray #4a7c8a), bold confident lines, contained within the border, generous internal spacing. White background. No text. 512x512.
```

---

## 配色方案 (Brand Tokens) — 修订版

```css
/* Brand Colors — 青蓝灰单色系 */
--brand-primary: #4a7c8a;      /* Teal-gray — 主品牌色 */
--brand-primary-light: #6b9dab; /* 浅一度 — hover/辅助 */
--brand-primary-dark: #365c67;  /* 深一度 — 强调/pressed */
--brand-accent: #2d4a52;        /* 深青 — 标题/重点 */

/* Backgrounds */
--bg-main: #fafbfb;            /* 极浅冷白（亮色模式主背景） */
--bg-card: #ffffff;            /* 卡片白 */
--bg-subtle: #f0f4f5;          /* 微灰蓝底色（section 区分） */
--bg-dark: #1a2328;            /* 暗色模式背景 */
--bg-dark-card: #243038;       /* 暗色卡片 */

/* Text */
--text-primary: #1a2328;       /* 主文字（近黑） */
--text-secondary: #5f7882;     /* 次文字（中灰蓝） */
--text-muted: #94a7af;         /* 弱文字/placeholder */
--text-on-dark: #e8eef0;       /* 暗底文字 */

/* Functional（保持辨识度但降饱和） */
--success: #3d8b6e;            /* 墨绿 */
--warning: #b8860b;            /* 暗金 */
--error: #b84040;              /* 暗红 */

/* Chart Colors — 同色系不同深浅 + 少量对比 */
--chart-1: #4a7c8a;  /* 主色 */
--chart-2: #2d4a52;  /* 深青 */
--chart-3: #6b9dab;  /* 浅蓝 */
--chart-4: #3d8b6e;  /* 墨绿 */
--chart-5: #8ab0ba;  /* 淡青 */
--chart-6: #365c67;  /* 暗青 */
--chart-7: #5f8f7a;  /* 灰绿 */
--chart-8: #94a7af;  /* 灰 */
```

## 字体推荐（修订）

| 用途 | 字体 | 备注 |
|------|------|------|
| 标题 | **Space Grotesk** / DM Sans | 几何感强，干净有力 |
| 正文 | Inter | 可读性最佳 |
| 代码/数据 | JetBrains Mono | 开发者熟悉 |
| 中文 | Noto Sans SC (Medium) | 字重稍重配合线条感 |

---

## 使用建议

1. **先生成 Banner**（Prompt 1 首推），确认青蓝灰单色调是否满意
2. **再生成 Logo**（Prompt 6 方框印章风最接近你的参考图风格）
3. 选中后告诉我，我会：
   - 将图片放入 `.github/assets/`
   - 重写 README 中英文版引用图片
   - 将配色方案写入 UI 的 CSS variables
   - 后续 UI 改造全部对齐这套 tokens

## 推荐工具

| 工具 | 最适合 | 原因 |
|------|--------|------|
| **ChatGPT (DALL-E)** | Banner | 可以反复对话迭代"再克制一点""线条更粗" |
| **Recraft V3** | Logo/Icon | 擅长矢量单色图形，可导出 SVG |
| **Ideogram** | 备选 Logo | 文字渲染好，适合 DM 字母标志 |

**关键词补丁**（生图时追加以强化风格）：
```
screen print, risograph, single color, linocut inspired, Japanese graphic design, bold linework, high contrast, negative space, minimal
```
