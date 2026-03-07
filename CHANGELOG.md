# Changelog

All notable changes to the Skill Monitor extension will be documented in this file.

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
