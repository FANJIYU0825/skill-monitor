# Skill Monitor — VS Code Extension

🌍 **English** | [繁體中文](README_ZH.md)

[![Version](https://img.shields.io/badge/Version-0.1.4-blue.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=FANJIYU0825.skill-monitor)
[![GitHub stars](https://img.shields.io/github/stars/FANJIYU0825/skill-monitor?style=for-the-badge&color=ffd700)](https://github.com/FANJIYU0825/skill-monitor/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/FANJIYU0825/skill-monitor?style=for-the-badge&color=red)](https://github.com/FANJIYU0825/skill-monitor/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> If this extension helps your AI agent development, please ⭐️ the repo — it keeps the project going!
> 👉 **[https://github.com/FANJIYU0825/skill-monitor](https://github.com/FANJIYU0825/skill-monitor)**

An advanced skill monitoring dashboard for AI Agent developers. Track active skills in real-time with a glassmorphism UI, one-click command injection, and a dual-engine security scanner.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Premium UI Dashboard** | Glassmorphism-style WebView panel with a clean skill list |
| **Dynamic Glow Status Bar** | Status bar glows with neon highlights when a skill is `ACTIVE` |
| **Real-Time Sync** | Watches `.agents/active_skill.json` and `.agents/skills/*` — no manual refresh needed |
| **Single Click** | Opens the corresponding `SKILL.md` document instantly |
| **Double Click** | Manually activates or deactivates a skill |
| **Apply Command** | Copies the skill's slash command (e.g. `/pdf`) to clipboard — paste directly into any chat interface |
| **Import Examples** | One-click import of built-in demo skills into `.agents/skills/` |
| **Smart Security Scanner** | Dual-engine scan (RegExp heuristics + Gemini AI) against the Cisco AITech Threat Taxonomy |
| **Global Monitor Toggle** | Dashboard syncs with the VS Code Status Bar for one-click ON/OFF |

---

## 🛡️ Security Scanner (Skill Scanner)

Powered by [Cisco AI Defense Skill-Scanner](https://github.com/cisco-ai-defense/skill-scanner/) rules + Google Gemini, the scanner runs two parallel analysis engines:

**1. Re Rep (RegExp Engine)** — Local, zero-latency heuristic analysis covering:
- `AITech-1.1` — Direct Prompt Injection
- `AITech-1.2` — Indirect Prompt Injection / Transitive Trust Abuse
- `AITech-4.3` — Skill Discovery Abuse
- `AITech-8.2` — Data Exfiltration & Hardcoded Secrets
- `AITech-9.1` — Command Injection / Code Execution
- `AITech-9.2` — Obfuscation Patterns
- `AITech-12.1` — Unauthorized Tool Use

**2. LLM Rep (AI Engine)** — A multi-agent pipeline built on `gemini-2.5-flash` that runs deep semantic analysis beyond what RegExp can catch.

The pipeline has two stages:

**Stage 1 — Parallel Analysis (4 specialized agents run concurrently):**

| Agent | Threat Focus | AITech Rules |
|---|---|---|
| `PromptInjectionResearcher` | Instruction override, system prompt tampering, indirect injection via external content | 1.1, 1.2 |
| `DataExfiltrationResearcher` | Unauthorized network calls (`curl`, `wget`), hardcoded secrets | 8.2 |
| `CommandInjectionResearcher` | Destructive shell commands, code execution (`eval`, `os.system`), Base64 obfuscation | 9.1, 9.2 |
| `ToolAbuseResearcher` | Capability inflation ("can do everything"), unauthorized tool invocation | 4.3, 12.1 |

Each agent independently returns `[SAFE]` or `[VULNERABLE: <Severity>]` (LOW / MEDIUM / HIGH / CRITICAL).

**Stage 2 — Synthesis Agent:**
A dedicated `SynthesisAgent` reads all 4 parallel findings and produces a unified report. It escalates to the highest severity found and never adds knowledge beyond what the agents reported — reducing hallucinations.

The final dashboard overlay shows:
- Overall severity tag: `[CRITICAL]` / `[HIGH]` / `[MEDIUM]` / `[LOW]` / `[SAFE]`
- A synthesized summary of all findings
- Per-agent breakdown for full observability

Results (severity, findings, errors) appear in an overlay panel inside the dashboard.

---

## 🚀 Quick Start

### 1. Installation

**From Marketplace:**
Search `Skill Monitor` in the VS Code Extensions panel, or install via:
```
ext install FANJIYU0825.skill-monitor
```

**From source (development):**
Clone the repo and press `F5` to launch the Extension Development Host.

### 2. Workspace Structure

Create the following in your project root:
```text
.agents/
├── active_skill.json   # Active skills (auto-generated/updated)
└── skills/
    ├── pdf/
    │   └── SKILL.md
    ├── skill-creator/
    │   └── SKILL.md
    └── ...
```

`active_skill.json` format:
```json
{
    "active_skills": ["pdf", "skill-creator"]
}
```

### 3. Using the Dashboard

1. Click the **⚡️ Lightning Bolt** icon in the Activity Bar.
2. The **`$(zap) Skill`** item in the status bar (bottom-right) also toggles monitoring on/off.
3. From the dashboard: double-click to activate/deactivate, click **Apply** to copy slash commands, or click **Scan** to run a security check.

---

## 🧠 Enable AI Scanning (Google Gemini)

1. Get a [Google Gemini API Key](https://aistudio.google.com/app/apikey).
2. Open the Command Palette (`Cmd/Ctrl + Shift + P`).
3. Run: **`Test Google Generative AI`**
4. Paste your API key into the prompt.

> **Security**: The key is stored in your local VS Code Global Settings (`skill-monitor.googleApiKey`) with `ignoreSync: true`. It is never committed to Git or synced to the cloud.

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## 📜 License

[MIT](LICENSE)
