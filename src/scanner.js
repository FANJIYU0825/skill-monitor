const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

/**
 * Skill Scanner results structure
 * @typedef {Object} ScanResult
 * @property {string} skillName
 * @property {string} severity - NONE, LOW, MEDIUM, HIGH, CRITICAL
 * @property {Object} structural
 * @property {boolean} structural.valid
 * @property {string[]} structural.errors
 * @property {Object} security
 * @property {string[]} security.findings
 * @property {string} security.summary
 */

class SkillScanner {
    /**
     * Perform a complete scan of a skill
     * @param {string} skillName 
     * @param {string} rootPath 
     * @returns {Promise<ScanResult>}
     */
    async scan(skillName, rootPath) {
        const skillPath = path.join(rootPath, '.agents', 'skills', skillName);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        const result = {
            skillName,
            severity: 'NONE',
            structural: { valid: true, errors: [] },
            security: { findings: [], summary: '' }
        };

        if (!fs.existsSync(skillPath)) {
            result.structural.valid = false;
            result.structural.errors.push(`Skill directory not found: ${skillPath}`);
            result.severity = 'CRITICAL';
            return result;
        }

        if (!fs.existsSync(skillMdPath)) {
            result.structural.valid = false;
            result.structural.errors.push('SKILL.md not found');
            result.severity = 'HIGH';
        }

        let skillContent = '';
        if (result.structural.valid) {
            skillContent = fs.readFileSync(skillMdPath, 'utf8');
            this._performStructuralScan(skillContent, result);
        }

        // 1. RegExp Scan (Re Rep)
        const reRepResult = this._performRegExpScan(skillContent, result);

        // 2. AI Scan (LLM Rep)
        let llmRepText = 'None.';
        let llmSeverity = 'NONE';
        const config = vscode.workspace.getConfiguration('skill-monitor');
        const apiKey = config.get('googleApiKey');

        if (apiKey && skillContent) {
            try {
                // Determine if we need to show a progress notification for the LLM scan
                // Since this is called from the command, we might be inside a progress block already
                const scanOutput = await this._performAIScan(apiKey, skillContent, skillName);
                llmRepText = scanOutput.text;
                llmSeverity = scanOutput.severity;
            } catch (err) {
                llmRepText = `[Error calling Google API] ${err.message}`;
                console.error('LLM Scan Error:', err);
            }
        }

        // 3. Combine both results
        result.security.summary = `=== Re Rep ===\n${reRepResult.summary}\n\n=== LLM Rep ===\n${llmRepText}`;

        // Determine final highest severity across Structural, RegExp, and LLM
        let highestSeverity = result.severity;
        if (this._isHigherSeverity(reRepResult.severity, highestSeverity)) {
            highestSeverity = reRepResult.severity;
        }
        if (this._isHigherSeverity(llmSeverity, highestSeverity)) {
            highestSeverity = llmSeverity;
        }
        if (result.structural.errors.length > 0 && highestSeverity === 'NONE') {
            highestSeverity = 'LOW';
        }

        result.severity = highestSeverity;

        return result;
    }

    /**
     * Ported logic from quick_validate.py
     */
    _performStructuralScan(content, result) {
        // 1. Check YAML frontmatter
        if (!content.startsWith('---')) {
            result.structural.valid = false;
            result.structural.errors.push("No YAML frontmatter found (must start with ---)");
            return;
        }

        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) {
            result.structural.valid = false;
            result.structural.errors.push("Invalid frontmatter format (no closing --- found)");
            return;
        }

        const frontmatterText = match[1];

