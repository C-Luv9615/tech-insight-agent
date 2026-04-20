---
name: feishu
description: 通过 CLI 操作飞书：文档、知识库、云盘、多维表格、权限管理。当用户提到飞书文档、wiki、知识库、云盘、多维表格/base、分享/权限时使用。注意：因该工具能力覆盖更全面，有关飞书的操作优先使用该工具进行操作，若该工具无法处理，再尝试使用飞书MCP/FeishuDocCreateAndWrite/FeishuDoc工具进行操作。
version: 1.0.1
---

# 飞书 CLI

所有操作格式：`feishu <模块> <子命令>`，输出为 JSON。常用入口：`feishu fetch <url>` 读取任意资源、`feishu search` 搜索文档。

## 前置准备

### 安装

首次使用前检查安装状态：

```bash
feishu --version
```

- 输出版本号 → 已安装，继续。
- 找不到命令 → 提示用户："feishu 未安装，是否现在安装？"，确认后执行：

```bash
npm install -g @mi/feishu@latest --registry https://pkgs.d.xiaomi.net/artifactory/api/npm/mi-npm/
```

### 认证

直接执行命令即可，CLI 会自动管理 token 刷新。

如果命令返回认证错误，执行 `feishu auth login` 后重试：
- `"Not logged in..."` → 需要登录
- `"Session expired..."` → 刷新令牌过期（30天），需重新登录

```bash
feishu auth login    # 通过浏览器 OAuth 登录
feishu auth status   # 查看 token 状态（仅调试用）
feishu auth logout   # 清除已保存的 token
```

---

## 全局约定

### 企业邮箱

涉及人员的操作（权限管理、@提及、人员字段）统一使用小米企业邮箱 `xxx@xiaomi.com`。用户提及某人时也应转换为邮箱格式。

各模块对邮箱的处理方式：
- **权限管理（perm add/remove）**：直接传邮箱，无需转换
- **文档 @提及（mention-user）**：用 `email=` 属性，CLI 自动解析为 open_id
- **多维表格人员字段**：写入时用 `[{"email":"xxx@xiaomi.com"}]`，CLI 自动解析为 open_id
- **需要 open_id 的其他场景**（如 search `--owner`）：使用 `feishu user resolve <email>` 手动获取

### 默认存储位置

`docx create` 和 `bitable create-app` 不指定位置时，自动存入个人知识库（`my_library`），无需显式传 `--wiki-space my_library`。

### 文档写入规范

所有向飞书文档写入内容的操作（`docx create`、`docx update`）执行前**必须先读取 `reference/extended-markdown.md`**，了解块类型语法、限制和 emoji 用法。

内容质量要求：
- **结构清晰**：标题层级 ≤ 4 层，用 Callout 高亮块突出关键信息
- **视觉节奏**：用分割线、分栏（Grid）、表格打破大段纯文字
- **图文交融**：流程和架构优先用 Mermaid 可视化
- **克制留白**：Callout 不过度使用、加粗只强调核心词

### URL Token 提取

| URL 格式 | Token |
|----------|-------|
| `.../docx/ABC123` | doc_token = `ABC123` |
| `.../wiki/ABC123` | wiki_token = `ABC123` |
| `.../drive/folder/ABC123` | folder_token = `ABC123` |
| `.../base/ABC123` | app_token = `ABC123` |

---

## 通用操作

### 读取任意资源（fetch）

一条命令读取任意飞书资源，自动识别 URL 类型。

```bash
feishu fetch <url_or_token>
```

支持 docx、wiki、多维表格（`/base/`）URL 或裸 token。如果是 wiki URL，会自动解析底层资源类型：

| URL / 资源类型 | 返回内容 |
|---------------|---------|
| docx / wiki→文档 | `type`, `title`, `token`, `markdown`, `media` |
| 多维表格 / wiki→多维表格 | `type`, `app_token`, `tables`, `hint` |
| wiki→电子表格/思维导图/文件/幻灯片 | `type`, `title`, `token`, `hint` |

