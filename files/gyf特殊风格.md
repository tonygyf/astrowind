# GYF Banner 特殊风格总结（全站）

本项目把“左上角 Banner（Logo 区）”做成全站一致的品牌入口：同时承载主题（Day/Night）、工业扫描光（Night）、以及随页面滚动的进度反馈（进度环 + 360°旋转）。

## 目标

- 所有页面左上角都统一展示一个“头像化 Logo”
- 主题不是简单换色：Day=品牌感；Night=工业感
- Banner 具备“页面进度条”功能：滚动越深，进度越满；并驱动 Logo 旋转 0→360°

## 结构（Banner / Logo）

- 位置：导航栏左上角
- 形态：圆形头像（圆形裁切 + 图片填充）
- 外层：圆形进度环（SVG strokeDashoffset 控制）
- 内层：Logo 图片本体（Day / Night 两张资源按主题切换）

关键实现文件：
- 左上角结构与资源切换：[Logo.astro](file:///d:/typer/astro/astrowind/src/components/Logo.astro)
- 进度计算、旋转驱动、主题动效逻辑：[Layout.astro](file:///d:/typer/astro/astrowind/src/layouts/Layout.astro)

## 主题体系

### ☀️ Day Theme（品牌感 / Airy）

设计哲学：
- 干净、留白、微动效
- 不做扫描光（避免白底“擦玻璃感”）

视觉与动效：
- Logo 采用亮色资源：`src/assets/images/gyf-logo.png`
- 动效为 subtle motion：
  - 微浮动（yoyo 上下轻动）
  - 微呼吸阴影（drop-shadow 呼吸）
  - hover 微倾斜（小角度）

### 🌑 Night Theme（工业感 / 冷蓝能量）

设计哲学：
- 工业蓝灰 / AI 终端风格
- 扫描光 + 冷蓝 glow，节奏克制、不匀速

视觉与动效：
- Logo 采用夜间资源：`src/assets/images/logo-blue.png`
- 工业扫描：
  - 扫描光随机间隔出现（随机 3–6s）
  - 滚动时扫描光跟随滚动进度移动
  - 夜间额外冷蓝环境光晕（Ambient Glow）轻微脉冲

## 页面进度条（环形）

### 行为定义

- 进度：`scrollY / (documentHeight - innerHeight)`，范围 0→1
- 进度环填充：用 SVG 路径长度 `getTotalLength()` 计算
  - `strokeDasharray = length length`
  - `strokeDashoffset = length * (1 - progress)`
- Logo 旋转：`rotation = progress * 360`
  - 到页面底部时旋转刚好 360°，视觉上回正

### 主题配色

- Day：进度环颜色偏黑（更克制）
- Night：进度环颜色偏蓝（更有能量感）

## 数据标记约定（用于全站脚本）

Logo 进度系统：
- `data-aw-progress-root`：一个 Banner Root（可扩展到多个位置）
- `data-aw-progress-path`：SVG 路径（圆环）
- `data-aw-progress-rotate`：需要随进度旋转的容器

Night 工业扫描系统：
- `data-gsap="metal-wrap"`：扫描光作用的容器
- `data-gsap="metal-glint"`：扫描光条（仅 Night 显示）
- `data-gsap="night-glow"`：冷蓝环境光晕层（仅 Night 显示）
- `data-gsap-metal="site-logo"`：标识这是站点左上角 Logo 容器

## 运行时机制（关键点）

- 全局脚本放在主布局里，保证“全站覆盖”
- 主题切换时会重新初始化对应主题的 GSAP 动效逻辑（避免 Day/Night 共用一套导致风格混杂）

## 资源清单

- Day Logo：`src/assets/images/gyf-logo.png`
- Night Logo：`src/assets/images/logo-blue.png`

