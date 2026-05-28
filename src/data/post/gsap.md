---
publishDate: 2026-05-28
title: 'GSAP 使用指南：从 Tween 到 ScrollTrigger（v3+）'
excerpt: 'GSAP（GreenSock Animation Platform）是业界常用的 JavaScript 动画库。本文整理安装方式、Tween/Timeline 核心概念、常用参数与 ScrollTrigger 入门示例，适合复制到项目里直接用。'
image: '~/assets/images/gsap.png'
category: '前端'
tags:
  - 'GSAP'
  - 'JavaScript'
  - 'Animation'
  - 'Tween'
  - 'Timeline'
  - 'ScrollTrigger'
metadata:
  canonical: 'https://gyf123.dpdns.org/gsap-guide'
---

GSAP（GreenSock Animation Platform）是常用的 JavaScript 动画库，适合做页面动效、过渡、交互动画以及滚动驱动动画。

---

<div class="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 my-8">
  <div class="flex flex-wrap justify-center gap-4 mb-4">
    <div class="gsap-demo-box w-20 h-20 bg-blue-500 rounded-lg shadow-lg"></div>
    <div class="gsap-demo-box w-20 h-20 bg-green-500 rounded-lg shadow-lg"></div>
    <div class="gsap-demo-box w-20 h-20 bg-purple-500 rounded-lg shadow-lg"></div>
  </div>
  <p class="text-center text-sm text-slate-600 dark:text-slate-400 mb-4">GSAP 动画演示：点击播放/重置</p>
  <div class="flex justify-center gap-2">
    <button id="gsapPlayBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
      播放动画
    </button>
    <button id="gsapResetBtn" class="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
      重置
    </button>
  </div>
</div>

<script is:inline>
  (function() {
    // 加载 GSAP CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';
    script.async = true;
    script.onload = function() {
      initGsapDemo();
    };
    document.head.appendChild(script);

    function initGsapDemo() {
      const boxes = document.querySelectorAll('.gsap-demo-box');
      let tl = null;

      function createTimeline() {
        tl = gsap.timeline({ paused: true });
        tl.fromTo(
          boxes,
          { y: 0, rotation: 0, opacity: 0.5, scale: 0.5 },
          { y: -30, rotation: 360, opacity: 1, scale: 1, duration: 1, stagger: 0.2, ease: 'back.out' }
        );
      }

      createTimeline();

      document.getElementById('gsapPlayBtn')?.addEventListener('click', function() {
        tl.restart();
      });

      document.getElementById('gsapResetBtn')?.addEventListener('click', function() {
        tl.progress(0);
        tl.pause();
      });
    }
  })();
</script>

---

## 安装

### CDN（适合快速测试）

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js"></script>
```

### npm（推荐在项目中使用）

```bash
npm install gsap
```

```js
import gsap from "gsap";
```

注册插件（以 ScrollTrigger 为例）：

```js
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
```

## 核心概念

### Tween（单个动画）

最常用三种写法：

```js
gsap.to(target, { vars }); // 动画到目标值
gsap.from(target, { vars }); // 从指定值动画到当前状态
gsap.fromTo(target, { fromVars }, { toVars });
```

示例：

```js
gsap.to(".box", {
  x: 500,
  y: 200,
  rotation: 360,
  scale: 1.5,
  duration: 2,
  ease: "power2.out",
  delay: 0.5,
});
```

### Timeline（时间线：组织序列动画）

```js
const tl = gsap.timeline({
  repeat: 2,
  yoyo: true,
  onComplete: () => console.log("完成"),
});

tl.to(".box1", { x: 300, duration: 1 })
  .to(".box2", { y: 200, rotation: 180 }, "-=0.5")
  .from(".title", { opacity: 0, y: 50 }, "+=0.3");
```

## 常用参数（Vars）

### Transform 快捷属性

| GSAP 属性 | 对应 CSS |
| --- | --- |
| `x`, `y` | `translateX`, `translateY` |
| `xPercent`, `yPercent` | 百分比移动 |
| `scale`, `scaleX`, `scaleY` | 缩放 |
| `rotation` | `rotate` |
| `skewX`, `skewY` | 斜切 |

其他常用属性：

- `opacity`
- `backgroundColor`, `color`
- `width`, `height`
- `borderRadius`
- 任意 CSS 属性（使用 camelCase）

相对值写法：

```js
gsap.to(".box", {
  x: "+=300",
  scale: "-=0.5",
});
```

## 常用特殊属性（Special Properties）

- `duration: 1.5`
- `delay: 0.3`
- `repeat: 3`（`-1` = 无限循环）
- `yoyo: true`（往返播放）
- `ease: "power2.inOut"`（常用：`power1~4`, `elastic`, `bounce`, `back`）
- `stagger: 0.1`（多个元素错开动画）
- 回调：`onComplete`, `onStart`, `onUpdate`, `onRepeat`

## 插件

### ScrollTrigger（滚动驱动动画）

```js
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const sections = gsap.utils.toArray(".panel");

gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".container",
    pin: true,
    scrub: 1,
    snap: 1 / (sections.length - 1),
    end: () => "+=" + document.querySelector(".container").offsetWidth,
  },
});
```

常用 ScrollTrigger 配置：

- `trigger: ".element"`
- `start: "top top"` / `"center center"`
- `end: "+=1000"`（相对值）
- `scrub: true`（跟随滚动）
- `pin: true`（固定元素）
- `markers: true`（调试标记）

## 最小可运行示例（HTML）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>GSAP Demo</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js"></script>
    <style>
      .box {
        width: 100px;
        height: 100px;
        background: #e91e63;
        margin: 50px;
      }
    </style>
  </head>
  <body>
    <div class="box"></div>

    <script>
      gsap.fromTo(
        ".box",
        { x: -200, rotation: -45, opacity: 0 },
        { x: 400, rotation: 360, opacity: 1, duration: 2.5, ease: "power3.out" }
      );
    </script>
  </body>
</html>
```

## 最佳实践

- 优先动画 `transform` 与 `opacity`
- 用 Timeline 组织复杂动效，避免回调地狱
- 项目开发优先用 npm（便于插件与构建集成）
- 调试时打开 `markers: true` 并配合 DevTools

## 学习资源

- 官方入门：https://gsap.com/resources/get-started/
- 完整文档：https://gsap.com/docs
- 示例库：https://gsap.com/demos
- 安装帮助：https://gsap.com/install