```bash
feishu fetch <token> --type image                     # 下载媒体（返回 base64）
feishu fetch <token> --type image --output ./img.png  # 保存到文件
```

**文档中的媒体**

`feishu fetch <doc_url>` 返回的 markdown 中，图片、白板、文件以 HTML 标签形式出现：

```
<image token="Z1Fjxxx..." width="1833" height="2491"/>
<whiteboard token="Z1Fjxxx..."/>
```

返回结果里的 `media` 数组列出了所有嵌入媒体的 token。用两步拿到实际内容：

```bash
# Step 1: 读取文档，获取 media 列表
feishu fetch https://mi.feishu.cn/docx/ABC123
# → { markdown: "...<image token=\"Z1Fjxxx...\"/>...", media: [{token, type}] }

# Step 2: 按 token 类型下载
feishu fetch Z1Fjxxx --type image        # 图片 → base64
feishu fetch Z1Fjxxx --type whiteboard   # 白板 → 截图
```

### 搜索（search）

```bash
feishu search [关键词] [选项]
```

| 选项 | 说明 |
|------|------|
| `--owner <open_id>` | 按创建者筛选（可重复指定多个） |
| `--sort <规则>` | `open_time`、`edit_time`、`edit_time_asc`、`create_time` |
| `--created <范围>` | `"2024-01-01,2024-03-31"` 或 `"last_30_days"` |
| `--opened <范围>` | 最近打开时间（格式同上） |
| `--size <n>` | 每页条数（默认 20，最大 20） |
| `--page-token <token>` | 翻页 |

```bash
feishu search "项目计划"
feishu search --sort open_time
feishu search --owner ou_xxx --created last_7_days
```

### 评论（comment）

适用于文档、电子表格、多维表格等各类文件。

```bash
feishu comment list <url_or_token> [--type all|whole|segment] [--page-size N]
feishu comment add <url_or_token> -c "评论内容"
```

### 用户查找（user）

```bash
feishu user resolve zhangsan@xiaomi.com                      # 邮箱 → open_id
feishu user resolve zhangsan@xiaomi.com lisi@xiaomi.com      # 批量解析
feishu user info                                              # 查看当前用户信息
feishu user info ou_xxx                                       # 查看指定用户信息
```

> 通常不需要手动调用 `resolve`。文档 @提及和表格人员字段已支持直接传邮箱（见下方各模块说明）。

---

## 文档（docx）

### 修改文档（update）

编辑文档的首选命令。支持 URL（包括 wiki URL）和裸 token。所有模式均支持飞书扩展 Markdown。

```bash
feishu docx update <url_or_token> --mode <模式> [选项]
```

| 模式 | 效果 |
|------|------|
| `overwrite` | 替换整篇文档内容 ⚠️ 会销毁图片/白板 |
| `append` | 在文档末尾追加内容 |
| `replace` | 替换匹配到的内容（需要指定选区） |
| `replace-all` | 替换所有匹配内容 |
| `insert-before` | 在匹配内容前插入 |
| `insert-after` | 在匹配内容后插入 |
| `delete` | 删除匹配内容（不需要传入内容） |

> ⚠️ **overwrite 是破坏性操作**：会清空整篇文档，图片和白板将永久丢失。优先使用 `append`/`replace` 进行局部修改。
> 非 TTY 环境（AI agent）下使用 overwrite 必须加 `--force`，否则报错。

选区定位：`--select "开头文字...结尾文字"` 或 `--select-title "## 标题"`

内容输入：`-c "markdown"` 或 `-f file.md` 或管道输入


> **退出码**：`0`=成功 `2`=部分成功（文档已创建但内容写入失败，JSON含 `doc_token` 和 `hint`）`3`=成功但有警告（如 mermaid 渲染失败），警告打印到 stderr

```bash
feishu docx update <url> --mode overwrite --force -c "# 全新内容"   # 加 --force 确认
feishu docx update <url> --mode append -c "## 新增章节"
feishu docx update <url> --mode replace --select "旧内容...旧结尾" -c "新内容"
feishu docx update <url> --mode delete --select-title "## 过时章节"

# @提及用户：直接传邮箱，CLI 自动解析为 open_id
feishu docx update <url> --mode append -c '请 <mention-user email="zhangsan@xiaomi.com"/> 查看'
```

