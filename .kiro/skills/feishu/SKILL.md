---
name: feishu
description: |
  通过 CLI 操作飞书：文档、知识库、云盘、多维表格、电子表格、权限管理、日历日程、任务管理。当用户提到飞书文档、wiki、知识库、云盘、多维表格/base、电子表格/sheet、分享/权限、日历/日程/会议、任务/待办时激活。
version: 1.1.3
---

# 飞书 CLI

所有操作格式：`feishu <模块> <子命令>`，输出为 JSON。常用入口：`feishu fetch <url>` 读取任意资源、`feishu search` 搜索文档。

模块总览：`docx` 文档 · `wiki` 知识库 · `drive` 云盘 · `bitable` 多维表格 · `sheet` 电子表格 · `perm` 权限 · `comment` 评论 · `search` 搜索 · `user` 用户 · `board` 画板 · `calendar`/`cal` 日历日程 · `task` 任务 · `tasklist` 任务清单

## 前置准备

### 安装与版本检查

**首次使用前**检查安装状态：

```bash
feishu --version
```

- **找不到命令** → 提示用户安装：
  ```bash
  npm install -g @mi/feishu@latest --registry https://pkgs.d.xiaomi.net/artifactory/api/npm/mi-npm/
  ```
- **版本号 < 本文件 frontmatter `version`** → 必须先升级（部分命令可能不存在）：
  ```bash
  feishu update    # 一键升级 + 自动同步 skill 文件到所有 AI 工具
  ```
- **版本号 ≥ frontmatter `version`** → 版本合格，继续

> 安装/升级时 CLI 会自动将 skill 文件同步到所有检测到的 AI 工具（Claude Code、Cursor、Windsurf、MiCode、OpenCode）。
> 日常使用中 CLI 会在后台检查更新（每天一次），如有新版会在 stderr 提示。

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
| `.../sheets/ABC123` | spreadsheetToken = `ABC123` |

---

## 通用操作

### 读取任意资源（fetch）

一条命令读取任意飞书资源，自动识别 URL 类型。

```bash
feishu fetch <url_or_token>
```

支持 docx、wiki、多维表格（`/base/`）、电子表格（`/sheets/`）URL 或裸 token。如果是 wiki URL，会自动解析底层资源类型：

| URL / 资源类型 | 返回内容 |
|---------------|---------|
| docx / wiki→文档 | `type`, `title`, `token`, `markdown`, `media` |
| 多维表格 / wiki→多维表格 | `type`, `app_token`, `tables`, `hint` |
| 电子表格 / wiki→电子表格 | `type`, `title`, `token`, `sheets[]`, `preview`（首个工作表前 50 行）, `hint` |
| wiki→思维导图/文件/幻灯片 | `type`, `title`, `token`, `hint`（思维导图为只读，无法通过 CLI 创建或修改内容；如需创建思维导图，使用 Mermaid `mindmap` 代码块写入文档） |

```bash
feishu fetch <token> --type image                     # 下载媒体（返回 base64）
feishu fetch <token> --type image --output ./img.png  # 保存到文件
feishu fetch <url> --download-images                  # 批量下载文档中所有图片到 <系统临时目录>/feishu-media/
feishu fetch <url> --download-images ./assets         # 批量下载到指定目录
```

**文档中的媒体**

`feishu fetch <doc_url>` 返回的 markdown 中，图片、白板、文件以 HTML 标签形式出现：

```
<image token="Z1Fjxxx..." width="1833" height="2491"/>
<whiteboard token="Z1Fjxxx..."/>
```

返回结果里的 `media` 数组列出了所有嵌入媒体的 token。推荐用 `--download-images` 一次性下载所有图片：

