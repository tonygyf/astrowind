---
publishDate: 2026-08-31
title: 'MonkeyOCR 模型解析：从 SRR 到文档原生视觉编码器'
excerpt: '从零开始拆解 MonkeyOCR 与 MonkeyOCRv2：为什么第一代用 Structure、Recognition、Relation 三段式解析整页文档，第二代又为什么要专门训练文档原生视觉编码器。'
category: '深度学习'
tags:
  - 'MonkeyOCR'
  - 'OCR'
  - 'Document AI'
  - '文档解析'
  - '深度学习'
metadata:
  canonical: 'https://gyf123.dpdns.org/monkey-ocr-model-analysis'
---

可以。你这次给我的其实是 **MonkeyOCR 第一代 + MonkeyOCRv2 两篇论文**，而且它们非常适合从零学，因为两篇论文背后其实在讲一条很清晰的技术路线：

> **第一代：我怎样把“一整页 PDF 看懂”这件事拆开做？**
> **第二代：我怎样先训练一个“真正懂文档视觉细节”的视觉大脑？**

第一代 MonkeyOCR 的核心是 **SRR：Structure → Recognition → Relation**，也就是“哪里有什么 → 里面写了什么 → 它们应该怎么排列”。
第二代 MonkeyOCRv2 则把重点进一步前移，专门训练一个 **Document-native Vision Encoder（文档原生视觉编码器）**，让模型真的能看清楚字的笔画、标点、上下标、表格结构等细节。

下面我不假设你会机器学习。我们从 **“PDF 到底是什么”** 开始，一层一层往下拆。

---

## 一、先别看公式：MonkeyOCR到底在解决什么？

假设给你这样一页论文：

```text
┌───────────────────────────────────────┐
│           Deep Learning               │
│                                       │
│  Abstract             Figure 1       │
│  We propose ...       ┌───────┐      │
│                       │ graph │      │
│  1. Introduction      └───────┘      │
│                                       │
│  Table 1                              │
│  ┌────────┬────────┬────────┐        │
│  │ Model  │ Acc    │ Speed  │        │
│  └────────┴────────┴────────┘        │
│                                       │
│              E = mc²                  │
└───────────────────────────────────────┘
```

人类一眼就知道：

* “Deep Learning”是标题
* “Abstract”是摘要
* Figure 1 是图片
* 图片下面可能有 caption
* Table 1 是表格
* `E = mc²` 是公式
* 正文应该按照某种顺序阅读

但是计算机看到的可能只是：

> 一张 2000×3000 的 RGB 图片。

这就是 **Document AI / Document Parsing（文档智能 / 文档解析）** 要解决的问题。

论文把目标描述成：

> 把 PDF、扫描件等里面的文字、表格、图片、公式等复杂多模态内容转换成结构化信息。

---

## 二、先建立你的第一张“知识地图”

你以后看到 OCR 论文，脑子里最好先出现这个：

```text
                     一张 PDF 页面
                           │
                           ▼
                  ┌─────────────────┐
                  │   Document AI   │
                  └─────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      看在哪里？        看是什么？        怎么组织？
      Structure         Recognition       Relation
          │                │                │
          ▼                ▼                ▼
      找区域            读内容             排顺序
          │                │                │
       bounding box      OCR/公式/表格      reading order
```

这就是 MonkeyOCR 第一代最核心的思想。

论文甚至把它概括成三个问题：

> **Where is it?**
> **What is it?**
> **How is it organized?**

分别对应：

> Structure → Recognition → Relation。

---

## 三、第一课：什么叫 OCR？

你以前接触过 OCR 模型，比如你之前研究过的 OCR、文本检测、文字识别，这里终于可以把它们串起来。

OCR：

**Optical Character Recognition**

也就是：

> **光学字符识别**

最简单的例子：

```text
图片

┌─────────────┐
│ Hello World │
└─────────────┘

       ↓ OCR

"Hello World"
```

但是现代 OCR 已经不只是：

> “把图片里的字变成字符串。”

真正复杂的文档解析是：

```text
图片
 ↓
哪里有文字？
 ↓
这些字是什么？
 ↓
哪个标题属于哪个正文？
 ↓
表格是什么结构？
 ↓
公式是什么？
 ↓
图片属于哪个 caption？
 ↓
最后生成 Markdown / HTML / JSON
```

所以：

**OCR < Document Parsing < Document Understanding**

可以把它理解成：

```text
OCR
↓
“这个地方写的是苹果”

Document Parsing
↓
“这是第二章标题，下面这段是正文，
  右边这个是 Figure 3，
  这个表格有 4 列”

Document Understanding
↓
“这篇合同的合同编号是多少？”
“这个表格中销售额最高的是谁？”
```

MonkeyOCR主要进入的是后两个领域。

---

## 四、为什么传统 OCR 不够？

想象你给传统 OCR：

```text
┌──────────────┐
│  标题        │
│              │
│ 正文     图  │
│ 正文     图  │
│              │
│ 表格         │
└──────────────┘
```

它可能只返回：

```text
标题
正文
正文
表格
```

但你真正想要的是：

```html
<h1>标题</h1>

<p>正文</p>

<figure>
    图片
</figure>

<p>正文</p>

<table>
    ...
</table>
```

所以 **“读字”** 和 **“理解页面结构”** 是两件事情。

---

## 五、第一代 MonkeyOCR 的第一个重大思想：不要整页硬吃

这里是第一代论文最重要的地方之一。

以前有两种极端方案。

---

### 方案 A：Pipeline，流水线

例如：

