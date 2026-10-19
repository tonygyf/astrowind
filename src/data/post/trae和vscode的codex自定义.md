---
publishDate: 2026-10-19
title: 'Trae CN：把 Codex 放到右侧 AI 栏'
excerpt: '在 Trae CN 中把 OpenAI Codex 扩展注册到右侧辅助 AI 栏，并通过一个本地扩展在兼容更新后自动恢复布局；附手动补丁、回滚与维护说明。'
image: '~/assets/images/trae.png'
category: '开发工具'
tags:
  - 'Trae'
  - 'Codex'
  - 'VSCode'
  - 'AI 编程'
metadata:
  canonical: 'https://gyf123.dpdns.org/trae-codex-right-sidebar'
---

# Trae CN：把 Codex 放到右侧 AI 栏

此补丁让 Trae 右侧出现独立的 **TRAE / Codex** 标签。左侧仍显示文件树，Codex 使用原插件的真实 Webview、登录状态和聊天历史。

## 原因与改动

当前 Trae CN `1.107.1`，commit `871bca3bb55e7a37af74c1eef2a9696f29aa7b26`：

1. 扩展清单的 schema 接受 `viewsContainers.secondarySidebar`，实际容器注册逻辑却没有处理它。Codex 的 `codexSecondaryViewContainer` 没有注册，`chatgpt.sidebarSecondaryView` 因而落入默认资源管理器。
2. Trae 的辅助侧栏只保留 `type: "ai"` 的容器；其他容器会被自动退回原位置。

补丁只为 `openai.chatgpt` 处理 `secondarySidebar`，在辅助侧栏注册其容器，并将该容器标记为 `ai`。两个修改点分别应用到普通界面和 Solo Lite 的 workbench bundle。Solo Lite Slim 没有这段扩展容器实现，保持原样。

补丁没有修改 Codex 扩展、模型、权限、网络、项目文件或会话内容。`product.json` 中对应的资源校验值同步更新，其他校验项保持原值。首次应用后需要完整退出 Trae 并重新打开；仅重载窗口时，旧主进程缓存的校验值可能出现“安装似乎损坏”提示。

## 检查、应用与回滚

在此目录运行：

```powershell
python .\patch.py check
python .\patch.py apply
python .\patch.py restore
```

`apply` 重复运行不会重复打补丁。它会先检查两个完整代码锚点、函数签名、原资源校验值，并用 `node --check` 验证修改后的 JavaScript，然后才写入；失败时会停止或恢复已写入的文件。脚本要求本机 Python 和 Node.js。

`latest-backup.txt` 记录备份目录，其中包含原始两个 bundle、原 `product.json`、哈希清单，以及应用前全局/当前工作区布局数据库的只读快照。回滚仅恢复补丁文件，不会覆盖聊天记录和日常布局数据。当前安装文件若已被升级或另行修改，回滚会停止，避免覆盖新版本。

## 更新后的维护

现已安装用户级 **Trae Codex 布局保持** 扩展，开关 `traeCodexLayout.keepAfterUpdate` 已启用。它会在启动时检查兼容性，并为兼容更新自动恢复补丁，不修改 Trae 的自动更新设置。日常无需运行这里的旧版手动脚本；详情见相邻 `trae-codex-layout-keeper/README.md`。新版本结构不兼容时会提示并停止写入，首次自动修复后可能需要完整重启一次。

Codex 插件升级通常不影响这个补丁，因为它改在 Trae 的容器兼容层。Trae 自身升级可能覆盖补丁；届时先运行 `check`，再尝试 `apply`。只有代码锚点和原始校验值均匹配时脚本才会应用，否则需要重新检查新版本，不能保证未来版本无需调整。

已验证：两个修改后的 JavaScript bundle 均通过语法检查；所有已登记安装资源的 SHA-256 校验匹配；补丁重复应用不重复修改文件；完整退出主进程、重启、重新打开原项目后 Codex 标签仍在右侧；TRAE 与 Codex 标签均能打开；原来的 OCR 会话可在右侧恢复。未发送测试消息，也未运行新的编码任务。

这是本机兼容补丁，当前版本的上述行为已验证，不代表 Trae 官方支持，也不能保证未来版本无需调整。


# Trae Codex 布局保持

这是安装在当前用户扩展目录中的本地扩展，用于在兼容的 Trae 更新后恢复 Codex 右侧 AI 栏。它不会关闭、拦截或修改 Trae 的更新功能，也不修改 Codex 扩展。

## 开关

打开 Trae 设置，搜索 **Trae Codex 布局保持**，勾选 **Keep After Update**。也可在用户 settings.json 中设置：

```json
"traeCodexLayout.keepAfterUpdate": true
```

该开关是应用级设置，工作区不能覆盖它。关闭后停止未来的自动修复；当前已生效的布局补丁不会立即撤销。

## 更新时的行为

1. Trae 照常下载、安装和启动新版本。
2. 用户扩展仍在。启动后，它检查右侧栏容器实现和安装资源校验值。
3. 若新版仍兼容，会备份新版原文件、恢复仅针对 Codex 的容器兼容逻辑，并提示完整重启。
4. 点击“完整重启 Trae”后，它使用 Trae 自身退出命令，等主进程退出再重新打开当前项目。退出被取消时不会另外打开实例。
5. 新版已有不同的右侧栏实现、结构无法识别或文件正在变化时，会保留新版文件并提示；不会强行打旧补丁或阻止升级。

**边界：不能保证所有未知版本永远保持布局，也不能保证更新后零次额外重启。** 它在新版本已经启动后检查，因此首次修复可能需要再完整重启一次。没有常驻外部服务、计划任务或后台升级拦截器。

## 命令

在命令面板搜索 **Trae Codex**：

- 检查布局保持状态
- 查看布局保持日志
- 打开自动修复备份目录
- 关闭保持并还原最近一次自动修复

自动修复的备份在 Trae 用户 globalStorage 中，随用户扩展数据保留。还原操作仅接受与当前安装文件完全匹配的备份，避免将新版本覆盖为旧版。此次初始手动补丁的原始备份仍在相邻 `trae-codex-right-sidebar` 目录中；它不是扩展的自动修复备份。

## 验证范围

使用初始补丁前的真实 Trae 文件，在临时目录模拟更新后的原始安装，验证了修复、重复执行不写入、SHA-256 校验、完整 JavaScript 语法、字节级还原、校验异常拒绝、未知结构拒绝、原生新实现不覆盖、变量改名兼容、开关关闭不写入和跨窗口锁清理。

真实的后续 Trae 更新尚未发生。扩展已在当前 Trae 中实际激活，运行状态为 `protected`，并确认两个 workbench 的补丁和资源校验均通过；用户配置与安装前相比仅增加布局保持开关，更新设置未改变。安装包为 `trae-codex-layout-keeper-1.0.0.vsix`，源代码位于 `extension/`。