```bash
# 方式 A（推荐）：一键下载所有媒体，media 数组会包含 path 字段
feishu fetch https://mi.feishu.cn/docx/ABC123 --download-images
# → { markdown: "...", media: [{token, type, path: "<tmpdir>/feishu-media/Z1Fj.png"}] }

# 方式 B：逐个下载
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

> 块操作、表格操作、批量删除/更新、图片上传、彩色文字等完整文档：见 `reference/docx-advanced.md`

常用入口速查：

```bash
feishu docx blocks <doc_token>                               # 列出所有块（获取 block_id）
feishu docx delete-block  <doc_token> <block_id>            # 删除单个块
feishu docx delete-blocks <doc_token> <parent_id> --start 2 --end 5   # 范围删除
feishu docx delete-blocks <doc_token> blockA,blockB,blockC  # ID 列表删除
feishu docx batch-update-blocks <doc_token> --records '[{"block_id":"xxx","content":"新文本"}]'
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

### 批量按 ID 读取

```bash
feishu bitable batch-get <app_token> <table_id> recA,recB,recC [--fields "Name,Status"]
```

当已知 record_id 时，比 `records` 列表或 `search` 更高效。返回：`{ records: [...] }`

### 批量表管理

```bash
feishu bitable batch-create-tables <app_token> --tables '[{"name":"T1"},{"name":"T2"}]'
feishu bitable batch-create-tables <app_token> -f tables.json
feishu bitable batch-delete-tables <app_token> tblA,tblB
```

### 仪表盘

```bash
feishu bitable dashboard list <app_token>
feishu bitable dashboard copy <app_token> <block_id> [--name "副本"]
```

### 角色权限

```bash
feishu bitable role create <app_token> --name "编辑者" [--table-perm <json>]
feishu bitable role list <app_token>
feishu bitable role update <app_token> <role_id> [--name "新名"] [--table-perm <json>]
feishu bitable role delete <app_token> <role_id>
feishu bitable role members <app_token> <role_id>
feishu bitable role add-member <app_token> <role_id> --member-id ou_xxx
feishu bitable role remove-member <app_token> <role_id> ou_xxx
```

### 表单

表单操作需要 `form_id`，可通过 `feishu bitable views` 获取表单视图 ID。

```bash
feishu bitable form get <app_token> <table_id> <form_id>
feishu bitable form update <app_token> <table_id> <form_id> [--name "问卷"] [--description "描述"] [--shared]
feishu bitable form fields <app_token> <table_id> <form_id>
feishu bitable form update-field <app_token> <table_id> <form_id> <field_id> [--visible] [--required] [--description "说明"]
```

### 自动化工作流

```bash
feishu bitable workflow list <app_token>
feishu bitable workflow update <app_token> <workflow_id> --enable   # 启用
feishu bitable workflow update <app_token> <workflow_id> --disable  # 禁用
```

### 所需权限

`bitable:app`

---

## 电子表格（sheet）

### 创建

不指定位置时默认存入个人知识库（`my_library`），与 `docx create` / `bitable create-app` 行为一致。`--folder`、`--wiki-node`、`--wiki-space` 三者互斥。

```bash
feishu sheet create "季度数据"                                      # 默认存入个人知识库
feishu sheet create "季度数据" --folder fldcnXXX                    # 指定云盘文件夹
feishu sheet create "季度数据" --wiki-node wikcnXXX                 # 在知识库节点下创建
feishu sheet create "季度数据" --wiki-space 7542032457XXX           # 指定团队知识空间
```

返回：`{ spreadsheetToken, title, url, wikiToken? }`

### 读取

```bash
feishu sheet meta   <url_or_token>           # 获取电子表格基本信息 + 工作表列表
feishu sheet sheets <url_or_token>           # 仅列出工作表（含 sheetId、行列数、是否隐藏）
feishu sheet read   <url_or_token> <range>   # 读取单元格数据
```

**range 格式**：`<工作表>!<起始>:<结尾>`，工作表可用名称或 sheetId：

```bash
feishu sheet read TOKEN "Sheet1!A1:D10"      # 按工作表名
feishu sheet read TOKEN "abc123!A1:D10"      # 按 sheetId（更快，跳过名称查询）
feishu sheet read TOKEN "Sheet1!A:C"         # 整列
feishu sheet read TOKEN "Sheet1!A1:Z50" --csv > data.csv   # 导出为 CSV 文件
feishu sheet read TOKEN "Sheet1!A1:B5" --render Formula    # 读取公式字符串
```