```text
整张 PDF
   ↓
Layout Detection
   ↓
Text Detection
   ↓
OCR
   ↓
Formula Detection
   ↓
Formula Recognition
   ↓
Table Recognition
   ↓
Reading Order
   ↓
Merge
   ↓
Markdown
```

这就像一个工厂。

每个工人负责一个岗位：

```text
工人A：找文字
工人B：找公式
工人C：识别公式
工人D：识别表格
工人E：排序
工人F：拼起来
```

好处：

> 每个人专门干一件事。

坏处：

> **前一个人犯的错，会传给后面的人。**

论文把这个叫：

**Cumulative Error，累积误差。**



---

## 六、什么叫累积误差？

这个例子非常重要。

假设原文：

```text
今天学习机器学习
      ↓
     E=mc²
```

公式检测器稍微切歪了：

```text
今天学习机器学习
      ↓
  [习机器学习
      E=mc²]
```

那么公式识别器拿到错误的图片：

```text
习机器学习
E=mc²
```

它当然可能识别错。

于是：

```text
检测错
 ↓
裁剪错
 ↓
识别错
 ↓
合并错
 ↓
最终输出错
```

**一个小错误开始滚雪球。**

论文明确指出，传统 pipeline 会经过 layout detection、文本/公式 detection、instance recognition、element merging、reading order reconstruction 等多个步骤，因此容易产生这种累计误差。

---

## 七、方案 B：巨型 End-to-End 模型

另一边的人说：

> “那我不用这么多模型了。”

直接：

```text
整张 PDF
    ↓
┌──────────────────┐
│      72B VLM     │
│                  │
│  全部自己理解     │
└──────────────────┘
    ↓
Markdown
```

比如一个超大的多模态模型。

优点：

> 不需要十几个小模型串起来。

但是它又遇到了另一个问题：

### 整页太大了。

论文指出，文档页面通常：

* 分辨率高
* 信息密集
* 输入 token 很长
* 输出也很长

而 Transformer 的 attention 计算成本随着序列长度大致呈 **平方增长**。

---

## 八、这里必须学会一个词：Token

这是理解整篇论文的钥匙。

你以后看：

```text
1B
3B
70B
token
attention
visual token
```

不要害怕。

Token 可以简单理解成：

> **模型处理世界时使用的“小积木”。**

对于语言：

```text
我喜欢人工智能
```

可能被拆成：

```text
我
喜欢
人工
智能
```

对于图片：

```text
┌────┬────┬────┬────┐
│    │    │    │    │
├────┼────┼────┼────┤
│    │    │    │    │
├────┼────┼────┼────┤
└────┴────┴────┴────┘
```

也可以把图片切成很多小 patch，再转换成：

```text
visual token
visual token
visual token
...
```

所以一张超高清论文：

```text
图片很大
 ↓
patch很多
 ↓
visual token很多
 ↓
attention计算爆炸
```

这就是为什么 MonkeyOCR 不希望一个巨大模型直接吞整页。

---

## 九、MonkeyOCR 的第三条路

于是他们说：

> **既不要几十个工具串起来，也不要让一个巨型模型把整页全部吞掉。**

于是：

```text
                   原始页面
                       │
                       ▼
              ┌─────────────────┐
              │ Structure Model │
              └─────────────────┘
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
           Text      Table     Formula
          block      block      block
             │         │         │
             └─────────┬─────────┘
                       ▼
              Recognition Model
                       │
              “这里写了什么？”
                       │
                       ▼
              Relation Model
                       │
              “谁在谁前面？”
                       │
                       ▼
                Final Document
```

这就是：

## SRR

**Structure**

先找到：

> “这里有个文字块。”

**Recognition**

然后：

> “这个文字块里面写的是：Deep Learning。”

**Relation**

最后：

> “这个标题应该排在这个正文前面。”

论文明确描述了这三步，并强调检测到的区域会被裁剪后进行内容识别，同时坐标和类别会送入 relation model 预测阅读顺序。

---

## 十、Structure 到底是什么？

现在进入论文的第一个模型。

### Structure Detection

你可以把它理解成：

> **给一张乱七八糟的页面画框。**

例如：

```text
┌──────────────────────────────────┐
│ ┌──────────────────────────────┐ │
│ │           标题               │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────┐ ┌────────────┐ │
│ │              │ │            │ │
│ │    正文      │ │   图片     │ │
│ │              │ │            │ │
│ └──────────────┘ └────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │           表格               │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

模型输出：

```text
Box 1 = title
Box 2 = text
Box 3 = image
Box 4 = table
```

论文中每一个预测：

```text
yi = (bi, li)
```

其中：

* `bi` = bounding box
* `li` = category

也就是：

> **框在哪里 + 这个框是什么。** 

---

## 十一、Bounding Box 是什么？

这个词以后会疯狂出现。

Bounding Box：

> **包围目标的矩形框。**

比如：

```text
图片尺寸：

1000 × 2000
```

某个文字区域：

```text
左上角 = (100, 300)
右下角 = (800, 500)
```

那么：

```text
x1 = 100
y1 = 300
x2 = 800
y2 = 500
```

就是：

```text
(x1, y1, x2, y2)
```

---

## 十二、MonkeyOCR 的 Structure Model 为什么用 DETR？

论文说：

> 采用基于 DETR 的结构检测模型。



这里第一次出现：

## DETR

你暂时只需要理解：

> **DETR 是一种“让 Transformer 直接预测目标框”的目标检测方法。**

传统目标检测可以想成：

```text
图片
 ↓
滑来滑去找目标
 ↓
产生很多候选框
 ↓
筛选
```

DETR 的思想更加 Transformer 化：

```text
图片
 ↓
视觉特征
 ↓
几个“查询位”
 ↓
