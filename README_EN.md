# Skill Monitor VS Code Extension

🌍 **English** | [繁體中文](README.md)

[![Version: 0.0.6](https://img.shields.io/badge/Version-0.0.6-blue.svg?style=for-the-badge)](https://github.com/FANJIYU0825/skill-monitor)
[![GitHub stars](https://img.shields.io/github/stars/FANJIYU0825/skill-monitor?style=for-the-badge&color=ffd700)](https://github.com/FANJIYU0825/skill-monitor/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/FANJIYU0825/skill-monitor?style=for-the-badge&color=red)](https://github.com/FANJIYU0825/skill-monitor/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **⚠️ Important Origin Notice**  
> Due to **Namespace issues**, the correct official repository for this project is:  
> 👉 **[https://github.com/FANJIYU0825/skill-monitor](https://github.com/FANJIYU0825/skill-monitor)**  
> 
> If you find this extension helpful for your AI agent development, **please click the link and leave a Star ⭐️!** Your support is my motivation to keep updating 🙌!

An advanced skill monitoring dashboard designed for AI Agent developers. This extension tracks active skills in real-time, providing an intuitive visual interface and security scanning features.

## ✨ Features

- **Premium UI Dashboard**: A Glassmorphism style webview interface offering a clear list of skills.
- **Dynamic Glow Status Bar**: When a skill is `ACTIVE`, the status bar glows with neon highlights.
- **Real-Time Synchronization**: Automatically watches changes in `.agents/active_skill.json` and `.agents/skills/*` without manual refreshing.
- **Efficient Interaction**:
    - **Single Click**: Instantly opens the corresponding `SKILL.md` document.
    - **Double Click**: Manually activates or deactivates the skill.
- **Apply Command**: Click "Apply" to copy the skill's slash command (e.g. `/pdf`) directly to your clipboard, allowing you to easily paste it into chat interfaces to invoke the skill.
- **📦 Import Examples**: Click `+ Import Examples` from the dashboard to easily import built-in demo skills directly into your project's `.agents/skills` directory.
- **🛡️ Smart Security Scanner (Skill Scanner)**: *(Latest Update: AI scanning deactivated)*
    - Click "Scan" to perform a structural and security check on a specific skill.
    - **Structural Validation**: Verifies YAML Frontmatter strictly.
    - **Security Analysis (Regular Expressions)**: Automatically analyzes `SKILL.md` using robust **Regular Expressions** and heuristic logic to detect Prompt Injection, data exfiltration risks, or dangerous system commands. (Note: The OpenAI API AI scan method has been removed for better stability).
    - **Intuitive Report**: Displays scan results, severity, and errors inside an overlay dashboard directly.
- **Global Monitoring Switch**: The dashboard syncs with the VS Code Status Bar, supporting a one-click toggle for monitoring states (ON / OFF).

## 🚀 Quick Start

### 1. Installation & Development
Download the latest `skill-monitor` vsix to install, or press `F5` in a source code development environment.

### 2. Workspace Setup
In the root directory of your target project, ensure you have the following structure:
```text
.agents/
├── active_skill.json  # Stores currently active skills (Auto-generated/updated)
└── skills/            # Folder holding all skill directories
    ├── pdf/
    │   └── SKILL.md
    ├── skill-creator/
    │   └── SKILL.md
    └── ...
```

### 3. Usage
- Click the **⚡️ Lightning Bolt icon** in the Activity Bar to open the dashboard.
- Observe the **$(zap) Skill** status bar (bottom right corner), which can also be clicked to toggle monitoring.
- Double-click a skill, use "Apply" to copy commands, or try "Scan" to validate security right from the dashboard.

## 🛠 Configuration
Example of the `active_skill.json` format:
```json
{
    "active_skills": ["pdf", "skill-creator"]
}
```

## 📜 License
MIT License
