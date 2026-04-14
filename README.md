# SillyTavern-XToys

SillyTavern 的 XToys 玩具联动扩展。

AI 每次回复后，根据回复内容自动控制振动强度。

## 安装方法

在 SillyTavern 扩展面板中点击「通过 Git URL 安装」，填入本仓库地址即可。

## 使用方法

1. 在 [xtoys.app](https://xtoys.app) 加载脚本获取 Webhook ID
2. 在 SillyTavern 扩展设置中填入 Webhook ID
3. 勾选「启用XToys联动」
4. 点击「测试振动」确认连接正常
5. 开始对话，AI回复时会自动触发振动

## 强度模式

- **自动分析**：根据 AI 回复的情感关键词动态调整强度
- **固定强度**：每次触发统一强度

## 注意

每次触发后 5 秒自动停止振动。