每个查询负责寻找一个目标
 ↓
输出 box + category
```

你可以把 query 想象成：

> **一群拿着探测器的侦察员。**

一个侦察员说：

> “我发现一个标题。”

另一个：

> “我发现一个表格。”

另一个：

> “我发现一个图片。”

---

## 十三、论文这里为什么还要 Query Selection？

这是比较技术性的地方。

论文先通过 Backbone + Encoder 得到：

```text
Fenc
```

你可以把它理解为：

> **图片经过视觉神经网络后得到的一大堆“视觉信息”。**

然后模型计算每个 token：

> “你是不是一个有用的文档元素？”

得到：

```text
s = foreground probability
```

也就是：

```text
token 1 → 0.02
token 2 → 0.91
token 3 → 0.76
token 4 → 0.03
token 5 → 0.88
```

然后：

```text
Top-K
```

挑最重要的。

论文就是这样描述的：先对 encoded features 估计 foreground probability，再选出 Top-K informative features 作为 decoder queries，以减少背景噪声。

---

## 十四、你可以把它理解成“先筛人，再开会”

假设一个页面有：

```text
10000 个 visual tokens
```

但真正重要的只有：

```text
200 个
```

那么：

```text
10000
 ↓
判断谁可能重要
 ↓
Top 200
 ↓
交给后面的 Decoder
```

这就是：

**Query Selection**

不是让所有视觉信息都进入下一阶段。

---

## 十五、Structure 完成后发生什么？

比如它找到：

```text
Box 1 = text
Box 2 = table
Box 3 = formula
Box 4 = image
```

接下来：

```text
原图
 │
 ├── crop Box 1
 ├── crop Box 2
 ├── crop Box 3
 └── crop Box 4
```

也就是说：

> **把整页切成很多“小问题”。**

这一步特别重要。

---

## 十六、为什么裁剪反而更聪明？

假设原页面：

```text
4000 × 6000
```

但一个公式只有：

```text
1000 × 300
```

如果你让一个 VLM 看：

```text
4000 × 6000
```

它需要处理大量：

```text
正文
页眉
页脚
图片
空白
其他表格
```

但如果你直接：

```text
Crop
 ↓
1000 × 300
```

模型只需要关注：

```text
      E = mc²
```

这就叫：

## Block-level Recognition

也就是：

> **块级识别。**

论文明确采用 detected bounding boxes 对 text/table/formula 区域裁剪，然后交给 LMM 进行内容识别。

---

## 十七、Recognition 到底是什么？

现在模型面对：

```text
┌───────────────────┐
│  The loss is      │
│  defined as:      │
│                   │
│  L = L₁ + L₂      │
└───────────────────┘
```

它需要输出：

```text
The loss is defined as:

L = L₁ + L₂
```

但是不同类型的 block：

```text
text
table
formula
```

不能完全用同一种思维。

所以 MonkeyOCR 会根据：

```text
category
```

选择不同的 prompt。

例如：

```text
text → “识别文字”
table → “识别表格结构”
formula → “识别数学公式”
```

论文称之为：

> **type-specific prompt**。

---

## 十八、这里出现一个非常重要的概念：LMM

你看到：

> LMM

不要和 LLM 混淆。

### LLM

Large Language Model

例如：

```text
Qwen
GPT
Llama
```

主要处理：

```text
文字 token
```

### LMM / VLM

Large Multimodal Model / Vision-Language Model

能够：

```text
图片 + 文字
```

一起处理。

MonkeyOCR 第一代这里实际上就是：

```text
Image
 ↓
Vision Encoder
 ↓
Visual Tokens
 ↓
LLM
 ↓
Text
```

---

## 十九、Relation 是什么？

这是 MonkeyOCR 非常关键、也非常容易被忽略的一块。

假设页面上有：

```text
A：标题
B：正文
C：图片
D：图片说明
E：第二段正文
```

模型检测出来：

```text
A
B
C
D
E
```

但是：

> **检测出来 ≠ 知道阅读顺序。**

比如：

```text
A
B    C
D    E
```

到底是：

```text
A → B → C → D → E
```

还是：

```text
A → B → D → C → E
```

需要判断。

所以 Relation Model 专门干：

> **“这些 block 之间是什么关系？”**

最重要的关系之一就是：

## Reading Order

---

## 二十、为什么阅读顺序不是简单从左到右？

论文页面经常这样：

```text
┌─────────────┬─────────────┐
│ Column 1    │ Column 2    │
│             │             │
│ A           │ C           │
│ B           │ D           │
│ E           │ F           │
└─────────────┴─────────────┘
```

正确阅读：

```text
A → B → E → C → D → F
```

不是：

```text
A → C → B → D → E → F
```

所以：

> **坐标本身不等于阅读顺序。**

---

## 二十一、Relation Model 怎么理解这些 Box？

论文把每个元素表示成：

```text
x1
y1
x2
y2
width
height
category
```

也就是：

> **位置 + 大小 + 类型**

然后转换成 embedding。



为什么要把 category 也告诉模型？

因为：

```text
标题
正文
图片
表格
```

在阅读顺序里的意义不同。

论文因此加入：

## Category-aware Embedding

也就是：

> **“这个东西是什么类型”也要成为模型判断顺序的依据。**

---

## 二十二、Transformer 在这里到底干嘛？

这里第一次真正需要理解 Transformer。

你可以把 Transformer 暂时理解成：

> **一个特别擅长“让一堆东西互相看对方”的网络。**

例如：

```text
Block A
Block B
Block C
Block D
```

Transformer 可以让：

```text
A 看 B/C/D
B 看 A/C/D
C 看 A/B/D
D 看 A/B/C
```

然后综合：

```text
“谁在谁上面？”
“谁属于哪个区域？”
“这个 caption 和哪个 image 最接近？”
```

从而判断关系。

---

## 二十三、最终怎么确定顺序？

模型给每个元素一个：

```text
position score
```

例如：

```text
A:
位置1 = 0.95
位置2 = 0.10
位置3 = 0.01

