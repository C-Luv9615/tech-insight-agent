---
name: ithome-crawler
description: |
  从 IT 之家自动抓取当日与技术洞察相关的文章。覆盖 AI、数码、手机等频道，按关键词过滤出与 AI/智能穿戴/嵌入式生态/OpenClaw 相关的文章。
  触发词：抓取文章、爬取IT之家、自动抓取、fetch ithome、今日文章、抓新闻。
---

# ithome-crawler

从 IT 之家自动抓取当日技术洞察相关文章，全自动筛选，无需用户确认。

## 抓取源

| 频道 | URL |
|------|-----|
| AI | https://www.ithome.com/tag/AI |
| 数码 | https://www.ithome.com/tag/数码 |
| 手机 | https://www.ithome.com/tag/手机 |

## 过滤关键词

### 入选关键词（命中任一即候选）

| 品类 | 关键词 |
|------|--------|
| ai相关 | AI、大模型、智能体、Agent、GPT、Claude、LLM、端侧模型、端云协同、MCP、Copilot、Gemini、DeepSeek、MiMo |
| 智能穿戴 | 手表、手环、眼镜、耳机、戒指、AI Pin、穿戴、可穿戴、Watch、AirPods、Galaxy Ring、Vision Pro |
| 嵌入式生态 | RTOS、芯片、RISC-V、高通、联发科、恒玄、杰理、Zephyr、NuttX、鸿蒙、HarmonyOS、Wear OS、Matter、Thread、NPU、OpenVela、Vela、POSIX、RT-Thread、FreeRTOS、穿戴 OS、车载 RTOS、智能家居 |
| OpenClaw生态 | OpenClaw、Claw、龙虾、ClawBot、MiClaw、DuMate、WorkBuddy、QClaw、Lighthouse |

### 排除关键词（命中则跳过）
游戏评测、电商促销、限时免费、喜加一、清仓、优惠券、国补、发车、探底、探新低、官方大促、京东自营

## 自动筛选策略（共 10 条）

从候选文章中按以下规则自动选出 10 条，无需用户确认：

### 配额分配
- 嵌入式生态：3-4 条（最核心品类，与 Vela/NuttX 最直接相关）
- ai相关：2-3 条（侧重端侧 AI、RTOS 上的 AI 部署等与嵌入式结合的方向）
- 智能穿戴：2-3 条（Vela 核心下游场景）
- OpenClaw生态：1-2 条（有则选，无则不凑数）

### 优先级排序（同品类内）
1. 产品发布/重大更新 > 市场报告 > 观点评论
2. 与 Vela/NuttX/OpenVela 技术栈直接相关的 > 与嵌入式间接相关的 > 泛行业新闻
3. 有具体数据/参数的 > 纯观点
4. 竞品动态优先：Zephyr/RT-Thread/FreeRTOS/HarmonyOS 的新版本、新功能、生态变化
5. 下游场景关注：穿戴 OS、车载 RTOS、智能家居 hub 等 Vela 目标场景的技术趋势
6. OpenClaw 品类侧重：新功能发布、创新应用、端侧 Claw 落地（忽略纯推广/教程类）

### 去重
同一事件的多篇报道只保留信息量最大的一篇。

## Workflow

### Step 1: 抓取
用 `web_fetch` 依次抓取各频道页面，提取文章列表（标题 + 链接 + 日期）。只保留当天文章。

### Step 2: 过滤 + 分类
对每篇标题应用关键词匹配，自动分类。排除命中排除关键词的文章。

### Step 3: 自动选取 10 条
按配额和优先级自动选出 10 条，直接返回最终列表。

### Step 4: 输出
返回结构化列表：

```
今日筛选文章（YYYY-MM-DD）共 10 条：

1. [OpenClaw生态] 标题xxx — 链接
2. [ai相关] 标题xxx — 链接
3. [智能穿戴] 标题xxx — 链接
...
```

不等待用户确认，直接进入批量分析。

## Key Rules
- 固定 10 条，不多不少（候选不足 10 条时有多少选多少）
- 全自动，不需要用户确认
- 嵌入式生态是最核心品类，所有品类的筛选都应带有 Vela/NuttX 视角
- 只抓取当天文章