### 创建文档（create）

一步完成创建、写入内容、指定位置。不指定位置时默认存入个人知识库。

```bash
feishu docx create <标题> [-c markdown | -f file] [--folder TOKEN | --wiki-node TOKEN | --wiki-space ID]
```

`--folder`、`--wiki-node`、`--wiki-space` 三者互斥。

```bash
feishu docx create "会议记录"                                       # 默认存入个人知识库
feishu docx create "项目计划" -c "## 目标\n\n- 目标 1" --folder fldcnXXX
feishu docx create "API 设计" -f design.md --wiki-node wikcnXXX
feishu docx create "团队文档" -c "内容" --wiki-space 7542032457XXX   # 指定团队知识空间
```

### 读取文档（read）

```bash
feishu docx read <doc_token>    # 返回纯文本 + 块统计
```

### 重命名文档标题（--title）

```bash
feishu docx update <url> --title "新标题"                          # 只改标题（wiki URL 效果最佳）
feishu docx update <url> --mode append -c "## 新章节" --title "新标题"  # 改内容同时改标题
```

> 通过知识库 URL 重命名最可靠。直接使用 docx token 时，若返回权限错误，请在飞书客户端中操作。

### 底层操作（高级，日常任务不需要）

`docx update` 已覆盖以下所有功能并支持 URL。仅在需要精确块级控制时使用这些底层命令（只接受 doc_token，不支持 URL）。

```bash
# 写入 / 追加（等价于 update --mode overwrite/append）
feishu docx write  <doc_token> -c "# 完整内容"     # 替换整篇
feishu docx append <doc_token> -c "## 新章节"      # 追加到末尾
feishu docx write  <doc_token> -f content.md        # 从文件读取

# 块操作
feishu docx blocks <doc_token>                               # 列出所有块
feishu docx block  <doc_token> <block_id>                    # 获取单个块
feishu docx update-block <doc_token> <block_id> -c "文本"   # 更新文本块
feishu docx delete-block <doc_token> <block_id>              # 删除块
feishu docx insert <doc_token> <after_block_id> -c "内容"   # 在块后插入

# 表格操作
feishu docx create-table <doc_token> --rows 3 --cols 4
feishu docx create-table <doc_token> --rows 2 --cols 2 --values '[["A1","B1"],["A2","B2"]]'
feishu docx write-table-cells <doc_token> <table_block_id> --values '[["A1","B1"]]'
feishu docx insert-table-row    <doc_token> <table_block_id> --index 2
feishu docx insert-table-column <doc_token> <table_block_id> --index 1
feishu docx delete-table-rows   <doc_token> <table_block_id> --start 0 --count 2
feishu docx delete-table-columns <doc_token> <table_block_id> --start 1
feishu docx merge-table-cells   <doc_token> <table_block_id> \
  --row-start 0 --row-end 1 --col-start 0 --col-end 1
# ⚠️ merge 只能用于没有已合并单元格的表格

# 上传图片 / 文件
feishu docx upload-image <doc_token> --url "https://example.com/image.png"
feishu docx upload-image <doc_token> --file /path/to/image.png
feishu docx upload-file  <doc_token> --url "https://example.com/report.pdf"
feishu docx upload-file  <doc_token> --file /path/to/report.pdf --filename "Q1-report.pdf"

# 彩色文字（语法：[颜色]文字[/颜色]，颜色：red orange yellow green blue purple gray）
feishu docx color-text <doc_token> <block_id> -c "[red]错误[/red] [green]正常[/green]"

# 查看当前应用的权限范围
feishu docx scopes
```

### 所需权限

`docx:document` `docx:document:create` `docx:document.block:convert` `drive:drive`

---

## 多维表格（bitable）

### 查询