B:
位置1 = 0.70
位置2 = 0.90
位置3 = 0.02
```

然后如果两个东西抢同一个位置：

> 谁分数高，谁先占。

另一个重新选择。

论文把这个过程称为：

**iterative greedy decoding**

即：

> **迭代式贪心解码。**



“贪心”这个词你可以先理解成：

> **当前这一步，我先选我认为最好的。**

---

## 二十四、到这里，第一代 MonkeyOCR 已经完整了

你现在应该能画出：

```text
                    PDF / 图片
                        │
                        ▼
              ┌─────────────────┐
              │ Structure Model │
              │    DETR-based   │
              └─────────────────┘
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
           Text       Table      Formula
            Box         Box         Box
             │           │           │
             └───────────┼───────────┘
                         ▼
                 Content Recognition
                         │
                         ▼
                  “这里是什么？”
                         │
                         ▼
                Relation Prediction
                         │
                         ▼
                  “谁排在谁前面？”
                         │
                         ▼
                  Structured Output
                         │
                         ▼
                 Markdown / HTML / ...
```

这就是第一代论文的灵魂。

---

## 二十五、那么为什么还要 MonkeyOCRv2？

这里是两篇论文最值得你理解的地方。

第一代解决：

> **“怎么解析一页文档？”**

第二代问：

> **“视觉模型本身到底会不会看文档？”**

这两句话差别非常大。

---

## 二十六、一个非常反直觉的问题

假设我们拿一个很厉害的视觉模型：

```text
CLIP
DINO
SAM
```

让它看论文。

你可能觉得：

> “它们都是视觉模型，应该很擅长吧？”

但作者认为：

## 不一定。

因为它们主要是在：

```text
自然图片
```

上训练的。

例如：

```text
猫
狗
汽车
人
街道
建筑
```

这些东西最重要的是：

> **整体语义。**

比如：

```text
这是一辆汽车
```

你不需要知道汽车上的每一个小划痕。

---

## 二十七、但是文档完全不一样

看：

```text
1
l
I
```

三个东西可能长得极其接近。

但是：

```text
1
```

和：

```text
l
```

含义完全不同。

再看：

```text
10.5
105
10⁵
```

一个小小的：

```text
.
```

或者：

```text
上标
```

都可能改变意思。

论文明确强调，文档中的标点、小数点、上下标、字符笔画等局部细节都可能导致完全不同的语义。

---

## 二十八、这就是 Representation

现在你必须认识这个词：

## Representation

中文通常叫：

> **表示 / 表征**

简单说：

> **模型看完一张图片以后，脑子里留下的“内部数字化理解”。**

比如模型看到：

```text
🐕
```

内部可能形成：

```text
[0.21, -0.83, 0.44, ...]
```

我们人类看不到这些数字。

但是它们代表：

> “这是一条狗。”

---

## 二十九、问题来了

如果模型是在：

```text
汽车
狗
猫
街道
```

上训练的。

它学到的 representation 很可能强调：

```text
“这是汽车”
“这是狗”
“这是街道”
```

而不是：

```text
“这个字符到底是 l 还是 I？”
“这个小数点在哪里？”
“这个上标是不是 2？”
```

所以：

## Representation Mismatch

就是：

> **模型学到的视觉表示和文档任务真正需要的视觉表示不匹配。**

论文把这个问题明确称为 representation mismatch，并把原因归结为 distribution gap 和 task gap。

---

## 三十、MonkeyOCRv2 的核心思想来了

它说：

> 那我干脆训练一个专门看文档的视觉编码器。

也就是：

## MonkeyOCRv2 Vision Encoder

目标不是：

> “这是一本书。”

而是：

> “我把这页纸上的每一个字符笔画、局部结构、布局细节都尽量保留下来。”

论文称之为：

> **document-native visual representation**

也就是：

> **文档原生视觉表示。** 

---

## 三十一、怎么训练？

这是第二篇论文最重要的技术贡献。

它没有只让模型：

```text
图片 → 文字
```

而是同时要求：

```text
              Image
                │
                ▼
        ┌───────────────┐
        │ Vision Encoder│
        └───────────────┘
                │
          Visual Tokens
          /            \
         /              \
        ▼                ▼
Text Decoder       Vision Decoder
    │                   │
    ▼                   ▼
 文字输出             图片重建
    │                   │
    ▼                   ▼
 L_text              L_rec
```

两个任务：

## ① Image → Text

## ② Image → Reconstructed Image



---

## 三十二、为什么“文字输出”还不够？

想象：

```text
图片：

1lI
```

如果模型最终成功输出：

```text
1lI
```

很好。

但是它可能是怎么做到的？

可能是：

> “根据上下文猜出来的。”

比如：

```text
The value is 10
```

模型可能知道：

> “这里大概率是 10。”

这就是：

## Language Prior

也就是：

> **语言知识帮助视觉识别。**

---

## 三十三、作者担心一件事情

模型可能：

> **不是看清楚了，而是猜对了。**

例如：

```text
图片：

700,000
```

模型因为上下文猜：

```text
100,000
```

就错了。

论文的 qualitative comparison 中也展示了类似问题，例如 CLIP 把 “700,000” 识别成 “100,000”。

---

## 三十四、所以加入 Pixel Reconstruction

现在模型必须完成：

```text
图片
 ↓