`--render` 选项：`FormattedValue`（默认）· `UnformattedValue`（原始值）· `Formula`（公式）

返回：`{ spreadsheetToken, range, values: [[...], ...] }`

### 写入

```bash
feishu sheet write  <url_or_token> <range> --values <json>     # 覆盖写入
feishu sheet write  <url_or_token> <range> -f data.json        # 从文件读取
feishu sheet append <url_or_token> <工作表> --values <json>    # 追加到末尾
feishu sheet append <url_or_token> <工作表> -f rows.json
```

`--values` 格式：二维 JSON 数组，每行一个子数组：

```bash
feishu sheet write TOKEN "Sheet1!A1:B3" --values '[["Name","Score"],["Alice",95],["Bob",88]]'
feishu sheet append TOKEN Sheet1 --values '[["Carol",91],["Dave",77]]'
```

`write` 返回：`{ spreadsheetToken, updatedRange, updatedRows, updatedColumns, updatedCells }`
`append` 返回：`{ spreadsheetToken, tableRange, updates: { updatedRange, updatedRows, ... } }`

### 查找 / 替换

```bash
feishu sheet find    <url_or_token> <工作表> <关键词> [--match-case] [--whole-cell]
feishu sheet replace <url_or_token> <工作表> --find <文本> --replace-with <文本> [--match-case]
```

```bash
feishu sheet find TOKEN Sheet1 "budget"
feishu sheet find TOKEN Sheet1 "Budget" --match-case
feishu sheet find TOKEN Sheet1 "100" --whole-cell        # 仅精确匹配整个单元格
feishu sheet replace TOKEN Sheet1 --find "旧值" --replace-with "新值"
```

`find` 返回：`{ matchedCount, matchedCells: [{row, col, value}] }`
`replace` 返回：`{ replacedCount }`

### 工作表管理

```bash
feishu sheet rename     <url_or_token> --title "新标题"            # 重命名电子表格
feishu sheet add-sheet  <url_or_token> [--title <名称>] [--index N] # 新增工作表
feishu sheet delete-sheet <url_or_token> <工作表>                  # 删除工作表（不可逆）
feishu sheet copy-sheet <url_or_token> <工作表> [--title <名称>]   # 复制工作表
```

### 行列操作

索引均为 **0-based**。

```bash
feishu sheet add-rows  <url_or_token> <工作表> [--count N]          # 末尾追加 N 行
feishu sheet add-cols  <url_or_token> <工作表> [--count N]          # 末尾追加 N 列
feishu sheet insert-rows <url_or_token> <工作表> --start N [--end N] [--inherit-style BEFORE|AFTER]
feishu sheet insert-cols <url_or_token> <工作表> --start N [--end N] [--inherit-style BEFORE|AFTER]
feishu sheet delete-rows <url_or_token> <工作表> --start N [--end N]  # 删除 [start,end) 范围的行
feishu sheet delete-cols <url_or_token> <工作表> --start N [--end N]
```

`--end` 默认为 `--start + 1`（即操作一行/列）。

### 单元格操作

```bash
# 清除内容（保留样式，V3 API，最多 10 个范围）
feishu sheet clear <url_or_token> <工作表> <range...>

# 合并 / 取消合并
feishu sheet merge   <url_or_token> <range> [--type MERGE_ALL|MERGE_ROWS|MERGE_COLUMNS]
feishu sheet unmerge <url_or_token> <range>

# 设置样式
feishu sheet style <url_or_token> <range> [--bold] [--italic] [--font-size <pt>] \
  [--h-align LEFT|CENTER|RIGHT] [--v-align TOP|MIDDLE|BOTTOM] \
  [--bg-color <#hex>] [--fore-color <#hex>] [--formatter <pattern>] [--clean]
```