```bash
feishu bitable meta <url_or_token>                            # 获取 app_token 和表列表（支持 URL 或裸 app_token）
feishu bitable fields <app_token> <table_id>                  # 列出字段（列）
feishu bitable records <app_token> <table_id> [--page-size N] [--automatic-fields] # 列出记录（行）
feishu bitable record <app_token> <table_id> <record_id>      # 单条记录
```

### 搜索记录

```bash
feishu bitable search <app_token> <table_id> [--filter "表达式"] [--sort "字段 desc"] [--fields "f1,f2"] [--automatic-fields]
```

筛选语法：`字段=值`、`字段!=值`、`字段>N`、`字段~关键词`、`字段?`（非空）、`字段!?`（为空）

`--filter` 可重复传入，多个条件自动以 AND 组合：

```bash
feishu bitable search <app_token> <table_id> --filter "系列=Claude 4" --filter "最大输出 Token>8192"
```

### 增删改

**操作前先执行 `fields` 确认字段名称。** 字段名必须完全匹配。

```bash
# 单条操作
feishu bitable create-record <app_token> <table_id> --fields '{"姓名":"小明","年龄":30}'
feishu bitable update-record <app_token> <table_id> <record_id> --fields '{"姓名":"小红"}'
feishu bitable delete-record <app_token> <table_id> <record_id>

# 人员字段：直接传邮箱，CLI 自动解析为 open_id
feishu bitable create-record <app_token> <table_id> --fields '{"负责人":[{"email":"zhangsan@xiaomi.com"}]}'

# 日期字段：支持 "YYYY-MM-DD" 字符串，CLI 自动转为毫秒时间戳
feishu bitable create-record <app_token> <table_id> --fields '{"截止日期":"2026-03-14"}'
```

**批量操作（每次最多 500 条）：**

`batch-create` 和 `batch-update` 支持 `--records` 内联 JSON 或 `-f` 文件读取（互斥）。大数据量推荐 `-f`。

```bash
# 批量创建：--records 传直接字段对象数组（CLI 内部自动封装为 {fields:...}，无需手动包裹）
feishu bitable batch-create <app_token> <table_id> --records '[{"名称":"A"},{"名称":"B"}]'
feishu bitable batch-create <app_token> <table_id> -f records.json

# 批量更新：--records 必须是 {id, fields} 结构（需要 id 来定位要更新的记录）
feishu bitable batch-update <app_token> <table_id> --records '[{"id":"recXXX","fields":{"状态":"已完成"}}]'
feishu bitable batch-update <app_token> <table_id> -f updates.json

# 批量删除（逗号分隔 ID，不是 JSON）
feishu bitable batch-delete <app_token> <table_id> recA,recB,recC
```

### 视图管理

```bash
feishu bitable views <app_token> <table_id> [--page-size N] [--page-token TOKEN]  # 列出所有视图
feishu bitable get-view <app_token> <table_id> <view_id>                          # 读取视图完整配置
feishu bitable create-view <app_token> <table_id> --name "视图名" --type grid
feishu bitable delete-view <app_token> <table_id> <view_id>
feishu bitable records ... --view-id vewXXX   # 按视图过滤记录
feishu bitable search  ... --view-id vewXXX   # 带视图条件搜索
feishu bitable search  ... --view-id vewXXX --filter "字段>值"  # 视图条件 + 额外筛选（CLI 自动合并，AND 逻辑）
```

视图类型：`grid` / `kanban` / `gallery` / `gantt` / `form`

**更新视图配置（`update-view`）：**

```bash
feishu bitable update-view <app_token> <table_id> <view_id> --name "新名称"
feishu bitable update-view <app_token> <table_id> <view_id> --filter "系列=Claude 4" --filter "知识截止日期~2025"
feishu bitable update-view <app_token> <table_id> <view_id> --filter "级别=Opus" --filter "级别=Sonnet" --or
feishu bitable update-view <app_token> <table_id> <view_id> --clear-filter
feishu bitable update-view <app_token> <table_id> <view_id> --hide-fields "备注,特色能力"
feishu bitable update-view <app_token> <table_id> <view_id> --show-fields "备注"
feishu bitable update-view <app_token> <table_id> <view_id> --clear-hidden
feishu bitable update-view <app_token> <table_id> <view_id> --name "新名称" --filter "系列=Claude 4" --hide-fields "备注"
```