Encoder
 ↓
Visual Representation
 ↓
Decoder
 ↓
重新画出原来的图片
```

这就很狠了。

因为如果模型没有保存：

```text
字符笔画
字形
局部结构
布局
```

它根本没办法把图片重建回来。

论文明确说 reconstruction objective 的作用是让 encoder 保留 character strokes、glyph shapes 和 layout structures 等细粒度视觉信息。

---

## 三十五、一个非常生动的理解

假设你让学生看：

```text
“机器学习”
```

然后问：

> “你刚才看到什么？”

学生回答：

> “机器学习。”

你不知道他到底有没有看清楚。

于是你再说：

> “现在请你把刚才看到的字一笔一划重新画出来。”

如果他只能画成：

```text
████████
```

那说明：

> 他只记住了“这里有文字”。

如果他能重新画出：

```text
机器学习
```

甚至保留：

```text
笔画
字体
布局
```

那才说明：

> 他真的保留了视觉信息。

这就是 MonkeyOCRv2 的 reconstruction 思想。

---

## 三十六、为什么又要 Text Generation？

因为光重建图片也不够。

一个模型可能非常擅长：

> “复制像素。”

但是不知道：

```text
这个字符对应什么文字？
```

所以两个任务刚好互补：

```text
Text Generation
      ↓
告诉模型：
“这些视觉东西对应什么语言内容”

Pixel Reconstruction
      ↓
告诉模型：
“别把真正重要的视觉细节丢掉”
```

论文对这两个目标的定位就是：

> Text generation 对齐视觉表示和文本内容。
> Reconstruction 保留字符级视觉细节。

---

## 三十七、这其实是整篇 v2 最核心的一句话

你可以直接背：

> **Text Generation 教模型“看懂文字”。**
> **Pixel Reconstruction 教模型“看清文字”。**

非常重要。

---

## 三十八、MonkeyDoc v2 是什么？

模型有了训练方法，还得有：

> **训练资料。**

这就是：

## MonkeyDoc v2

数据量：

## 113 million

也就是：

> **1.13 亿个样本**

覆盖：

## 17 种语言

包括：

```text
中文
英文
日文
韩文
阿拉伯文
德文
法文
西班牙文
俄文
葡萄牙文
...
```

论文报告的数据是：

```text
8M page-level images
105M cropped document elements
```

即：

```text
800 万整页
1.05 亿局部文档区域
```



---

## 三十九、为什么要有“整页”和“裁剪区域”两种？

因为它们训练的东西不一样。

### 整页

模型学习：

```text
布局
章节
多栏
图片
表格位置
阅读顺序
```

### Crop

模型学习：

```text
一个字
一行字
公式
表格
小区域
```

所以：

```text
Page-level
    ↓
“整个房间怎么布局？”

Element-level
    ↓
“这个螺丝到底是什么型号？”
```

这也是为什么 MonkeyDoc v2 同时拥有：

```text
8M pages
105M crops
```



---

## 四十、数据从哪里来？

这里又有一个机器学习非常重要的知识：

## Data Engine

MonkeyDoc v2 不是简单：

> “网上抓 1 亿张图片。”

而是有数据工程。

主要三块：

```text
Expert Model Labeling
          +
Multilingual Corpus-Based Data Synthesis
          +
Data Filtering
```



---

## 四十一、Expert Model Labeling

假设一张图片：

```text
身份证 / 论文 / 表格
```

他们可能让多个 OCR / recognition 模型分别识别：

```text
Model A → ABC123
Model B → ABC123
Model C → ABC128
Model D → ABC123
```

那么：

```text
A B D
```

互相同意。

就更可信。

论文不是简单相信某一个模型，而是计算多个 expert predictions 的 pairwise similarity，选择平均 agreement 最高的结果。

---

## 四十二、为什么要这么做？

因为：

> **老师也会犯错。**

如果：

```text
一个 OCR 模型
```

负责给所有数据打标签。

那么它犯的错误会污染训练集。

这叫：

## Label Noise

即：

> **标签噪声。**

例如：

真实：

```text
398859
```

错误标签：

```text
398359
```

模型如果拿这个错误答案训练：

> 它会被教坏。

所以多个 expert：

```text
A：398859
B：398859
C：398859
D：398359
```

更容易发现：

> C 是异常。

---

## 四十三、Synthetic Data 是什么？

第二个数据来源是：

## 数据合成

例如：

```text
真实文字：

Hello World
```

程序可以随机：

```text
字体
字号
分辨率
背景
位置
旋转
```

生成：

```text
┌────────────────────┐
│ Hello World        │
└────────────────────┘
```

然后：

```text
图片
对应文字
```

天然知道答案。

这就叫：

## Synthetic Data

论文通过 multilingual corpus + fonts + styles + resolutions 大规模生成这类数据，还专门生成罕见字符组合。

---

## 四十四、为什么要故意生成“奇怪字符”？

因为真实数据中：

```text
A
B
C
```

很多。

但是：

```text
罕见汉字
特殊符号
数学符号
阿拉伯字符
```

可能非常少。

如果训练集里从来没出现：

```text
∂
∇
∑
≈
```

模型当然难学。

所以作者甚至主动：

> 抽取语言完整字符集，然后随机组合字符进行渲染。



---

## 四十五、Data Filtering

数据太多还有一个问题：

> **垃圾数据。**

例如：

```text
页面上明明有文字
```

但是 layout annotation 漏掉了。

他们会：

```text
把检测到的区域全部涂白
```

变成：

```text
████████████████
████████████████
████████████████
```

然后再问强大的模型：

> “你还能认出文字吗？”

如果：

> “还能。”

那说明：

> 原来的 layout 检测漏东西了。

于是：

> **丢弃这条数据。**

论文描述了这种 filtering strategy。

这是非常聪明的数据清洗。

---

## 四十六、现在回头看整个 MonkeyOCRv2

你已经可以理解：

```text
                 113M 文档数据
                       │
                       ▼
             ┌─────────────────┐
             │ MonkeyOCRv2     │
             │ Vision Encoder  │
             └─────────────────┘
                       │
              Document-native
                 representation
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
      Text Generation       Pixel Reconstruction
           │                       │
       学“是什么”              学“长什么样”
           │                       │
           └───────────┬───────────┘
                       ▼
              更强的视觉 backbone
