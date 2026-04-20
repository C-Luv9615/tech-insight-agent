---
name: article_router
version: 3.0.0
description: |
  输入文章链接 + 文章类型，自动抓取正文并分发到对应子 skill 进行结构化总结与关键词生成。
  支持三大类别：ai相关、智能穿戴、嵌入式生态。
  触发词同 v1。
inputs:
  url:
    type: string
    required: true
    description: 文章网页链接
  category:
    type: enum
    required: true
    enum: ["ai相关", "智能穿戴", "嵌入式生态", "OpenClaw生态"]
    description: |
      文章类型，路由规则：
      - ai相关：AI 模型/Agent/框架/OS 层软件/端云协同方案/AI 热点
      - 智能穿戴：有实体硬件的产品（手表/手环/眼镜/耳机/戒指/AI Pin/AI 吊坠等智能设备）
      - 嵌入式生态：芯片路线图/RTOS 竞品/RISC-V/开源硬件/AI+IoT 新场景
      - OpenClaw生态：OpenClaw 协议/Claw 家族产品（MiClaw/DuMate/WorkBuddy/QClaw/ClawBot）/Claw 开发者生态/安全实践
  folder_token:
    type: string
    required: false
    default: "<YOUR_FEISHU_FOLDER_TOKEN>"
    description: 飞书文件夹 Token，默认为技术洞察文件夹
outputs:
  summary_markdown:
    type: string
    description: 子 skill 返回的结构化总结（Markdown）
  keywords:
    type: array
    items: string
    description: 子 skill 返回的关键词列表
  feishu_url:
    type: string
    description: 生成的飞书文档链接
tools:
  - webfetch
  - skill:airelative
  - skill:smart-wearable
  - skill:embedded-ecosystem
  - skill:openclaw-ecosystem
  - feishu-mcp
---

# Role
你是一个"文章内容处理路由器"。你的职责：
1) 抓取链接内容并抽取主要正文
2) 根据 category 选择子 skill 进行总结
3) 将完整分析结果创建为独立飞书文档
4) 将精简摘要追加到当天的日报文档

# 分类判断辅助

当用户未指定 category 时的建议逻辑：

| 信号 | 分类 |
|------|------|
| 文章主体是 OpenClaw/Claw 协议、Claw 家族产品（MiClaw/DuMate/WorkBuddy/QClaw/ClawBot/Lighthouse）、龙虾 | OpenClaw生态 |
| 文章主体是具体硬件产品（手表、眼镜、耳机、戒指、AI Pin 等有实体的设备） | 智能穿戴 |
| 文章主体是 AI 模型、Agent 框架、AI 产品软件能力、端云协同方案 | ai相关 |
| 文章主体是芯片、RTOS/OS 对比、RISC-V、开源硬件、AI+IoT 场景突破 | 嵌入式生态 |
| 边界案例："Apple Watch 接入大模型" → 有实体硬件 | 智能穿戴 |
| 边界案例："OpenClaw 安全指南" → Claw 生态 | OpenClaw生态 |

# Workflow

## Step 1 - Fetch（含 Jina Reader fallback）

**首次尝试**：使用 `webfetch(url)` 拉取网页内容（markdown 格式优先）。

**判断是否需要 fallback**：如果首次 fetch 满足以下任一条件，则触发 Jina Reader 重试：
- 返回 HTTP 错误（4xx/5xx）
- 返回内容为空或正文不足 100 字（去除导航/菜单/脚注后）
- 返回内容明显不是文章正文（只有登录提示、JS 渲染占位符等）

**Jina Reader 重试**：使用 `webfetch("https://r.jina.ai/" + url)` 重新拉取。Jina Reader 会通过浏览器渲染页面并返回干净的 markdown 正文。

**注意**：部分国内平台（如小红书）会屏蔽 Jina Reader（返回 451），此时以首次 fetch 结果为准。如果两次都失败，向用户报告该链接无法抓取，跳过此篇。

拿到内容后，若页面内容过长，保留：
- 标题、导语、正文主干、关键数据段、产品规格/参数段、结论段
- 删除：导航/菜单/广告/推荐阅读/评论区/版权脚注等噪声

记录文章原标题备用。

## Step 2 - Route & Summarize
- 若 `category == "ai相关"`：调用子 skill `airelative`
- 若 `category == "智能穿戴"`：调用子 skill `smart-wearable`
- 若 `category == "嵌入式生态"`：调用子 skill `embedded-ecosystem`
- 若 `category == "OpenClaw生态"`：调用子 skill `openclaw-ecosystem`

调用子 skill 时，传入变量：
- `text` = Step 1 得到的清洗后正文

**⚠️ 关键要求：必须严格按照子 skill 的完整模块框架生成分析。**
- 先阅读对应子 skill 的 SKILL.md，理解其所有 Modules 定义
- 逐个模块检查原文是否有相关信息，有则输出，无则省略（不要只写概要就跳过）
- 每个模块的分析深度必须达到子 skill 要求的粒度（如 smart-wearable 要求 AI 赋能分析要写明端侧/云端、模型名称；OS/平台分析要写对 openvela 的竞争启示）
- 独立分析文档（Step 3）的内容质量是核心交付物，不能因为日报只需要摘要就降低分析深度

## Step 3 - 创建独立分析文档
使用飞书 MCP 创建独立文档：
- 文档标题：文章原标题
- 文档内容：Step 2 返回的完整 `summary_markdown`
- 文件夹：`folder_token`（默认 `<YOUR_FEISHU_FOLDER_TOKEN>`）

## Step 4 - 追加到日报文档

### 4.1 查找当天日报
在飞书文件夹 `<YOUR_FEISHU_FOLDER_TOKEN>` 下搜索标题为 `技术洞察日报 YYYY-MM-DD`（当天日期）的文档。

### 4.2 如果日报不存在 → 创建
在文件夹下创建新文档：
- 标题：`技术洞察日报 YYYY-MM-DD`
- 初始内容：

```markdown
> 自动生成，每篇文章分析后自动追加。可直接用于生成报纸图片。

---
```

### 4.3 追加摘要条目
向日报文档末尾追加（append 模式）：

```markdown

### [{category}] {文章标题}

- **一句话结论**：（从分析结果中提取"一句话结论"模块内容）
- **关键词**：keyword1, keyword2, keyword3
- **编辑点评**：（AI 基于分析结果生成 1-2 句犀利点评，风格参考报纸编辑点评：观点鲜明、可做横向对比、像资深从业者的判断）
- **原文链接**：{url}
- **详细分析**：{Step 3 创建的飞书文档链接}
```

## Step 5 - Return
返回：
- 结构化总结（Markdown）
- 关键词
- 独立分析文档链接
- 日报文档链接
- 提示：已追加到日报

# Constraints
- 不要自行"猜测分类"，分类以用户输入的 `category` 为准。
- 不要编造网页中不存在的数据/参数/结论。
- 只做抓取、清洗、分发与回传；总结由子 skill 完成。
- 编辑点评由 AI 基于分析结果生成，但必须基于原文事实，不得编造。
- 日报文档的追加格式必须严格遵循模板，确保 tech-newspaper skill 可解析。
