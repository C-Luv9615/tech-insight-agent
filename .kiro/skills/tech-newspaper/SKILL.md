---
name: tech-newspaper
description: |
  将技术洞察内容生成报纸风格的图片（类似《AI日报》排版）。
  输入多条洞察条目，输出一张复古报纸风格的 JPG 图片。
  触发词：生成报纸、newspaper、报纸图片、周刊图片、生成周刊、技术周刊。
---

# tech-newspaper

将结构化技术洞察生成复古报纸风格的图片。

## Input

用户提供以下信息（可交互式收集）：

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| title | 否 | AI日报 | 报纸名称 |
| editor | 否 | 用户名 | 主编署名 |
| issue | 否 | 自动递增 | 期号 |
| articles | 是 | — | 文章条目列表（见下方格式） |

### 文章条目格式

每条文章需要：
- `tag`: 板块标签（如：技术前沿、商业动态、产品洞察、要闻）
- `tag_icon`: 标签图标（如：🔬、📊、🔍、📰）
- `headline`: 标题
- `body`: 正文（1-3 句，支持 `<strong>` 加粗高亮）
- `comment`: 编辑点评（1-2 句，犀利观点）
- `is_headline`: 是否为头版头条（最多 1 条）

另外可选：
- `editorial`: 编辑部短评（总结性段落）
- `preview`: 下期预告

## Information Sources（按优先级）

1. **飞书日报文档** — 首选。在文件夹 `<YOUR_FEISHU_FOLDER_TOKEN>` 下查找 `技术洞察日报 YYYY-MM-DD` 文档，fetch 内容后提取各条目。生成日报图片时取当天文档，生成周刊图片时取本周所有日报文档。
2. **飞书文档 URL** — 用户直接指定某个飞书文档 URL，fetch 后提取
3. **当前对话上下文** — 如果之前已用 airelative/smart-wearable/embedded-ecosystem skill 分析过文章，从对话中提取
4. **用户直接提供** — 用户给出条目内容

### 从日报文档解析条目

日报文档中每个条目格式为：
```markdown
### [{category}] {标题}
- **一句话结论**：xxx
- **关键词**：k1, k2, k3
- **编辑点评**：xxx
- **原文链接**：url
- **详细分析**：url
```

解析后映射为报纸条目：
- `tag` ← category 映射（ai相关→技术前沿，智能穿戴→产品洞察，嵌入式生态→嵌入式生态）
- `headline` ← 标题
- `body` ← 一句话结论
- `comment` ← 编辑点评
- `is_headline` ← AI 判断最重要的一条作为头版头条

## Workflow

### Step 1: 收集内容

从对话上下文或用户输入中收集文章条目。如果信息不足，交互式询问：
- 本期有哪些文章/洞察？
- 哪条作为头版头条？
- 需要编辑部短评吗？

### Step 2: 生成 HTML

读取模板文件 `~/.kiro/skills/tech-newspaper/resources/template.html`，进行变量替换：

**模板变量：**
- `{{TITLE}}` — 报纸名称
- `{{DATE}}` — 当前日期（YYYY年M月D日 格式）
- `{{DAY_OF_WEEK}}` — 星期几
- `{{ISSUE}}` — 期号（三位数补零）
- `{{EDITOR}}` — 主编名
- `{{HEADLINE_SECTION}}` — 头版头条 HTML
- `{{SECTIONS}}` — 各板块 HTML
- `{{EDITORIAL}}` — 编辑部短评 HTML

**头版头条 HTML 片段：**
```html
<div class="headline">
  <div class="badge">头 版 头 条</div>
  <h2>{headline}</h2>
  <div class="body">{body}</div>
  <div class="editor-comment">{comment}</div>
</div>
```

**普通板块 HTML 片段：**
```html
<div class="section">
  <div class="section-tag" data-icon="{tag_icon}">{tag}</div>
  <h2>{headline}</h2>
  <div class="body">{body}</div>
  <div class="editor-comment">{comment}</div>
</div>
```

**编辑部短评 HTML 片段：**
```html
<div class="editorial">
  <div class="editorial-title">编辑部短评</div>
  <div class="body">{editorial}</div>
  <div class="preview">{preview}</div>
</div>
```

将替换后的完整 HTML 写入临时文件 `/tmp/newspaper_YYYYMMDD.html`。

### Step 3: 截图

```bash
cd ~/.kiro/skills/tech-newspaper/resources
node screenshot.js /tmp/newspaper_YYYYMMDD.html ~/tech-insight-agent/newspaper_YYYYMMDD.jpg 960
```

回退方案（puppeteer 不可用时）：
```bash
google-chrome --headless --screenshot=~/tech-insight-agent/newspaper_YYYYMMDD.png \
  --window-size=960,800 --disable-gpu /tmp/newspaper_YYYYMMDD.html
```

### Step 4: 输出

1. 告知用户图片路径：`~/tech-insight-agent/newspaper_YYYYMMDD.jpg`
2. 如果用户要求上传飞书，使用飞书工具上传
3. 显示生成的 HTML 预览路径，方便用户用浏览器打开微调

## 内容编写指南

AI 在将洞察转化为报纸条目时，遵循以下风格：

### 正文风格
- 每条正文 2-4 句，信息密度高
- 用 `<strong>` 标记关键结论或亮点词句
- 避免空泛描述，要有具体事实/数据

### 编辑点评风格
- 1-2 句，观点鲜明，略带犀利
- 可以做横向对比、趋势判断
- 语气：专业但不学术，像资深从业者的朋友圈评论

### 板块分类参考
| 板块 | 图标 | 适用内容 | 对应 skill |
|------|------|----------|-----------|
| 技术前沿 | 🔬 | AI 框架、Agent 协议、端云协同 | airelative |
| 产品洞察 | 🔍 | 穿戴新品、AI 设备、功能更新 | smart-wearable |
| 嵌入式生态 | ⚙️ | 芯片、RTOS、RISC-V、开源硬件 | embedded-ecosystem |
| 商业动态 | 📊 | 融资、开源、公司战略 | 通用 |
| 要闻 | 📰 | 定价、政策、行业重大事件 | 通用 |
| AI+IoT | 🌐 | 智能家居/车载/工业中 AI 新突破 | embedded-ecosystem |

### 编辑部短评风格
- 提炼本期主线（1-2 句）
- 点出趋势方向
- 末尾可加"下期预告"

## Key Rules

- 每期建议 4-6 条文章，1 条头版头条
- 正文严格基于原始洞察内容，不编造数据
- 编辑点评可以有主观判断，但要基于事实
- HTML 模板可自定义，修改 `resources/template.html`
- 图片宽度默认 960px，2x 渲染保证清晰度