```

---

## 四十七、第一代和第二代终于可以串起来了

这才是你读这两篇论文时最应该建立的整体理解：

```text
                   MonkeyOCR 第一代
                         │
              解决“怎么解析文档”
                         │
                         ▼
              Structure / Recognition
                         +
                      Relation
                         │
                         ▼
                  一个完整解析器
                         │
                         │
                         ▼
                 MonkeyOCRv2 第二代
                         │
               解决“视觉基础能力”
                         │
                         ▼
               Document-native Encoder
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
      Text Generation        Pixel Reconstruction
             │                       │
             └───────────┬───────────┘
                         ▼
                强大的文档视觉大脑
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
            OCR        公式        表格
             │           │           │
             └───────────┼───────────┘
                         ▼
                  Document Parsing
```

---

## 四十八、v2 最厉害的地方其实不是“113M”

很多初学者第一眼会被：

> **113M samples**

吸引。

但我认为你读论文时更应该抓住：

## “Backbone Substitution”

什么意思？

假设以前：

```text
CRNN
 ↓
CLIP/其他视觉 Encoder
 ↓
文字识别
```

现在：

```text
CRNN
 ↓
MonkeyOCRv2 Encoder
 ↓
文字识别
```

其他东西尽量不变。

如果效果明显提升：

> 说明 MonkeyOCRv2 本身就是一个更好的视觉特征提取器。

论文确实做了这种实验，例如把 CRNN、PARSeq 等模型原来的视觉 encoder 替换成 MonkeyOCRv2-S。

---

## 四十九、这就是“Encoder / Backbone”到底是什么

你以后看到：

```text
Backbone
Encoder
Vision Encoder
```

可以先统一理解成：

> **负责从图片里提取特征的视觉大脑。**

例如：

```text
图片
 ↓
┌──────────────┐
│ Vision       │
│ Encoder      │
└──────────────┘
 ↓
Visual Features
```

它通常不一定直接输出最终答案。

它更像：

> **摄影师 + 眼睛 + 视觉皮层。**

后面再接：

```text
Decoder
Head
LLM
```

负责完成具体任务。

---

## 五十、Decoder 又是什么？

Decoder 可以简单理解：

> **拿着 Encoder 提供的信息，负责生成最终结果。**

比如：

```text
Encoder：

[0.23, 0.91, -0.17, ...]
```

Decoder：

```text
The loss is...
```

或者：

```text
L = L₁ + L₂
```

或者甚至：

```text
图片
```

所以：

```text
Encoder
=
把世界转换成模型容易理解的内部表示

Decoder
=
把内部表示转换成我们需要的结果
```

---

## 五十一、MLP 又是什么？

你会经常看到：

```text
MLP
```

Multi-Layer Perceptron。

初学阶段你可以把它理解成：

> **一个负责“重新变换数字特征”的小网络。**

例如：

```text
Encoder输出：

384维

        ↓

MLP

        ↓

LLM需要：

512维
```

论文里确实存在这种接口，例如 formula recognition 中把 MonkeyOCRv2 的 384-dimensional visual tokens 映射到 MBart 所需的 512 dimensions。

所以：

```text
Vision Encoder
      ↓
384维
      ↓
MLP / Linear Projection
      ↓
512维
      ↓
