---
publishDate: 2026-03-30
title: 'GitHub README Stats：让你的 GitHub 主页更有逼格'
excerpt: 'GitHub README Stats 是一个流行工具，能根据你的 GitHub 数据自动生成漂亮的 SVG 卡片，常用在个人 GitHub Profile README 中。'
image: '~/assets/images/stats.png'
category: 'GitHub'
tags:
  - 'GitHub'
  - 'README'
  - 'Stats'
metadata:
  canonical: 'https://gyf123.dpdns.org/github-readme-stats-guide'
---

GitHub README Stats（https://github.com/anuraghazra/github-readme-stats）是一个流行工具，能根据你的 GitHub 数据自动生成漂亮的 SVG 卡片，常用在个人 GitHub Profile README 中。

### 主要功能
- **Stats Card**：显示总 Stars、Commits、PRs、Issues 等数据，右上角还有一个 **贡献等级（Rank）**。
- 其他卡片：Streak（连续打卡）、Top Languages、Trophies 等。

### 关于 Rank 等级（很多人会困惑）
项目采用类似日本学业评级的方式计算：
- **S**：全球前 1%
- **A+ / A / A-**：较好水平（A 大约是前 25%~37.5%）
- **B+ / B / B-**：中等
- **C+ / C**：最常见（很多人默认显示 C）

**我之前遇到的情况**：用官方公共实例时显示 C，后来换了镜像实例后变成了 A。这是因为不同实例的缓存、是否使用 GitHub Token、统计范围（public/private）不同，导致计算结果有差异。公共实例（vercel.app）经常因为负载高或限流而崩掉（503），所以很多人选择自部署或找稳定镜像。

### 部署建议（2026 年）
- **最简单**：用社区基于 Cloudflare Workers 做的替代方案，速度快、稳定，不容易崩。
- **自己部署**：可以尝试 fork 原仓库部署到 Cloudflare Workers（用 wrangler），或继续用 Vercel。但 Workers 配置比 Vercel 稍复杂，需要注意环境变量（PAT Token）和依赖打包。
- 我的博客用 Cloudflare Pages 托管静态内容，这个 Stats Card 则是独立的动态图片，直接把生成后的链接嵌入 README.md 即可。

### 其他工具推荐

- **GitHub Card** (`https://githubcard.com`): 一个功能类似但提供更多自定义选项的工具。它提供了一个在线 Canvas 编辑器，可以让你像做 PPT 一样拖拽、调整卡片样式，非常灵活。

示例用法：
```markdown
<image-card alt="GitHub Stats" src="https://你的stats链接?username=你的用户名&theme=github_dark" ></image-card>
```
