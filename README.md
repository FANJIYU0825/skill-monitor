# Skill Monitor VS Code Extension

一個為 AI Agent 開發者設計的進階技能監控面板。本擴充功能可以即時追蹤當前啟用的技能（Skills），並提供直觀的視覺反饋。

## ✨ 特色功能

- **Premium UI 儀表板**：基於 WebView 的磨砂玻璃質感 (Glassmorphism) 設計。
- **動態發光狀態條**：當技能處於 `Active` 狀態時，狀態條會發出霓虹光輝。
- **即時同步**：自動監聽 `.agents/active_skill.json` 檔案變更，無需手動整理。
- **高效點擊互動**：
    - **單擊**：立即開啟對應技能的 `SKILL.md` 文件。
    - **雙擊**：手動啟動 (Activate) 或關閉 (Deactivate) 該技能。
- **Apply to Chat (進階功能)**：點擊 "Apply to Chat" 按鈕，自動複製該技能的 Slash Command（例如 `/pdf`）到剪貼簿，方便您直接貼到聊天工作區調用技能。
- **全局監控開關**：儀表板與狀態欄（Status Bar）同步一鍵切換監控狀態。

## 🚀 快速開始

### 1. 安裝與開發
下載skill-monitor-0.0.2.vsix，然後在VS Code中安裝

### 2. 設定工作區
在您的目標專案根目錄下，確保有以下結構：
```text
.agents/
├── active_skill.json  # 儲存當前啟用的技能
└── skills/            # 存放所有技能資料夾
    ├── pdf/
    ├── skill-creator/
    └── ...
```

### 3. 使用操作
- 點擊活動欄 (Activity Bar) 中的 **⚡️ 閃電圖示** 開啟儀表板。
- 查看狀態欄（右下角）的 **$(zap) Skill** 資訊。

## 🛠 配置說明
`active_skill.json` 格式範例：
```json
{
    "active_skills": ["pdf", "skill-creator"]
}
```
## 打包
就會產生skill-monitor-0.0.2.vsix
```js
npm install -g @vscode/vsce
vsce package
```
上傳
```js
ovsx publish -p <您的_ACCESS_TOKEN>

```

## 📜 授權
MIT License