Language Decoder
```

你可以把 MLP 理解成：

> **翻译官。**

Vision Encoder 说：

> “我用 384 维表达。”

Language Model：

> “我只听得懂 512 维。”

MLP：

> “行，我给你翻译一下。”

---

## 五十二、参数量到底是什么意思？

你会看到：

```text
110M
0.1B
0.6B
1.2B
3B
70B
```

例如：

```text
3B
```

就是：

> **大约 30 亿个参数。**

参数就是神经网络在训练过程中学出来的数字。

例如一个极其简化的模型：

```text
y = wx + b
```

这里：

```text
w
b
```

就是参数。

真实神经网络不是两个参数，而可能：

```text
100,000,000
1,000,000,000
3,000,000,000
```

所以：

```text
3B model
```

不是：

> “有 30 亿条知识。”

而是：

> **模型内部大约有 30 亿个可学习数字。**

---

## 五十三、参数越大是不是一定越好？

不是。

MonkeyOCR 第一代恰恰研究了：

> **有没有一些层其实没那么重要？**

他们训练：

```text
3B
```

然后尝试删除中间一些 layers。

发现：

> 某些层删掉以后，性能下降没有想象中严重。

于是提出：

## CPD

**Contiguous Parameter Degradation**

简单理解：

> **连续删除中间的一段 Transformer layers。**



---

## 五十四、为什么是“连续删除”？

假设：

```text
Layer 1
Layer 2
Layer 3
Layer 4
Layer 5
Layer 6
Layer 7
Layer 8
Layer 9
Layer 10
```

普通想法：

```text
删除 2
删除 5
删除 8
```

像拆墙：

```text
█ ░ █ █ ░ █ █ ░ █
```

CPD 更像：

```text
Layer 4
Layer 5
Layer 6
Layer 7
```

整段拿掉：

```text
1
2
3
──────
8
9
10
```

作者的经验性假设是：

> 相邻层之间的信息比较连续、耦合，所以主要从中间连续裁剪，更容易保持前后信息连续。

---

## 五十五、结果怎么样？

第一代：

```text
MonkeyOCR-3B
```

可以压成：

```text
MonkeyOCR-1.2B
```

速度提升约：

> **34%**

但性能只下降：

> **1.5%**

论文报告了这一结果。

这意味着：

> 不一定需要最庞大的模型。

---

## 五十六、为什么表格识别比文字识别更容易受到模型压缩影响？

这个也很有意思。

普通文字：

```text
Hello World
```

核心问题：

> 每个字符是什么？

而表格：

```text
┌─────┬─────┬─────┐
│ A   │ B   │ C   │
├─────┼─────┼─────┤
│ 1   │ 2   │ 3   │
└─────┴─────┴─────┘
```

除了识别：

```text
A B C 1 2 3
```

还要理解：

```text
谁属于哪一列？
哪些格子合并？
哪个文字属于哪个 cell？
```

所以：

> **表格是视觉 + 结构 + 关系。**

论文实验也发现，参数削减对简单 text recognition 影响较小，但对复杂 table recognition 影响明显。

---

## 五十七、v2 为什么能让很小的模型变强？

这是 v2 很漂亮的一点。

论文中构建了：

```text
MonkeyOCRv2-S
MonkeyOCRv2-B
```

作为视觉 encoder。

然后拿它们替换其他模型原本的视觉 encoder。

例如：

```text
CRNN
    ↓
原来的 Vision Encoder
    ↓
识别
```

换：

```text
CRNN
    ↓
MonkeyOCRv2
    ↓
识别
```

结果：

> 识别性能提升。



---

## 五十八、甚至 110M 的公式识别模型超过 325M

论文报告：

> 使用 MonkeyOCRv2 后，110M 的 UniMERNet-T 可以超过 325M 的 UniMERNet-B。

这件事非常值得你理解。

不是：

```text
模型越大
    ↓
一定越强
```

而是：

```text
视觉特征质量
       +
任务模型
       ↓
最终能力
```

如果视觉 encoder 本身更适合文档：

```text
小模型 + 好视觉
```

可能胜过：

```text
大模型 + 普通视觉
```

---

## 五十九、v2 甚至可以冻结 Encoder

这里再出现一个重要概念：

## Frozen

意思：

> **这个模型不再训练。**

例如：

```text
MonkeyOCRv2 Encoder
       ↓
     冻结 ❄️
       ↓
Qwen3-0.6B
       ↓
训练
```

训练时：

```text
Encoder 参数：
不动

LLM：
更新
```

论文就是这样构建一个 0.7B document parsing model 的，vision encoder 全程 frozen。

---

## 六十、为什么冻结一个视觉 Encoder 仍然能这么强？

因为：

> **Encoder 已经提前学会了“怎么看文档”。**

所以后面的 LLM 不需要重新学习：

```text
这个字长什么样
这个表格线在哪里
这个小数点在哪里
```

它可以直接接收：

```text
高质量 visual tokens
```

然后专心做：

> **语言生成 + 文档结构化。**

这就是 foundation encoder 的价值。

---

## 六十一、这里可以类比你学开车

普通视觉模型：

> 给你一个什么都不懂的新手司机。

MonkeyOCRv2：

> 先培养一个“眼睛特别好”的司机。

然后不同任务：

```text
OCR
表格识别
公式识别
文档问答
文档解析
```

都可以共用这双眼睛。

所以论文最终想证明的不是：

> “我有一个 OCR 模型。”

而是：

> **“我有一个专门为 Document AI 训练的通用视觉 Backbone。”**

论文结论也是围绕这个展开的。

---

## 六十二、两篇论文真正的区别

现在可以用一张表把它们钉死：

|        | MonkeyOCR                          | MonkeyOCRv2                            |
| ------ | ---------------------------------- | -------------------------------------- |
| 核心问题   | 怎么解析文档                             | 怎么训练更好的文档视觉大脑                          |
| 核心思想   | SRR                                | Document-native representation         |
| 重点     | Structure / Recognition / Relation | Vision Encoder                         |
| 数据     | MonkeyDoc 450万                     | MonkeyDoc v2 1.13亿                     |
| 语言     | 中英                                 | 17语言                                   |
| 模型     | 3B + 1.2B/0.6B                     | 小型专用 Vision Encoder                    |
| 关键技术   | SRR + CPD                          | Text Generation + Pixel Reconstruction |
| 主要目标   | Document Parsing                   | 通用 Document AI Backbone                |
| 最重要的问题 | “页面怎么拆？”                           | “视觉模型到底看没看清？”                          |

第一代数据规模和 SRR/CPD 信息来自论文摘要与方法部分。
第二代则把 113M 数据和双目标预训练作为核心贡献。

---

## 六十三、你现在最应该掌握的“知识点词典”

如果你是完全零基础，我建议你先不要试图把所有公式背下来。

先把这些词吃透：

#### 第一层：必须懂

**OCR**

> 图片 → 文字

**Document Parsing**

> 图片/PDF → 结构化文档

**Vision Encoder**

> 图片 → visual features

**LLM**

> 文字 token → 文字 token

**VLM/LMM**

> 图片 + 文字 → 多模态理解/生成

**Token**

> 模型处理信息的小单位

**Embedding**

> 把东西转换成模型可以处理的向量

**Bounding Box**

> 目标所在的矩形坐标

---

#### 第二层：MonkeyOCR核心

**Structure**

> 找到页面中的东西

**Recognition**

> 识别东西里面的内容

**Relation**

> 判断这些东西之间的关系

**Reading Order**

> 应该按照什么顺序阅读

**Pipeline**

> 多个专用模型串起来

**End-to-End**

> 输入直接到最终结果

**Cumulative Error**

> 前面错误不断传给后面

---

#### 第三层：v2核心

**Representation**

> 模型内部如何表示视觉信息

**Representation Mismatch**

> 原本视觉模型学到的东西和文档任务需要的不匹配

**Document-native**

> 专门为文档视觉特点学习的表示

**Text Generation Objective**

> 强迫模型把视觉内容和文字语义对应起来

**Pixel Reconstruction**

> 强迫模型保留真正的视觉细节

**Fine-grained**

> 非常细粒度的局部信息

**Glyph**

> 字符/字形的视觉形状

**Stroke**

> 字的笔画

---

#### 第四层：模型训练

**Pretraining**

> 先进行大规模基础训练

**Fine-tuning**

> 再针对具体任务训练

**Frozen**

> 参数冻结，不更新

**Backbone**

> 主干网络

**Parameter**

> 模型训练出来的数字

**1B / 3B**

> 十亿 / 三十亿级参数

**Pruning**

> 删除模型中的一部分参数/层

**CPD**

> 连续删除中间 Transformer layers

---

## 六十四、最后给你一个“电影版”理解

如果把 MonkeyOCR 整篇论文拍成电影。

---

#### 第一幕：旧世界

一张论文：

```text
📄
```

传统 Pipeline 派：

```text
“我来找布局。”