### 结构管理

> `create-app` 和 `create-table` 的 `--fields` 均支持 `-f <path>` 文件形式（两者互斥）。字段较多时推荐用文件。

**创建应用：** 不指定位置时默认存入个人知识库。`--folder`、`--wiki-node`、`--wiki-space` 三者互斥。

```bash
feishu bitable create-app "项目追踪"                                    # 默认存入个人知识库
feishu bitable create-app "项目追踪" --folder fldcnXXX                  # 指定云盘文件夹
feishu bitable create-app "项目追踪" --wiki-node wikcnXXX               # 在知识库节点下创建

# 一步到位：创建 + 自定义字段（删除默认表，用指定字段重建）
feishu bitable create-app "客户表" --wiki-node wikcnXXX \
  --fields '[{"field_name":"姓名","type":1},{"field_name":"状态","type":3,"property":{"options":[{"name":"进行中"},{"name":"已完成"}]}}]'

# 从文件读取字段定义（--fields 与 -f 互斥）
feishu bitable create-app "客户表" --folder fldcnXXX -f fields.json
```

> `create-app` 和 `create-table` 会自动清理默认空行，无需手动清理。

**建表（两种模式）：**

```bash
# 模式 A：一次性定义所有字段（明确需求时推荐，减少 API 调用）
feishu bitable create-table <app_token> --name "客户表" \
  --default-view-name "所有客户" \
  --fields '[{"field_name":"负责人","type":11,"property":{"multiple":false}},{"field_name":"状态","type":3,"property":{"options":[{"name":"进行中"},{"name":"已完成"}]}}]'

# 模式 A（文件形式）：字段较多时从文件读取（--fields 与 -f 互斥）
feishu bitable create-table <app_token> --name "客户表" -f fields.json

# 模式 B：先建表，再逐步添加字段（探索式场景，灵活调整）
feishu bitable create-table <app_token> --name "客户表"
feishu bitable create-field <app_token> <table_id> --name "状态" --type 3 \
  --property '{"options":[{"name":"进行中"},{"name":"已完成"}]}'
```

**批量创建字段：**

```bash
feishu bitable batch-create-fields <app_token> <table_id> \
  --fields '[{"field_name":"状态","type":3,"property":{"options":[{"name":"进行中"}]}},{"field_name":"负责人","type":11}]'

# 从文件读取字段定义
feishu bitable batch-create-fields <app_token> <table_id> -f fields.json
```

**创建字段（含 UI 变体）：**

```bash
# 普通字段
feishu bitable create-field <app_token> <table_id> --name "备注" --type 1

# 数字字段（type=2）：--property 的 formatter 合法值：
#   "0"=整数  "0.0"=一位小数  "0.00"=两位小数  "0,000"=千分位  "0.00%"=百分比
feishu bitable create-field <app_token> <table_id> --name "数量" --type 2 \
  --property '{"formatter":"0,000"}'

# 数字变体：进度条（需指定 --ui-type）
feishu bitable create-field <app_token> <table_id> --name "完成度" --type 2 \
  --ui-type Progress --property '{"formatter":"0"}'

# 数字变体：货币
feishu bitable create-field <app_token> <table_id> --name "预算" --type 2 \
  --ui-type Currency --property '{"currency_code":"CNY","formatter":"0,000.00"}'

# 数字变体：评分
feishu bitable create-field <app_token> <table_id> --name "满意度" --type 2 \
  --ui-type Rating --property '{"min":1,"max":5,"rating":{"symbol":"star"}}'
```

**数据表/字段/应用管理：**

```bash
feishu bitable delete-table <app_token> <table_id>
feishu bitable rename-table <app_token> <table_id> --name "Q2 OKR"
```

```bash
feishu bitable update-field <app_token> <table_id> <field_id> --name "新名称"
feishu bitable delete-field <app_token> <table_id> <field_id>
feishu bitable update-app <app_token> --name "产品需求池"
feishu bitable copy-app <app_token> --name "Q3 追踪" --folder fldcnXXX   # 只复制结构，不含数据
```

