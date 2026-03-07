# Skill Monitor VS Code Extension

🌍 [English](README_EN.md) | **繁體中文**

[![Version: 0.0.6](https://img.shields.io/badge/Version-0.0.6-blue.svg?style=for-the-badge)](https://github.com/FANJIYU0825/skill-monitor)
[![GitHub stars](https://img.shields.io/github/stars/FANJIYU0825/skill-monitor?style=for-the-badge&color=ffd700)](https://github.com/FANJIYU0825/skill-monitor/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/FANJIYU0825/skill-monitor?style=for-the-badge&color=red)](https://github.com/FANJIYU0825/skill-monitor/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **⚠️ 重要專案網址聲明**  
> 由於 **Namespace (命名空間) 問題**，本專案的正確官方 Repository 位置為：  
> 👉 **[https://github.com/FANJIYU0825/skill-monitor](https://github.com/FANJIYU0825/skill-monitor)**  
> 
> 如果您覺得這款套件對您的 AI 代理開發有幫助，**拜託點此網址去給我一顆星星 ⭐️！** 您的支持是我持續更新的動力 🙌！

一個為 AI Agent 開發者設計的進階技能監控面板。本擴充功能可以即時追蹤當前啟用的技能（Skills），並提供直觀的視覺反饋與安全掃描功能。

## ✨ 特色功能

- **Premium UI 儀表板**：基於 WebView 的磨砂玻璃質感 (Glassmorphism) 設計，提供清晰的技能列表。
- **動態發光狀態條**：當技能處於 `ACTIVE` 狀態時，狀態條會發出霓虹光輝。
- **即時同步監聽**：自動監聽 `.agents/active_skill.json` 以及 `.agents/skills/*` 檔案變更，無需手動重整。
- **高效點擊互動**：
    - **單擊**：立即開啟對應技能的 `SKILL.md` 文件。
    - **雙擊**：手動啟動 (Activate) 或關閉 (Deactivate) 該技能。
- **Apply (進階功能)**：點擊 "Apply" 按鈕，自動複製該技能的 Slash Command（例如 `/pdf`）到剪貼簿，方便您直接貼到聊天工作區調用技能。
- **📦 引入範例技能 (Import Examples)**：在儀表板點擊 `+ Import Examples`，即可一鍵將擴充功能內建的展示用 (Demo) 技能範本直接匯入到您目前專案的 `.agents/skills` 目錄中，無需手動建立資料夾與文件。
- **🛡️ 智能安全掃描 (Skill Scanner)**：*(最新更新：關閉 AI 掃描)*
    - 點擊 "Scan" 可對特定技能進行結構與安全檢查。
    - **結構驗證**：檢查 YAML Frontmatter 格式以及 Markdown 核心段落是否完整。
    - **安全分析 (正則表達式)**：自動分析 `SKILL.md` 內容，使用**正則表達式 (Regular Expressions)** 與啟發式規則偵測是否有 Prompt Injection、惡意外洩風險或系統破壞指令，並給予危險等級提示。（註：為求穩定性，目前已關閉並移除依賴 OpenAI API 的掃描方式。）
    - **直觀的分析報告**：在儀表板覆蓋層 (Overlay) 即時顯示掃描結果、嚴重等級與潛在錯誤。
- **全局監控開關**：儀表板與狀態欄（Status Bar）同步，支援一鍵切換監控狀態 (Monitor ON / OFF)。

## 🚀 快速開始

### 1. 安裝與開發
下載並安裝 `skill-monitor` vsix，或在原始碼開發環境下按 `F5` 執行以進行測試。

### 2. 設定工作區
在您的目標專案根目錄下，確保有以下結構：
```text
.agents/
├── active_skill.json  # 儲存當前啟用的技能 (自動生成/更新)
└── skills/            # 存放所有技能資料夾
    ├── pdf/
    │   └── SKILL.md
    ├── skill-creator/
    │   └── SKILL.md
    └── ...
```

### 3. 使用操作
- 點擊活動欄 (Activity Bar) 中的 **⚡️ 閃電圖示** 開啟儀表板。
- 查看狀態欄（右下角）的 **$(zap) Skill** 資訊，點擊狀態列亦可開關監控。
- 在儀表板內對技能清單進行「雙擊啟用」、「Apply 複製指令」或「Scan 安全掃描」。

## 🛠 配置說明
`active_skill.json` 格式範例：
```json
{
    "active_skills": ["pdf", "skill-creator"]
}
```

## 📜 授權
MIT License
