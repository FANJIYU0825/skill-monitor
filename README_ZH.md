# Skill Monitor — VS Code 擴充功能

🌍 [English](README.md) | **繁體中文**

[![Version](https://img.shields.io/badge/Version-0.1.4-blue.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=FANJIYU0825.skill-monitor)
[![GitHub stars](https://img.shields.io/github/stars/FANJIYU0825/skill-monitor?style=for-the-badge&color=ffd700)](https://github.com/FANJIYU0825/skill-monitor/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/FANJIYU0825/skill-monitor?style=for-the-badge&color=red)](https://github.com/FANJIYU0825/skill-monitor/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> 如果這款擴充功能對您的 AI 代理開發有幫助，歡迎給個 ⭐️ — 您的支持是我持續更新的動力！
> 👉 **[https://github.com/FANJIYU0825/skill-monitor](https://github.com/FANJIYU0825/skill-monitor)**

一個為 AI Agent 開發者設計的進階技能監控面板。提供即時技能追蹤、磨砂玻璃質感 UI、一鍵指令注入，以及雙引擎安全掃描。

---

## ✨ 功能特色

| 功能 | 說明 |
|---|---|
| **Premium UI 儀表板** | 磨砂玻璃 (Glassmorphism) 風格 WebView 面板，技能列表清晰呈現 |
| **動態發光狀態欄** | 技能處於 `ACTIVE` 狀態時，狀態欄發出霓虹光輝 |
| **即時同步監聽** | 自動監聽 `.agents/active_skill.json` 與 `.agents/skills/*`，無需手動重整 |
| **單擊** | 立即開啟對應技能的 `SKILL.md` 文件 |
| **雙擊** | 手動啟動或關閉技能 |
| **Apply 指令** | 自動複製技能的 Slash Command（如 `/pdf`）到剪貼簿，可直接貼到任何聊天介面使用 |
| **Import Examples** | 一鍵將內建範例技能匯入 `.agents/skills/` 目錄 |
| **智能安全掃描** | 雙引擎掃描（RegExp 啟發式 + Gemini AI），對應 Cisco AITech 威脅分類框架 |
| **全局監控開關** | 儀表板與 VS Code 狀態欄同步，一鍵切換 ON/OFF |

---

## 🛡️ 安全掃描器 (Skill Scanner)

整合 [Cisco AI Defense Skill-Scanner](https://github.com/cisco-ai-defense/skill-scanner/) 規則與 Google Gemini，掃描器執行兩個並行分析引擎：

**1. Re Rep（正則表示法引擎）** — 本地、零延遲的啟發式分析，涵蓋：
- `AITech-1.1` — 直接 Prompt 注入
- `AITech-1.2` — 間接 Prompt 注入 / 傳遞信任濫用
- `AITech-4.3` — 技能探索濫用
- `AITech-8.2` — 資料外洩與硬編碼密鑰
- `AITech-9.1` — 指令注入 / 程式碼執行
- `AITech-9.2` — 混淆模式
- `AITech-12.1` — 未授權工具使用

**2. LLM Rep（AI 引擎）** — 基於 `gemini-2.5-flash` 的多代理人 Pipeline，執行超越 RegExp 能力範疇的深度語意分析。

Pipeline 分為兩個階段：

**第一階段 — 平行分析（4 個專責 Agent 同時執行）：**

| Agent | 威脅焦點 | AITech 規則 |
|---|---|---|
| `PromptInjectionResearcher` | 指令覆寫、系統提示詞竄改、透過外部內容的間接注入 | 1.1, 1.2 |
| `DataExfiltrationResearcher` | 未授權網路傳輸（`curl`、`wget`）、硬編碼密鑰 | 8.2 |
| `CommandInjectionResearcher` | 破壞性 Shell 指令、程式碼執行原語（`eval`、`os.system`）、Base64 混淆 | 9.1, 9.2 |
| `ToolAbuseResearcher` | 能力膨脹（聲稱「可以做任何事」）、未授權工具調用 | 4.3, 12.1 |

每個 Agent 獨立回傳 `[SAFE]` 或 `[VULNERABLE: <Severity>]`（LOW / MEDIUM / HIGH / CRITICAL）。

**第二階段 — 合成 Agent：**
專屬的 `SynthesisAgent` 讀取 4 個並行結果，產出統一報告。它以最高嚴重等級為準，且僅根據 Agent 的輸入進行分析，不添加額外推斷——有效降低 LLM 幻覺。

儀表板覆蓋層最終顯示：
- 整體嚴重等級標籤：`[CRITICAL]` / `[HIGH]` / `[MEDIUM]` / `[LOW]` / `[SAFE]`
- 所有發現的合成摘要
- 每個 Agent 的獨立細項，提供完整可觀測性

---

## 🚀 快速開始

### 1. 安裝方式

**從 Marketplace 安裝：**
在 VS Code 擴充功能面板搜尋 `Skill Monitor`，或執行：
```
ext install FANJIYU0825.skill-monitor
```

**從原始碼（開發模式）：**
Clone 此 repo 後按 `F5` 啟動 Extension Development Host。

### 2. 工作區結構

在您的目標專案根目錄建立以下結構：
```text
.agents/
├── active_skill.json   # 當前啟用的技能（自動生成/更新）
└── skills/
    ├── pdf/
    │   └── SKILL.md
    ├── skill-creator/
    │   └── SKILL.md
    └── ...
```

`active_skill.json` 格式範例：
```json
{
    "active_skills": ["pdf", "skill-creator"]
}
```

### 3. 使用儀表板

1. 點擊活動欄（Activity Bar）中的 **⚡️ 閃電圖示** 開啟儀表板。
2. 狀態欄右下角的 **`$(zap) Skill`** 也可點擊切換監控開關。
3. 在儀表板中：雙擊可啟動/停用技能，點擊 **Apply** 複製 Slash Command，點擊 **Scan** 執行安全掃描。

---

## 🧠 啟用 AI 掃描（Google Gemini）

1. 取得 [Google Gemini API Key](https://aistudio.google.com/app/apikey)。
2. 在 VS Code 開啟命令面板（`Cmd/Ctrl + Shift + P`）。
3. 執行：**`Test Google Generative AI`**
4. 在提示框中貼上您的 API Key。

> **安全性說明**：金鑰儲存在本地 VS Code 全域設定（`skill-monitor.googleApiKey`），並設有 `ignoreSync: true`。金鑰永遠不會被 Git 追蹤或同步至雲端。

---

## 📋 更新紀錄

完整版本歷史請見 [CHANGELOG.md](CHANGELOG.md)。

---

## 📜 授權

[MIT](LICENSE)