`style` 示例：
```bash
feishu sheet style TOKEN "Sheet1!A1:C1" --bold --bg-color "#FFD700" --h-align CENTER
feishu sheet style TOKEN "Sheet1!B2:B50" --formatter "#,##0.00"   # 千分位两位小数
feishu sheet style TOKEN "Sheet1!A:Z" --clean                     # 清除所有样式
```

### 批量读写

```bash
# 一次读取多个范围
feishu sheet read-batch TOKEN "Sheet1!A1:D5" "Sheet2!A1:B3"
# 返回：{ results: [{ range, values }] }

# 一次写入多个范围（--values 或 -f）
feishu sheet write-batch TOKEN --values '[{"range":"Sheet1!A1:B2","values":[["a","b"]]},{"range":"Sheet2!A1","values":[["x"]]}]'
feishu sheet write-batch TOKEN -f batch.json
```

`batch.json` 格式：`[{ "range": "<sheetRef>!<start>:<end>", "values": [[...]] }]`

### 筛选 / 保护范围 / 浮动图片

```bash
# 筛选（--col --filter-type --expected 均为必填）
feishu sheet filter create <url_or_token> <工作表> <range> \
  --col <列字母> --filter-type <类型> --expected <值> [--compare-type <比较方式>]
feishu sheet filter get    <url_or_token> <工作表>
feishu sheet filter delete <url_or_token> <工作表>

# 示例：筛选 B 列等于 "Alice" 或 "Bob" 的行
feishu sheet filter create TOKEN Sheet1 "Sheet1!A1:D100" --col B --filter-type text --expected "Alice,Bob"
# 示例：筛选 C 列大于 90 的行
feishu sheet filter create TOKEN Sheet1 "Sheet1!A1:C100" --col C --filter-type number --expected "90" --compare-type greater

# 保护范围
feishu sheet protect   <url_or_token> <工作表> [--dimension ROWS|COLUMNS] [--start N] [--end N] [--lock-info <说明>]
feishu sheet unprotect <url_or_token> <工作表> <protect_id...>   # 返回 protectId 来自 protect 命令

# 浮动图片
feishu sheet image add    <url_or_token> <工作表> --image-token <t> --cell <cell> [--width N] [--height N]
feishu sheet image list   <url_or_token> <工作表>
feishu sheet image delete <url_or_token> <工作表> <float_image_id>
```

### Windows Git Bash 引号与转义注意事项

Windows Git Bash（MINGW64）对引号和特殊字符有独特处理，**AI Agent 调用 CLI 时必须注意以下规则**：

#### 1. `!` 符号 — history 展开

`!` 在双引号内会被 bash 当作 history 展开，导致参数被吞掉或报错。**所有包含 `!` 的 range 参数都受影响**。

```bash
# ❌ 错误：双引号内的 ! 被展开
feishu sheet read TOKEN "Sheet1!A1:D10"

# ✅ 方案 1：不加引号（range 参数不含空格时推荐）
feishu sheet read TOKEN Sheet1!A1:D10

# ✅ 方案 2：直接用 sheetId 拼接（推荐 AI Agent 使用）
feishu sheet read TOKEN 257432!A1:D10

# ✅ 方案 3（仅交互式终端）：先关闭 history 展开
set +H
feishu sheet read TOKEN "Sheet1!A1:D10"
```

> **AI Agent 最佳实践**：先通过 `feishu sheet sheets TOKEN` 获取 sheetId，然后用 `sheetId!A1:D10` 格式，不加引号。这样完全避开 `!` 转义问题。

#### 2. 引号嵌套 — JSON 参数

`--values` 等需要传 JSON 的参数，在 Git Bash 中容易因引号嵌套导致解析异常。

```bash
# ✅ 正确：外层单引号，内层双引号
feishu sheet write TOKEN 257432!A1:B2 --values '[["名称","值"],["Alice",100]]'

# ❌ 错误：外层双引号，内层转义容易出错
feishu sheet write TOKEN 257432!A1:B2 --values "[["名称","值"]]"
```

#### 3. 反斜杠 `\` — 路径与转义

