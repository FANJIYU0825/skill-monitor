const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

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

        this._fallbackRegExpScan(skillContent, result);

        // Determine final severity based on both scans
        if (result.structural.errors.length > 0 && result.severity === 'NONE') {
            result.severity = 'LOW';
        }

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


    _fallbackRegExpScan(content, result) {
        if (!content) return;

        const findings = [];
        let severity = result.severity === 'NONE' ? 'NONE' : result.severity;

        // 1. Prompt Injection
        if (/(ignore previous|disregard|forget|override).*(instructions|prompt|rules)/i.test(content)) {
            findings.push("- [HIGH] Potential Prompt Injection detected.");
            if (this._isHigherSeverity('HIGH', severity)) severity = 'HIGH';
        }

        // 2. Data Exfiltration
        if (/(curl|wget|nc|netcat|ping|telnet) .*(http|ftp|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i.test(content)) {
            findings.push("- [CRITICAL] Potential Data Exfiltration detected.");
            if (this._isHigherSeverity('CRITICAL', severity)) severity = 'CRITICAL';
        }

        // 3. Dangerous commands
        if (/(rm -rf|mkfs|chmod 777|chown -R|: ?\(\) ?\{|>\/dev\/sda)/.test(content)) {
            findings.push("- [CRITICAL] Dangerous system commands detected.");
            if (this._isHigherSeverity('CRITICAL', severity)) severity = 'CRITICAL';
        }

        result.security.findings = findings;
        result.severity = severity;

        if (findings.length === 0) {
            result.security.summary = "No obvious security vulnerabilities found using heuristic scanner.";
        } else {
            result.security.summary = `Heuristic scan detected the following potential issues:\n\n${findings.join('\n')}`;
        }
    }

    _isHigherSeverity(newSev, currentSev) {
        const order = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        return order.indexOf(newSev) > order.indexOf(currentSev);
    }
}

module.exports = { SkillScanner };
