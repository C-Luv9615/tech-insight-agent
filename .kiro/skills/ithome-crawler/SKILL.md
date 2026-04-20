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
| 嵌入式生态 | RTOS、芯片、RISC-V、高通、联发科、恒玄、杰理、Zephyr、NuttX、鸿蒙、HarmonyOS、Wear OS、Matter、Thread、NPU、openvela、Vela、POSIX、RT-Thread、FreeRTOS、穿戴 OS、车载 RTOS、智能家居、开源芯片、开源硬件、开源OS、端侧模型、本地推理、模型量化 |
| OpenClaw生态 | OpenClaw、Claw、龙虾、ClawBot、MiClaw、DuMate、WorkBuddy、QClaw、Lighthouse |

### 排除关键词（命中则跳过）
游戏评测、电商促销、限时免费、喜加一、清仓、优惠券、国补、发车、探底、探新低、官方大促、京东自营

### 嵌入式生态品类排除规则
以下类型的文章不归入嵌入式生态，即使命中了嵌入式关键词：
- iOS/iPhone/iPad/macOS 的 OS 层更新（如 iOS 27 新功能、Siri 升级等）——与 Vela/NuttX 关联度低
- 纯手机/PC/服务器端的 AI 模型部署——除非明确涉及 RTOS/MCU/嵌入式芯片
- **PC/笔记本处理器**（如英特尔酷睿、AMD 锐龙的桌面/笔记本 SKU）——不属于嵌入式芯片
- **手机 SoC**（如骁龙 8 系列、天玑 9000 系列、Tensor 等手机处理器）——除非明确涉及与穿戴/IoT 嵌入式设备的互联或与 Vela 有直接关联
- **PC/笔记本市场报告**（如笔记本出货量、PC 市场份额等）——不属于嵌入式生态

**嵌入式生态严格只选以下方向：**
- 穿戴芯片（恒玄、杰理、瑞芯微、高通穿戴平台等）
- RTOS/嵌入式 OS（Zephyr/FreeRTOS/RT-Thread/NuttX/HarmonyOS 穿戴版等）
- MCU/嵌入式处理器（Cortex-M 系列、RISC-V MCU 等）
- IoT 设备与协议（Matter/Thread/Zigbee/智能家居 hub/传感器节点等）
- 端侧 AI 在嵌入式设备上的落地（TinyML/NPU on MCU 等）
- 开源嵌入式硬件与社区治理

**判断标准：文章的目标平台是否属于 Vela 业务场景。**

Vela 业务场景包括：
- 可穿戴设备（手表、手环、眼镜、耳机、戒指等）——含 Apple Watch、Wear OS 手表等
- 车载小设备（车载 RTOS、车载显示、车载传感器等）
- IoT 小设备（智能家居 hub、传感器节点、智能音箱等）
- 上述设备通过云边端协同获得的 AI 能力（端侧推理、模型下沉、边缘计算等）

**嵌入式生态重点关注场景（日报/周报必选方向）：**
1. Apple Watch 等穿戴设备的新功能/芯片升级 → 可穿戴场景动态
2. 恒玄/杰理/瑞芯微等穿戴芯片厂商的新品发布 → 直接相关硬件平台
3. Zephyr/RT-Thread/FreeRTOS/HarmonyOS 等竞品 RTOS 的新版本/新功能 → 竞品动态
4. 智能家居 hub 支持 Thread/Matter 等协议 → IoT 互联场景
5. 穿戴/IoT 设备通过云边端协同获得 AI 能力 → Vela AI 赋能方向
6. TinyML/端侧推理框架在 MCU 上的进展 → 端侧 AI 落地

不属于 Vela 场景的：
- 手机 OS 层（iOS/Android 系统更新）
- PC/服务器端 AI 部署
- 纯云端 AI 服务

## 自动筛选策略（共 10 条）

从候选文章中按以下规则自动选出 10 条，无需用户确认：

### 配额分配
- 智能穿戴：3-4 条（Vela 核心下游场景，最直接的产品落地方向）
- 嵌入式生态：2-3 条（芯片/RTOS/RISC-V/开源硬件，与 Vela/NuttX 技术栈直接相关）
- ai相关：2-3 条（侧重端侧 AI、RTOS 上的 AI 部署等与嵌入式结合的方向）
- OpenClaw生态：0-1 条（严格筛选，仅当文章涉及 RTOS 端侧 Claw 实现、或 RTOS/嵌入式设备与 Claw 联动时才入选；纯手机/PC/云端的 Claw 动态不选入日报）

### 优先级排序（同品类内）
1. 产品发布/重大更新 > 市场报告 > 观点评论
2. 与 Vela/NuttX/openvela 技术栈直接相关的 > 与嵌入式间接相关的 > 泛行业新闻
3. 有具体数据/参数的 > 纯观点
4. 竞品动态优先：Zephyr/RT-Thread/FreeRTOS/HarmonyOS 的新版本、新功能、生态变化
5. 下游场景关注：穿戴 OS、车载 RTOS、智能家居 hub 等 Vela 目标场景的技术趋势
6. OpenClaw 品类严格筛选：仅选端侧 Claw（运行在 RTOS 上的 Claw 实现）或 RTOS 设备与 Claw 联动的新闻；纯手机/PC/云端 Claw 产品动态、厂商表态、推广/教程类一律不选

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
- **严格只选当天文章**：只有页面上标注日期为当天（如"今日"或当天日期"03月27日"）的文章才可入选，前一天及更早的文章一律排除，不论内容多好。候选不足时宁可少选，不凑昨天的文章。