Git Bash 会自动将某些参数中的 `\` 解释为转义。如果参数值恰好包含反斜杠或被 bash 误判为路径，可能被篡改。

```bash
# ✅ 用单引号包裹包含反斜杠的内容
feishu sheet find TOKEN Sheet1 'C:\path'
```

#### 影响范围

| 环境 | `!` 展开 | 引号处理 | 需要注意 |
|------|---------|---------|---------|
| Git Bash (MINGW64) | ✅ 有问题 | ✅ 有问题 | **需要上述规避** |
| PowerShell | 无影响 | 无影响 | 无需特殊处理 |
| CMD | 无影响 | 无影响 | 无需特殊处理 |
| macOS / Linux | 无影响 | 无影响 | 无需特殊处理 |

### 工作表名称 vs sheetId

所有命令的 `<工作表>` 参数均支持**名称**（如 `Sheet1`）或 **sheetId**（如 `abc123`）。CLI 自动解析，优先按 sheetId 匹配，再按名称匹配。

用 `feishu sheet sheets TOKEN` 查看所有工作表的 sheetId 和名称。

### 所需权限

`sheets:spreadsheet`

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
feishu drive copy <file_token> --type docx [--name "副本"] [--folder fldcnXXX]  # 复制文件
feishu drive delete <file_token> --type docx
```

`drive copy` 支持所有文件类型（docx, sheet, bitable 等），不支持 folder 类型。不传 `--folder` 时复制到根目录。

`drive move` 的 `--folder` 和 `--wiki-space` 互斥。`--wiki-space` 将文件从云盘迁移到知识库（文件从云盘消失，出现在 wiki 中）。`--parent` 可选，指定 wiki 中的父节点。

### 所需权限

`drive:drive`

---

## 画板（board）

直接操作飞书白板（Whiteboard）。适合向已有画板写入/读取图表和节点。

```bash
# 导入 Mermaid 图表（默认语法）
feishu board import <whiteboard_id> --file diagram.mmd
feishu board import <whiteboard_id> --content "sequenceDiagram\nA->>B: Hello"

# 导入 PlantUML
feishu board import <whiteboard_id> --file arch.puml --syntax plantuml

# 指定图表类型（更精准的渲染）
feishu board import <whiteboard_id> --file seq.mmd --diagram-type sequence
feishu board import <whiteboard_id> --file cls.mmd --diagram-type class --style classic
```

`--diagram-type` 可选值：`auto`（默认）· `sequence` · `class` · `er` · `flowchart` · `state` · `mindmap` · `component`
`--style` 可选值：`board`（默认）· `classic`

```bash
# 读取画板节点（原始 JSON）
feishu board nodes <whiteboard_id>

# 创建文本框
feishu board create-notes <whiteboard_id> --nodes '[{"type":"text_shape","x":100,"y":100,"height":60,"text":{"text":"Hello"}}]'

# 创建矩形图形
feishu board create-notes <whiteboard_id> --nodes '[{"type":"composite_shape","x":300,"y":100,"height":80,"composite_shape":{"type":"rect"}}]'

feishu board create-notes <whiteboard_id> -f nodes.json [--client-token <幂等token>]

# 下载画板为 PNG
feishu board image <whiteboard_id> ./board.png      # 保存到文件
feishu board image <whiteboard_id> ./screenshots/   # 保存到目录（自动命名）
```

> 直接下载也可用 `feishu fetch <whiteboard_token> --type whiteboard`（返回 base64）。
> 向**文档内嵌**的画板写入 Mermaid 用 `feishu docx create/update`，CLI 自动处理，无需手动操作画板。

> 可创建节点类型、只读类型、节点字段格式：见 `reference/api-behaviors.md`（Board 章节）

### 所需权限

`board:whiteboard:node:create` · `board:whiteboard:node:read` · `board:whiteboard:node:update` · `board:whiteboard:node:delete`

---

## 日历（calendar）

别名：`cal`。所有时间参数使用 **RFC3339** 格式：`2024-01-21T14:00:00+08:00`。

### 日历操作

