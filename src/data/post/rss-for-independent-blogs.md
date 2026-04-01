---
publishDate: 2026-03-31
title: 'RSS：独立博客的「信息收件箱」神器'
excerpt: 'RSS（Really Simple Syndication）是一种古老却依然强大的内容订阅标准。它本质上是一个标准的 XML 文件，网站每次发布新文章时，RSS Feed 会自动更新，包含标题、摘要、发布时间和原文链接。'
image: '~/assets/images/rss.png'
category: '博客'
tags:
  - 'RSS'
  - '独立博客'
  - '信息流'
metadata:
  canonical: 'https://gyf123.dpdns.org/rss-for-independent-blogs'
---

RSS（Really Simple Syndication）是一种古老却依然强大的内容订阅标准。它本质上是一个标准的 XML 文件，网站每次发布新文章时，RSS Feed 会自动更新，包含标题、摘要、发布时间和原文链接。

### 为什么现在还值得用？
- **彻底摆脱算法干扰**：不像抖音、微博、X，你订阅什么就只看到什么，按时间顺序排列，没有推荐、没有广告、没有情绪垃圾。
- **主动掌控信息流**：把几十个独立博客、新闻站、YouTube 频道一次性聚合到一个阅读器里，每天打开就能扫完最新更新，不会错过也不会被淹没。
- **对博主和读者都友好**：设置一次后，你正常发文章，RSS 就自动更新；读者也不用每天手动刷新网站。

### 静态博客如何开启 RSS？
如果你和我一样用 Markdown 写文章（Hugo、Hexo、Jekyll、Astro 等静态站点生成器），开启 RSS 非常简单：
- 大多数工具在构建时（`hugo`、`hexo generate` 等）会**自动生成** RSS 文件（通常是 `rss.xml`、`feed.xml` 或 `atom.xml`）。
- 配置一次后，你继续本地写 MD → git push → Cloudflare Pages（或 Vercel/Netlify）自动构建，RSS 就跟着更新了，完全不需要手动同步或修改 XML。

RSS 不是「低技术」，而是去中心化时代对抗算法推荐的最干净方式。推荐搭配 Feedly、Inoreader 或国内的 Folo 使用。

---

（你可以根据自己博客情况补充具体 RSS 地址，例如：`https://你的域名/feed.xml`）