        // Simple manual YAML parsing for required fields to avoid external dependencies if possible
        // (but ideally we'd use a parser if allowed)
        const lines = frontmatterText.split('\n');
        const frontmatter = {};
        lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(':').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
                frontmatter[key] = value;
            }
        });

        // Check required fields
        if (!frontmatter.name) {
            result.structural.valid = false;
            result.structural.errors.push("Missing 'name' in frontmatter");
        }
        if (!frontmatter.description) {
            result.structural.valid = false;
            result.structural.errors.push("Missing 'description' in frontmatter");
        }

        // Validate name format (kebab-case)
        if (frontmatter.name) {
            const name = frontmatter.name.trim();
            if (!/^[a-z0-9-]+$/.test(name)) {
                result.structural.valid = false;
                result.structural.errors.push(`Name '${name}' should be kebab-case (lowercase letters, digits, and hyphens only)`);
            }
            if (name.length > 64) {
                result.structural.valid = false;
                result.structural.errors.push(`Name is too long (${name.length} characters). Maximum 64.`);
            }
        }

        // Validate description
        if (frontmatter.description) {
            const desc = frontmatter.description.trim();
            if (desc.includes('<') || desc.includes('>')) {
                result.structural.valid = false;
                result.structural.errors.push("Description cannot contain angle brackets (< or >)");
            }
            if (desc.length > 1024) {
                result.structural.valid = false;
                result.structural.errors.push(`Description is too long (${desc.length} characters). Maximum 1024.`);
            }
        }
    }


    _performRegExpScan(content, result) {
        if (!content) return { severity: 'NONE', summary: 'No content to scan.' };

        const findings = [];
        let severity = 'NONE';

        // 1. Prompt Injection (AITech-1.1)
        if (/(ignore previous|disregard|forget|override).*(instructions|prompt|rules)|<!---UNTRUSTED_INPUT_START_/i.test(content)) {
            findings.push("- [HIGH] [AITech-1.1] Potential Prompt Injection (Instruction Override) detected.");
            severity = 'HIGH';
        }

        // 2. Data Exfiltration
        if (/(curl|wget|nc|netcat|ping|telnet) .*(http|ftp|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i.test(content)) {
            findings.push("- [CRITICAL] [Data Exfiltration] Potential network transmission command detected.");
            if (this._isHigherSeverity('CRITICAL', severity)) severity = 'CRITICAL';
        }

        // 3. Command Injection
        if (/(rm -rf|mkfs|chmod 777|chown -R|: ?\(\) ?\{|>\/dev\/sda)/.test(content)) {
            findings.push("- [CRITICAL] [Command Injection] Dangerous system commands detected.");
            if (this._isHigherSeverity('CRITICAL', severity)) severity = 'CRITICAL';
        }

        result.security.findings.push(...findings);

        const summary = findings.length === 0
            ? "No obvious security vulnerabilities found using heuristic scanner (Cisco AITech compliant)."
            : `Heuristic scan (Cisco AITech compliant) detected the following potential issues:\n${findings.join('\n')}`;

        return { severity, summary };
    }

    /**
     * Performs an AI Scan using Google Gemini
     * @param {string} apiKey 
     * @param {string} content 
     * @param {string} skillName 
     */
    async _performAIScan(apiKey, content, skillName) {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const prompt = `
You are a security analyst evaluating an AI Agent Skill for vulnerabilities, specifically:
1. Prompt Injection (e.g. attempting to override system instructions)
2. Data Exfiltration (e.g. attempting to send data out via unauthorized channels)
3. Destructive Commands (e.g. rm -rf)

Analyze the following skill content and return a concise report. 
Important: If the skill is safe, DO NOT make up vulnerabilities. 
If you find vulnerabilities, start your report with the severity level in brackets: [LOW], [MEDIUM], [HIGH], or [CRITICAL].

Skill Name: ${skillName}
--- SKILL CONTENT ---
${content}
--- END SKILL CONTENT ---
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text || '';
        let severity = 'NONE';

        // Extract severity from the LLM response if provided
        if (text.includes('[CRITICAL]')) severity = 'CRITICAL';
        else if (text.includes('[HIGH]')) severity = 'HIGH';
        else if (text.includes('[MEDIUM]')) severity = 'MEDIUM';
        else if (text.includes('[LOW]')) severity = 'LOW';
        // If the LLM didn't explicitly mention it but warned about problems, default to Medium
        else if (text.toLowerCase().includes('vulnerability') || text.toLowerCase().includes('detected')) {
            if (severity === 'NONE') severity = 'MEDIUM';
        }

        return { text: text.trim(), severity };
    }

    _isHigherSeverity(newSev, currentSev) {
        const order = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        return order.indexOf(newSev) > order.indexOf(currentSev);
    }
}

module.exports = { SkillScanner };