```bash
feishu calendar list [--page-size N]                        # 列出所有日历
feishu calendar get --calendar-id <id>                      # 获取日历详情
feishu calendar primary                                     # 获取主日历
```

### 日程 CRUD

```bash
# 创建日程（--calendar-id --summary --start --end 为必填）
feishu calendar create-event \
  --calendar-id <id> --summary "周会" \
  --start "2024-01-21T14:00:00+08:00" --end "2024-01-21T15:00:00+08:00" \
  [--description "议程"] [--location "会议室 A"]

feishu calendar get-event --calendar-id <id> --event-id <eid>

feishu calendar list-events --calendar-id <id> \
  [--start-time "2024-01-01T00:00:00+08:00"] [--end-time "2024-01-31T23:59:59+08:00"] \
  [--page-size N] [--page-token TOKEN]

feishu calendar update-event --calendar-id <id> --event-id <eid> \
  [--summary "新标题"] [--description "新描述"] \
  [--start "..."] [--end "..."] [--location "新地点"]

feishu calendar delete-event --calendar-id <id> --event-id <eid>
```

### 搜索日程

```bash
feishu calendar search-events --calendar-id <id> --query "会议" \
  [--start "2024-01-01T00:00:00+08:00"] [--end "2024-12-31T23:59:59+08:00"] \
  [--page-size N] [--page-token TOKEN]
```

### 回复邀请 / 参与人 / 忙闲

```bash
# 回复邀请（status: accept | decline | tentative）
feishu calendar reply-event --calendar-id <id> --event-id <eid> --status accept

# 参与人管理
feishu calendar add-attendees --calendar-id <id> --event-id <eid> \
  [--user-ids uid1,uid2] [--chat-ids oc_xxx]          # 至少提供其中一个
feishu calendar list-attendees --calendar-id <id> --event-id <eid> [--page-size N]

# 忙闲查询
feishu calendar freebusy \
  --start "2024-01-21T00:00:00+08:00" --end "2024-01-22T00:00:00+08:00" \
  --user-id <open_id>
```

### 所需权限

`calendar:calendar`（读取 + 创建/修改/删除，含 readonly 全部能力）

---

## 任务（task / tasklist）

使用飞书 Task V2 API。任务 ID 为 UUID 格式（`d300a75f-c56a-4be9-80d6-e47653f6xxxx`）。

### 任务 CRUD

```bash
# 截止时间格式："YYYY-MM-DD" 或 "YYYY-MM-DD HH:mm:ss"
feishu task create --summary "写报告" [--description "详情"] [--due "2024-02-01"] \
  [--members uid1,uid2] [--role assignee|follower] \
  [--tasklist-guid <guid>]

feishu task get <guid>
feishu task list [--completed | --uncompleted] [--page-size N] [--page-token TOKEN]
feishu task update <guid> [--summary "新标题"] [--description "新描述"] [--due "2024-03-01"]
feishu task complete <guid>
feishu task delete <guid>
feishu task add-to-tasklist <guid> --tasklist-guid <tl_guid>   # 将任务加入指定清单
```

### 子任务 / 成员 / 提醒

```bash
# 子任务
feishu task subtask create <guid> --summary "子项"
feishu task subtask list <guid> [--page-size N]

# 成员（角色：assignee 执行者 / follower 关注者，默认 assignee）
feishu task member add    <guid> --members uid1,uid2 [--role assignee]
feishu task member remove <guid> --members uid1,uid2 [--role assignee]

# 提醒（--minutes：提前分钟数，0 = 在截止时间时提醒）
feishu task reminder add    <guid> --minutes 30
feishu task reminder remove <guid> --ids rid1,rid2
```

### 任务清单（tasklist）

任务清单是任务的分组容器，一个任务可属于多个清单。

```bash
feishu tasklist create --name "Sprint 1"
feishu tasklist get <guid>
feishu tasklist list [--page-size N] [--page-token TOKEN]
feishu tasklist delete <guid>
```

### 所需权限

`task:task:read` · `task:task:write` · `task:tasklist:read` · `task:tasklist:write`

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
