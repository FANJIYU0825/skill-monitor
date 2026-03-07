# Sample AI Agent Skills

歡迎來到 **Skill Monitor** 的內建技能範本區 (Sample Skills)！

這個目錄底下的所有資料夾，都是提供給 AI Agent 開發者的**展示用技能 (Demo Skills)**。

## 為什麼需要這些範本？
AI Agent (如 Cursor, Claude 桌面版, 或自建的 AI Assistant) 在執行任務時，往往需要明確的角色設定、步驟指引與輸出規範（也就是所謂的 "Skill"）。
這理整理了許多常見場景的高品質 Agent Prompt 範本，您可以直接透過 Skill Monitor 面板將它們**一鍵匯入 (Import)** 到您的專案工作區（`.agents/skills/` 目錄）中，省去從零開始撰寫的麻煩。

## 資料夾結構
每一個技能資料夾都遵循標準的 Skill Monitor 結構，核心檔案為 `SKILL.md`，其中包含：
1. **YAML Frontmatter**：包含 `name` (技能名稱) 與 `description` (技能描述縮影)。
2. **Markdown Body**：包含 AI 需要遵守的具體指令、系統提示詞、輸出格式要求等。

範例結構：
```text
sample-skills/
  ├── pdf/
  │   └── SKILL.md      # 用於處理 PDF 文件的 Prompt 範本
  ├── skill-creator/
  │   └── SKILL.md      # 指導 AI 如何撰寫新 Skill 的元技能
  └── pptx/
      └── SKILL.md      # 用於分析或產出簡報結構的範本
```

## 如何使用？
1. 在 VS Code 側邊活動欄點擊 ⚡ **Skill Monitor 儀表板**。
2. 切換到 **「Example Skills」** 頁籤。
3. 您可以點擊任一範本來 **預覽 (Preview)** 該 `SKILL.md` 的內容。
4. 點擊 **"Import"** 按鈕，擴充功能就會自動把該技能完整複製到您當前專案的 `.agents/skills/` 目錄中，讓您的 AI Agent 馬上學會這項新技能！

---
> **💡 提示**：匯入後，您隨時可以打開您專案裡的 `SKILL.md` 進行二次修改，量身打造最適合您團隊工作流的 AI 技能！
