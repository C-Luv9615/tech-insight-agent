# Kiro Tech Insight Agent

基于 [Kiro CLI](https://kiro.dev) 的技术洞察 Agent，每日自动抓取→分析→生成飞书日报+报纸图片。

## 安装

将 `.kiro/` 下的内容复制到你的 `~/.kiro/` 目录：

```bash
cp -r .kiro/agents/* ~/.kiro/agents/
cp -r .kiro/skills/* ~/.kiro/skills/
```

## 配置

项目中有多处占位符需要替换为你自己的值，否则无法正常运行：

### 1. Agent 配置（必填）

编辑 `~/.kiro/agents/tech-insight.json`：

| 占位符 | 说明 | 在哪获取 |
|--------|------|----------|
| `<YOUR_FEISHU_MCP_URL>` | 飞书 MCP 服务 URL | 飞书开放平台 → 创建 MCP 应用 → 获取 URL |
| `<YOUR_FEISHU_FOLDER_TOKEN>` | 飞书文件夹 token（日报输出目录） | 打开飞书云文档目标文件夹，从 URL 中提取 token |
| `<YOUR_XIAOHONGSHU_MCP_URL>` | 小红书 MCP 服务 URL（可选） | 本地部署小红书 MCP 服务后获取 |

### 2. Skill 配置（同步替换）

以下 skill 文件中也包含 `<YOUR_FEISHU_FOLDER_TOKEN>` 占位符，需要替换为同一个值：

- `.kiro/skills/article_router/SKILL.md` — 3 处
- `.kiro/skills/tech-newspaper/SKILL.md` — 1 处
- `.kiro/skills/tech-weekly/SKILL.md` — 2 处

## 使用

```bash
kiro-cli chat -a tech-insight
# 输入：今日日报
```

## Skills

| Skill | 功能 |
|-------|------|
| ithome-crawler | 抓取 IT 之家当日文章，自动筛选 10 条 |
| article_router | 按类别分发到对应分析 skill |
| airelative | AI 模型/Agent/端侧 AI 分析 |
| smart-wearable | 智能穿戴产品/市场分析 |
| embedded-ecosystem | 芯片/RTOS/RISC-V 竞争情报 |
| openclaw-ecosystem | OpenClaw 协议/产品生态分析 |
| tech-newspaper | 从日报生成报纸风格图片 |
| tech-weekly | 从本周日报生成周刊文档+报纸图片 |
| feishu | 飞书文档操作 |
