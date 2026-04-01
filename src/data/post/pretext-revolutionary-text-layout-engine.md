---
publishDate: 2026-04-01
title: 'Pretext：Midjourney 前端工程师开源的革命性文本布局引擎'
excerpt: 'Pretext 是一个纯 TypeScript/JavaScript 的轻量级文本布局引擎（仅约 15KB，无任何依赖），专门解决 Web 上文本测量和多行布局的性能瓶颈。'
image: '~/assets/images/pretext.png'
category: '前端技术'
tags:
  - 'Pretext'
  - 'Midjourney'
  - 'TypeScript'
  - '文本布局'
metadata:
  canonical: 'https://gyf123.dpdns.org/pretext-revolutionary-text-layout-engine'
---

**作者**：Cheng Lou（前 React 核心贡献者、react-motion 作者，目前在 Midjourney 负责前端基础设施）

**发布时间**：2026 年 3 月底（刚开源不久，已迅速爆火）

## 什么是 Pretext？

Pretext 是一个**纯 TypeScript/JavaScript** 的轻量级文本布局引擎（仅约 15KB，无任何依赖），专门解决 Web 上文本测量和多行布局的性能瓶颈。

它完全绕过浏览器 DOM 的昂贵操作（如 `getBoundingClientRect()`、`offsetHeight` 等，这些会触发 layout reflow），自己在用户空间实现高精度文本测量和布局。性能据称比传统方法快 **500 倍以上**。

### 核心优势
- 支持多语言（包括中文、阿拉伯文、韩文、泰文、emoji、RTL 等）
- 可渲染到 DOM、Canvas、SVG（很快支持服务端渲染）
- 特别适合复杂 UI、高帧率动画、AI 生成界面、杂志式排版、聊天气泡等场景
- 使用浏览器字体引擎作为基准，确保测量准确且 AI 友好

**GitHub 主仓库**：https://github.com/chenglou/pretext  
**在线 Demo**（强烈推荐体验）：https://chenglou.me/pretext/  
**社区 Demo 集合**：https://www.pretext.cool/

## 为什么这么火？

Midjourney 的 Web UI 对文本布局和性能要求极高，Cheng Lou 在开发过程中反复遇到浏览器排版瓶颈，于是用 AI 辅助开发出了这个引擎。它让 Web 上的文本布局终于能做到“杂志级”流畅和可预测，打破了浏览器 30 多年的老问题。

## 社区应用与创意 Demo

Pretext 刚开源没几天，社区已经涌现出大量有趣的应用，远超传统 CSS/DOM 能轻松实现的范围。

### 实用型应用
- 紧凑聊天气泡（shrink-wrap 最优宽度）
- 高性能手风琴（Accordion）
- Masonry 网格布局 + 虚拟滚动
- 多语言社交 Feed
- 动态简历编辑与 PDF 导出
- 实时字幕优化

### 创意与实验型 Demo（最有意思的部分）
- **Editorial Engine**：文本围绕可拖动“orb”（球体）流动，60fps 动画，障碍物感知路由  
  Demo：https://chenglou.me/pretext/ 或社区增强版
- **Dragon Through Text**：动画龙移动时，文字实时避让、绕过、再合拢（病毒级 demo）  
  Demo：https://aiia.ro/pretext/
- **Fluid Smoke ASCII**、**Wireframe Torus**、**文本粒子物理** 等艺术效果
- **pretext.video**：用摄像头实时捕捉身体轮廓，文字围绕你的动作流动（可录制视频）

### 动漫人物 + 文字围绕的特殊应用（你最感兴趣的）

社区特别喜欢把 Pretext 用在**动画角色与文字实时交互**上，其中最接近你描述的是：

#### 1. Anime Walk（动漫角色行走/动画 + 文字围绕）
- 动漫风格角色移动或简单动画时，文字实时避让、包裹、流动。
- 入口：https://www.pretext.cool/ → 搜索 “Lab: PreText Experiments by qtakmalay” → **Anime Walk** demo
- 这类 demo 常用于二次元角色行走或舞蹈效果。

#### 2. Dragon Through Text 变体
- 基础是文字绕龙，可轻松替换障碍物为动漫女孩 sprite 或 silhouette，做出类似“文字围绕动画美女”的效果。
- 非常适合 fork 改造。

#### 3. Chika Dance（藤原千花跳舞 + 文字避让）
- **经典效果**：藤原千花（《辉夜大小姐想让我告白》中的粉毛女孩）热舞，文字实时避让她的身体轮廓。她甚至能在你实时编辑的文本上继续跳舞！
- 原版使用 macOS AppKit + TextKit exclusion paths（作者 Jamie Birch），社区有人尝试用 Pretext 复刻类似效果。
- 相关视频演示可在 X（Twitter）搜索 “pretext chika” 或查看社区墙。
- 社区还有 **Bad Apple** 文字版：歌词随黑白剪影动画（常被做成各种动漫角色）实时位移/避让。

**社区 Demo 集合推荐**：
- https://www.pretext.cool/ （17+ 个互动 demo）
- https://pretextwall.xyz/ （Pretext 社区展示墙）
- https://somnai-dreams.github.io/pretext-demos/ （实验性效果）

这些 demo 的核心就是 Pretext 的高性能文本测量：提前 prepare layout，每帧只做廉价更新，让动画角色移动时文字能丝滑“躲闪”或“环绕”。

## 如何上手

1. 安装：`npm install @chenglou/pretext` 或 `bun install @chenglou/pretext`
2. Clone 仓库体验 demos：`git clone https://github.com/chenglou/pretext.git`
3. 以 Dragon 或 Anime Walk 为基础，替换障碍物为喜欢的动漫角色 sprite sheet，即可快速做出类似“藤原千花跳舞 + 文字围绕”的效果。

## 社区与讨论
- **X/Twitter**：关注 @_chenglou，搜索 “pretext chika”、“pretext anime walk” 或 “pretext chenglou”
- **GitHub Issues**：https://github.com/chenglou/pretext （项目迭代非常快）
- **社区墙**：https://pretextwall.xyz/

Pretext 让“文本不想老老实实待着”的创意成为可能，尤其适合 AI 界面、创意工具、游戏 UI 和艺术实验。

如果你想基于 Pretext 自己实现一个“动漫女孩跳舞 + 文字围绕”的 demo，或者需要具体代码片段、fork 建议，欢迎继续讨论！

---

*本文基于 2026 年 3-4 月的 Pretext 社区讨论与 demo 整理而成，项目仍在快速发展中，建议直接访问链接体验最新效果。*
