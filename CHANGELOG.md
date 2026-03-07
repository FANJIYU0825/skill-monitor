# Changelog

All notable changes to the Skill Monitor extension will be documented in this file.

## [0.1.1]
### Changed
- **Multi-Agent Orchestration**: Refactored the security scanner's AI analysis entirely using a multi-agent framework.
- **Improved LLM Prompts**: Defined specialized subagent prompts (`PromptInjection`, `DataExfiltration`, `CommandInjection`, `ToolAbuse`) to increase detection precision based on the Cisco AITech taxonomy.
- **Synthesis Agent**: Combined concurrent scanner results via a dedicated Synthesis Agent to reduce LLM hallucinations and organize findings.

## [0.1.0] - 2026-03-07
### Performance & Security
- **Parallel Scanning (Subagent API Dispatch)**: The scanner now executes the structural, heuristic (RegExp), and LLM (Gemini) analyses concurrently using `Promise.all`, significantly reducing scan latency.
- **Strict Cisco AITech Integration**: Expanded the heuristic RegExp rules to fully align with Cisco AI Defense taxonomy, now covering:
  - `AITech-1.1` (Direct Prompt Injection)
  - `AITech-1.2` (Transitive Trust Abuse / Indirect Prompt Injection)
  - `AITech-4.3` (Skill Discovery Abuse)
  - `AITech-8.2` (Data Exfiltration & Hardcoded Secrets)
  - `AITech-9.1` (Command Injection / Code Execution)
  - `AITech-9.2` (Obfuscation Patterns)
  - `AITech-12.1` (Unauthorized Tool Use)

## [0.0.9] - 2026-03-07
### Security
- **Smart Scanner LLM Upgrade**: Extracted and upgraded the Gemini LLM Prompt into `src/llm-prompt.js`. It now uses unpredictable randomized delimiters (e.g. `<!---UNTRUSTED_INPUT_START_...`) and explicitly enforces the Cisco AITech Threat Taxonomy to prevent Prompt Injection during the AI analysis phase itself.

## [0.0.8] - 2026-03-07

### Changed
- Integrated **Cisco AI Defense Skill-Scanner** threat taxonomy (`AITech`) rules into the heuristic scanner.
- Enhanced regex detection for Prompt Injection (`AITech-1.1`), Data Exfiltration, and Command Injection for rapid, local execution without LLM latency.
- Referenced `https://github.com/cisco-ai-defense/skill-scanner/` in documentation as the design baseline.

## [0.0.7] - 2026-03-07

### Added
- Re-enabled and upgraded the AI Security Scanner using `Google Gemini`.
- Integrated `Re Rep` (Regular Expression) and `LLM Rep` (AI Scanning) results directly into the UI.
- Configurable `skill-monitor.googleApiKey` to enable AI scanning securely on the user's machines.

### Changed
- Swapped the default README documentation language to English in the Visual Studio Code extension marketplace.

## [0.0.6] - 2026-03-07

### Added
- Added Language Switch (English / Traditional Chinese) to README.
- Included Sample Skills Demo Folder and detailed explanation documentation (`sample-skills/README.md`).

### Changed
- Fixed `package.json` repository URL to point to the correct `FANJIYU0825` namespace to resolve Open VSX registry loading issues.

## [0.0.5] - 2026-03-07

### Changed
- Clarified in README that the AI Security Scanner has been disabled.
- Emphasized that the scanner now relies exclusively on robust Regular Expressions (正則表達式) and heuristic rules for security validation.

## [0.0.4] - 2026-03-07

### Added
- Created this CHANGELOG file to track version updates starting from 0.0.3.
- Implemented `CHANGELOG.md` to record changes over different vsix versions.

### Removed
- Removed the AI-based API key requirement for Skill Scanner due to functional instability.
- Removed OpenAI HTTPS direct call and prompt injection detection over GPT model.
- Removed AI scan from README documentation.

## [0.0.3] - 2026-03-06

### Added
- Introduced the "Skill Scanner" feature with heuristic pattern-matching capabilities.
- Added "Apply" to copy the skill slash command to clipboard.
- Added UI to "Import Examples" directly from the extension dashboard to the workspace.
- Implemented interactive Skill Monitor Dashboard with WebView.
- Added active file monitoring directly connected with `.agents/active_skill.json`.

### Changed
- Refactored `webviewProvider.js` for better UI/UX.

### Fixed
- Stabilized structural layout validation for YAML frontmatter in `SKILL.md`.