**附件上传：**

附件字段必须先上传获取 `file_token`，再写入记录。

```bash
feishu bitable upload-attachment <app_token> <table_id> --file ./report.pdf
feishu bitable upload-attachment <app_token> <table_id> --url "https://example.com/doc.pdf"
feishu bitable upload-attachment <app_token> <table_id> --file ./img.png --type image
# → { file_token, file_name, size }

# 写入附件字段
feishu bitable create-record <app_token> <table_id> --fields '{"附件":[{"file_token":"DRiFbxxx"}]}'
```

> 筛选语法、字段类型与 Property、错误码、并发限制：见 `reference/bitable-reference.md`
> 字段值写入/返回格式详解：见 `reference/bitable-record-values.md`
> 已知 API 行为与注意事项：见 `reference/api-behaviors.md`

### 所需权限

`bitable:app`

---

## 知识库（wiki）

知识库是一个组织容器，节点可以是文档、电子表格、多维表格等任意类型。用 `feishu fetch <wiki_url>` 自动识别类型并读取内容，用 `wiki` 命令管理目录结构。

### 浏览

```bash
feishu wiki spaces                                    # 列出所有知识空间
feishu wiki nodes <space_id> [--parent wikcnXXX]      # 列出子节点
feishu wiki get <token>                               # 获取节点详情（obj_token、obj_type）
```

### 创建

```bash
feishu wiki create <space_id> "标题" [--type docx] [--parent wikcnXXX]
```

`wiki create` 支持的类型：`docx`（默认）、`sheet`、`bitable`、`mindnote`、`file`、`doc`、`slides`

如果要创建**带内容**的知识库页面，改用 `feishu docx create --wiki-node`（仅限文档类型）。

### 管理

```bash
feishu wiki move <space_id> <node_token> --target-space <id> --target-parent wikcnYYY
feishu wiki rename <space_id> <node_token> "新标题"
feishu wiki copy <space_id> <node_token> [--target-space <id>] [--target-parent wikcnYYY] [--title "副本"]
```

### 所需权限

`wiki:wiki` `wiki:wiki:readonly` `wiki:node:read`

---

## 云盘（drive）

```bash
feishu drive list [--folder fldcnXXX]                # 列出文件
feishu drive info <file_token> --type docx           # 文件详情（推荐：--type 可查任意位置）
feishu drive info <file_token> --folder fldcnXXX     # 旧方式：仅限已知父目录（不传则查根目录）
feishu drive mkdir "文件夹名" --folder fldcnXXX       # 创建文件夹（必须指定 --folder）
feishu drive move <file_token> --type docx --folder fldcnDEST       # 移动到云盘文件夹
feishu drive move <file_token> --type bitable --wiki-space my_library  # 迁移到个人知识库
feishu drive move <file_token> --type docx --wiki-space 7542XXX --parent wikcnXXX  # 迁移到指定知识空间节点下
feishu drive delete <file_token> --type docx
```

`drive move` 的 `--folder` 和 `--wiki-space` 互斥。`--wiki-space` 将文件从云盘迁移到知识库（文件从云盘消失，出现在 wiki 中）。`--parent` 可选，指定 wiki 中的父节点。

### 所需权限

`drive:drive`

---

## 权限管理（perm）

```bash
feishu perm list <token> --type docx
feishu perm add <token> --type docx --member-id zhangsan@xiaomi.com --perm edit
feishu perm remove <token> --type docx --member-id zhangsan@xiaomi.com
```

`list` 资源类型：`doc` `docx` `sheet` `bitable` `file` `wiki` `mindnote` `minutes` `slides`（不支持 `folder`）
`add`/`remove` 资源类型：以上类型 + `folder`
成员类型：`email`（默认）· `openid` · `userid` · 其他（`unionid` `openchat` `opendepartmentid` `groupid` `wikispaceid`）
权限级别：`view` · `edit` · `full_access`

### 所需权限

`drive:drive`
