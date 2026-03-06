# Changelog

All notable changes to the "skill-monitor" extension will be documented in this file.

## [v0.0.4] - 2026-03-07
### Added
- 新增 Skill Scanner 功能，自動檢查 Skill 安全性與結構。
- 新增 `scanner.js` 模組負責執行掃描。

### Fixed
- 修復了 Git 儲存庫被重複 Clone 導致的雙層目錄問題。
- 優化了 `.gitignore` 與 `.vscodeignore`，過濾掉打包時不必要的 `*.vsix` 檔案以減小體積。
- 修正 `applyToChat` 的行為，現在只會複製指令。

## [v0.0.3] - 2026-03-06
### Added
- 將內部的「使用範例 (sample-skills)」與「已啟用的技能 (Active Skills)」分頁顯示。
- 新增「導入範例」的按鈕與功能。
