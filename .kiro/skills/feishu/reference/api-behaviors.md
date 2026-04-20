# 已知 API 行为与注意事项

飞书各模块 API 的边界行为、陷阱和正确用法。遇到奇怪的报错时先查这里。

---

## Docx

### `docx create`/`docx update`：写入失败时的部分成功响应

**现象**：`docx create -c "..."` 写入失败，但文档已经在飞书中被创建，导致用户不知道文档的 token 和 URL。

**行为**：CLI 会捕获写入错误，返回 JSON 中含 `doc_token`、`url`、`content_write_error`（错误信息）、`hint`（重试指令），退出码为 `2`。文档本身不会被删除。

```bash
# 部分成功的输出示例（退出码 2）
{
  "doc_token": "AbcXXX",
  "url": "https://mi.feishu.cn/docx/AbcXXX",
  "content_write_error": "Batch 1/1 failed: Invalid parameter (code: 99991677)",
  "hint": "Document was created but content write failed. Retry with: feishu docx update AbcXXX --mode overwrite --force -c \"...\""
}

# 重试写入内容
feishu docx update AbcXXX --mode overwrite --force -c "正确的内容"
```

### 写入警告（mermaid/whiteboard/image 失败）

mermaid 语法错误、whiteboard 创建失败、图片过大被跳过等非致命问题会以 `warnings` 数组返回，并同时打印到 stderr。退出码为 `3`（而非 0）。

```bash
# stderr 会显示（方便人工查看）
⚠ 1 warning(s) during write:
  1. Whiteboard write failed: No diagram type detected...

# stdout JSON 中也包含（方便程序解析）
{ "success": true, "warnings": ["Whiteboard write failed: ..."] }
```

退出码说明：`0`=成功 · `1`=硬失败（文档未创建）· `2`=部分成功（文档已创建，内容写入失败）· `3`=成功但有警告

---

## Wiki

### `wiki copy`：`target_space_id` 必须传

**现象**：不传 `--target-space` 时，API 返回 `131002: param err: space_id is not int`（错误信息具有误导性）。

**原因**：飞书文档标注 `target_space_id` 为 optional，但 API 实际上要求必填，即使是同空间复制也需要提供。

**正确用法**：CLI 已自动处理——不传 `--target-space` 时默认使用源 space_id。

```bash
# ✅ 同空间复制（CLI 自动填充 target_space_id）
feishu wiki copy 7610404517032528834 wikcnABC --title "副本"

# ✅ 跨空间复制
feishu wiki copy 7610404517032528834 wikcnABC --target-space 7542032457248440348
```

---

## Drive

### `drive info`：推荐用 `--type`，否则只搜当前目录

**现象**：`feishu drive info <token>` 返回 `File not found: xxx`，即使文件存在。

**原因**：不传 `--type` 时，`drive info` 通过列目录的方式查找文件（`drive.file.list`），只能找到当前指定目录（默认根目录）内的文件，子目录文件找不到。

**正确用法**：传 `--type` 后使用 `meta.batchQuery` 直接按 token 查，不依赖目录位置。

```bash
# ✅ 推荐：--type 直接查（任意位置均可找到）
feishu drive info WBtgfVsBWli1VDdaAGccCBjVnkd --type folder
feishu drive info GmDYdGO6aoifvuxRjCYci8gEn6n --type docx

# ⚠️ 旧方式：只找根目录（不传 --folder）或指定目录内的文件
feishu drive info T81ed8mnLoVV43xFBSCcHS7onph               # 只找根目录
feishu drive info WBtgfVsBWli1VDdaAGccCBjVnkd --folder UZ3of0YW0l5eGPdElj1ciUwlnyb
```

**提供错误类型时的错误信息**：

```bash
feishu drive info T81ed8mnLoVV43xFBSCcHS7onph --type bitable
# → { "error": "File not found: T81ed8mnLoVV43xFBSCcHS7onph (API failure code: 970005)" }
# 970005 = 类型不匹配，换正确的 --type 即可
```

---

## Perm

### `perm list`：不支持 `folder` 类型

**现象**：`feishu perm list <token> --type folder` 返回 400。

**原因**：飞书 `permissionMember.list` API 不支持 `folder` 资源类型，但 `add`/`remove` 支持。

```bash
# ❌ 报错
feishu perm list fldcnXXX --type folder

# ✅ 可以管理 folder 的权限，只是不能 list
feishu perm add    fldcnXXX --type folder --member-type email --member-id user@mi.com --perm view
feishu perm remove fldcnXXX --type folder --member-type email --member-id user@mi.com
```

### `perm add/remove`：`email` 类型服务端自动解析为 `openid`

传入 email，飞书服务端自动查找对应用户并转换为 openid。`perm list` 返回的是解析后的 openid，不是原始 email。

```bash
# 添加时传 email
feishu perm add T81ed8mnLoVV43xFBSCcHS7onph --type docx \
  --member-type email --member-id zhangsan@mi.com --perm edit

# list 返回的是 openid
# { "member_type": "openid", "member_id": "ou_c5857446467f037f97fe03eb22c01d15", "perm": "edit" }

# 删除时也可以继续用 email（不需要查 openid）
feishu perm remove T81ed8mnLoVV43xFBSCcHS7onph --type docx \
  --member-type email --member-id zhangsan@mi.com
```

### `perm add`：不能修改 owner 自身权限

**现象**：对自己（文件 owner）执行 `perm add` 返回 `1063003: Invalid operation`。

**原因**：飞书不允许通过 API 修改 owner 的权限级别。

---

## Bitable

### `isEmpty`/`isNotEmpty`：必须传空数组

```bash
# ❌ 错误：省略 value 导致 400
--filter-json '{"conditions":[{"field_name":"描述","operator":"isEmpty"}]}'

# ✅ 正确：必须传 value: []
--filter-json '{"conditions":[{"field_name":"描述","operator":"isEmpty","value":[]}]}'
```

### `is` 操作符：单选字段不支持多值匹配

```bash
# ❌ 对单选字段无效（返回 InvalidFilter）
--filter "状态=进行中,待处理"

# ✅ 多个 --filter 用 AND 组合
--filter "状态=进行中" --filter "优先级=P0"

# ✅ OR 用 --filter-json
--filter-json '{"conjunction":"or","conditions":[{"field_name":"状态","operator":"is","value":["进行中"]},{"field_name":"状态","operator":"is","value":["待处理"]}]}'
```

### `copy-app`：副本有新的 table_id

`copy-app` 复制后的多维表格会生成新的 `table_id`，与原表不同。操作副本前需重新执行 `bitable meta` 获取新 table_id。

```bash
feishu bitable copy-app BascXXX --name "副本" --folder fldcnXXX
# → 返回 app_token 是新的（副本的），但不含 table_id

feishu bitable meta <新的 app_token>
# → 从这里获取副本的 table_id
```

### 日期字段：必须用毫秒时间戳

```bash
# ❌ ISO 字符串 → 1254064
--fields '{"截止日期": "2024-12-31"}'

# ❌ 秒级时间戳 → 1254064
--fields '{"截止日期": 1735603200}'

# ✅ 毫秒时间戳
--fields '{"截止日期": 1735603200000}'

# JavaScript 转换：new Date("2024-12-31").getTime() → 1735603200000
# Python 转换：int(datetime(2024,12,31).timestamp() * 1000)
```
