---
publishDate: 2026-03-31
title: 'Android Studio 无线调试配对失败？adb 命令无法识别解决方法'
excerpt: '在 Android Studio 中使用「Pair Devices Using Wi-Fi」时，经常遇到扫描二维码或输入配对码无法成功的问题。本文总结常见原因及最可靠的解决办法。'
image: '~/assets/images/adb.png'
category: 'Android'
tags:
  - 'Android Studio'
  - 'adb'
  - '无线调试'
metadata:
  canonical: 'https://gyf123.dpdns.org/android-studio-wireless-debugging-guide'
---

在 Android Studio 中使用「Pair Devices Using Wi-Fi」时，经常遇到扫描二维码或输入配对码无法成功的问题。本文总结常见原因及最可靠的解决办法。

## 常见问题现象

- 扫描二维码一直卡住或无反应
- 输入配对码后无法配对
- PowerShell / 命令提示符中输入 `adb pair` 提示：
  > adb : 无法将“adb”项识别为 cmdlet、函数、脚本文件或可运行程序的名称。

## 问题核心原因

1. 电脑和手机不在同一个 Wi-Fi 网络（或 2.4GHz 与 5GHz 分离）
2. Android Studio 图形界面配对不稳定
3. `adb` 命令未添加到系统环境变量 PATH，导致命令无法识别
4. 配对命令缺少端口号

## 最推荐的解决方法（命令行配对）

Android Studio 自带的图形界面配对经常失败，建议使用命令行方式，成功率更高。

### 步骤 1：准备工作
- 手机和电脑连接**同一个 Wi-Fi**
- 手机开启 **开发者选项 → 无线调试**
- 在手机「无线调试」界面点击 **使用配对码配对设备**，记录显示的：
  - IP 地址 + 端口（如 `192.168.31.1:42657`）
  - 6 位配对码

### 步骤 2：解决 adb 命令无法识别问题

#### 方法 A：临时进入 adb 目录（快速测试）
```powershell
# 替换为你的实际 SDK 路径
cd C:\Users\你的用户名\AppData\Local\Android\Sdk\platform-tools

# 执行配对（必须带端口）
.\adb pair 192.168.31.1:42657
```