“我来 OCR。”

“我来识别公式。”

“我来识别表格。”

“我来排序。”

“我来合并。”
```

结果：

```text
A 错了
 ↓
B 错
 ↓
C 更错
 ↓
最终文件爆炸
```

---

#### 第二幕：巨型模型派

另一个人走进来：

> “别这么麻烦。”

然后：

```text
📄
 ↓
72B VLM
 ↓
Markdown
```

但页面太大：

```text
token ↑
attention ↑↑
计算量 ↑↑↑
```

---

#### 第三幕：MonkeyOCR

作者说：

> **“你们都极端了。”**

于是：

```text
页面
 ↓
Structure
 ↓
[文字] [表格] [公式] [图片]
 ↓
Recognition
 ↓
这些东西分别是什么？
 ↓
Relation
 ↓
它们应该怎么排列？
```

这就是：

## SRR

---

#### 第四幕：MonkeyOCRv2

然后作者继续问：

> “但是等等。”

> “我们拿一个自然图片视觉模型来看文档，它真的看清楚了吗？”

答案：

> **不一定。**

于是他们重新训练视觉大脑：

```text
113M 文档
17 languages
       ↓
MonkeyOCRv2
       ↓
┌──────────────┐
│ Text         │
│ Generation   │
├──────────────┤
│ Pixel        │
│ Reconstruction│
└──────────────┘
       ↓
真正针对文档的视觉表示
```

然后：

```text
      MonkeyOCRv2
           │
 ┌─────────┼──────────┐
 ▼         ▼          ▼
OCR      Formula     Table
 │         │           │
 └─────────┼───────────┘
           ▼
      Document AI
```

这就是两篇论文真正连起来后的故事。

---

## 六十五、你现在先不要急着看公式

尤其第一篇论文里突然出现：

```text
F0 = Backbone(I)

Fenc = Encoder(F0)

Q0 = TopK(Fenc, s, K)

y = Head(Decoder(Q0, F0))
```

以及：

```text
Q = HWq
K = HWk
V = HWv
```

第二篇又出现：

```text
Lpix
Lstruct
MSE
Sobel
MinPool
embedding
autoregressive
cross-attention
```

**现在直接硬啃这些，基本会像拿着字典读量子力学。**

正确路线应该是：

```text
① OCR 是什么
        ↓
② CNN / Vision Encoder 是什么
        ↓
③ Token / Embedding 是什么
        ↓
④ Transformer 是什么
        ↓
⑤ Attention 是什么
        ↓
⑥ Encoder / Decoder 是什么
        ↓
⑦ VLM 是怎么把图片和文字接起来的
        ↓
⑧ Object Detection / Bounding Box
        ↓
⑨ DETR
        ↓
⑩ Loss / Training
        ↓
⑪ Pretraining / Fine-tuning
        ↓
⑫ 再回来读 MonkeyOCR 公式
```

**这样你最后会发现，论文里的公式并不是凭空出现的。**

---

### 我建议我们接下来就按这个方式继续

如果你的目标是真的做到 **“以后我能自己读懂 OCR / VLM / 大模型论文”**，我可以直接把这两篇论文当成一门小课程来带你学，而不是一次性把论文翻译完。

下一节应该从最底层开始：

> **《第 1 课：一张图片进入神经网络之后究竟发生了什么？》**

我会从：

```text
像素
 ↓
RGB
 ↓
图片矩阵
 ↓
卷积 / Patch
 ↓
Feature
 ↓
Embedding
 ↓
Visual Token
 ↓
Vision Encoder
```

开始，**每一个概念都用一个具体的小图片/数字例子手算一遍**，然后再进入 Transformer、Attention，最后把这些东西一一对应回 MonkeyOCR 的公式。

这样你不是“看懂 MonkeyOCR 一篇论文”，而是在搭建以后读 **PaddleOCR、DeepSeek-OCR、MinerU、Qwen-VL、InternVL、OCR-VLM、SAM、CLIP** 都能复用的知识树。
