const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { buildMultiAgentScanner } = require('./llm-prompt');

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
            return result;
        }

        const skillContent = fs.readFileSync(skillMdPath, 'utf8');

        // Prepare config for LLM Scan
        const config = vscode.workspace.getConfiguration('skill-monitor');
        const apiKey = config.get('googleApiKey');

        // Dispatch all scans concurrently
        const [structuralResult, reRepResult, scanOutput] = await Promise.all([
            // Structural is synchronous but wrapped for standard interface
            new Promise((resolve) => {
                const tempRes = { structural: { valid: true, errors: [] } };
                this._performStructuralScan(skillContent, tempRes);
                resolve(tempRes.structural);
            }),
            // RegExp is synchronous but wrapped
            new Promise((resolve) => {
                resolve(this._performRegExpScan(skillContent));
            }),
            // AI scan is asynchronous natively
            (async () => {
                if (apiKey && skillContent) {
                    try {
                        return await this._performAIScan(apiKey, skillContent, skillName);
                    } catch (err) {
                        console.error('LLM Scan Error:', err);
                        return { text: `[Error calling Google API] ${err.message}`, severity: 'NONE' };
                    }
                }
                return { text: 'None.', severity: 'NONE' };
            })()
        ]);

        // Aggregate results
        result.structural = structuralResult;
        result.security.findings.push(...reRepResult.findings);

        const llmRepText = scanOutput.text;
        const llmSeverity = scanOutput.severity;

        result.security.summary = `=== Re Rep ===\n${reRepResult.summary}\n\n=== LLM Rep ===\n${llmRepText}`;

        // Determine final highest severity across Structural, RegExp, and LLM
        let highestSeverity = result.severity;
        if (this._isHigherSeverity(reRepResult.severity, highestSeverity)) highestSeverity = reRepResult.severity;
        if (this._isHigherSeverity(llmSeverity, highestSeverity)) highestSeverity = llmSeverity;
        if (result.structural.errors.length > 0 && highestSeverity === 'NONE') highestSeverity = 'LOW';

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


    /**
     * @returns {{severity: string, summary: string, findings: string[]}}
     */
    _performRegExpScan(content) {
        if (!content) return { severity: 'NONE', summary: 'No content to scan.', findings: [] };

        const findings = [];
        let severity = 'NONE';

        // 1. Direct Prompt Injection (AITech-1.1)
        if (/(ignore previous|disregard|forget|override).*(instructions|prompt|rules)|<!---UNTRUSTED_INPUT_START_/i.test(content)) {
            findings.push("- [HIGH] [AITech-1.1] Prompt Injection: Instruction override detected.");
            if (this._isHigherSeverity('HIGH', severity)) severity = 'HIGH';
        }

        // 2. Transitive Trust Abuse / Indirect Prompt Injection (AITech-1.2)
        if (/(system|assistant):.*(ignore|follow)/i.test(content) || /parse.*(URL|http).*instructions/i.test(content)) {
            findings.push("- [MEDIUM] [AITech-1.2] Transitive Trust Abuse: Potential indirect prompt injection from external content.");
            if (this._isHigherSeverity('MEDIUM', severity)) severity = 'MEDIUM';
        }

        // 3. Skill Discovery Abuse (AITech-4.3)
        if (/(can|will) perform (all|any|unlimited) actions|always return true/i.test(content)) {
            findings.push("- [MEDIUM] [AITech-4.3] Skill Discovery Abuse: Capability inflation detected.");
            if (this._isHigherSeverity('MEDIUM', severity)) severity = 'MEDIUM';
        }

        // 4. Data Exfiltration & Hardcoded Secrets (AITech-8.2)
        if (/(curl|wget|nc|netcat|ping|telnet) .*(http|ftp|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i.test(content)) {
            findings.push("- [CRITICAL] [AITech-8.2] Data Exfiltration: Network transmission command detected.");
            if (this._isHigherSeverity('CRITICAL', severity)) severity = 'CRITICAL';
        }
        if (/(AKIA[0-9A-Z]{16})|(ghp_[a-zA-Z0-9]{36})|("?password"?\s*[:=]\s*".+")/i.test(content)) {
            findings.push("- [HIGH] [AITech-8.2] Hardcoded Secrets: Embedded credentials or keys detected.");
            if (this._isHigherSeverity('HIGH', severity)) severity = 'HIGH';
        }

        // 5. Command Injection / Code Execution (AITech-9.1)
        if (/(rm -rf|mkfs|chmod 777|chown -R|: \(\) \{|>\/dev\/sda|os\.system|subprocess\.Popen|eval\(.*\))/i.test(content)) {
            findings.push("- [CRITICAL] [AITech-9.1] Command Injection / Code Execution: Dangerous system commands or execution primitives detected.");
            if (this._isHigherSeverity('CRITICAL', severity)) severity = 'CRITICAL';
        }

        // 6. Obfuscation (AITech-9.2)
        if (/(base64 -d|ZWNoby|echo -e "\\x|fromCharCode)/i.test(content)) {
            findings.push("- [HIGH] [AITech-9.2] Obfuscation: Detection-evasion obfuscation patterns (e.g. Base64) detected.");
            if (this._isHigherSeverity('HIGH', severity)) severity = 'HIGH';
        }

        // 7. Unauthorized Tool Use (AITech-12.1)
        if (/(use_tool|execute_tool).*(shell|bash|python|node)/i.test(content)) {
            findings.push("- [HIGH] [AITech-12.1] Unauthorized Tool Use: Unsafe interaction with compute environments detected.");
            if (this._isHigherSeverity('HIGH', severity)) severity = 'HIGH';
        }

        const summary = findings.length === 0
            ? "No obvious security vulnerabilities found using heuristic scanner (Cisco AITech compliant)."
            : `Heuristic scan (Cisco AITech compliant) detected the following potential issues:\n${findings.join('\n')}`;

        return { severity, summary, findings };
    }

    /**
     * Performs an AI Scan using Google Gemini Orchestrator and Subagents
     * @param {string} apiKey 
     * @param {string} content 
     * @param {string} skillName 
     */
    async _performAIScan(apiKey, content, skillName) {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        // Build the pipeline (Sequential -> Parallel -> Synthesizer)
        const scannerPipeline = buildMultiAgentScanner();

        // Object state that acts as memory/storage between the agents
        const pipelineState = {};
        const inputContent = `[Skill Name]: ${skillName}\n\n[Skill Content]:\n${content}`;

        // Run the agent pipeline
        // 1. Parallel Security Agents run and update the pipelineState with their findings.
        // 2. The Merger Agent reads the state, interpolates it into its prompt, and returns a synthetic summary.
        const synthesisReport = await scannerPipeline.run(ai, inputContent, pipelineState);

        let highestSeverity = 'NONE';
        const rawReport = synthesisReport || '';

        // Extract severity from the Merger Agent's synthetic response
        if (rawReport.includes('[CRITICAL]')) highestSeverity = 'CRITICAL';
        else if (rawReport.includes('[HIGH]')) highestSeverity = 'HIGH';
        else if (rawReport.includes('[MEDIUM]')) highestSeverity = 'MEDIUM';
        else if (rawReport.includes('[LOW]')) highestSeverity = 'LOW';
        else if (rawReport.includes('[SAFE]')) highestSeverity = 'NONE';

        // Include the actual pipeline internal states for detailed observability
        const details = [
            "---------------------------",
            "Multi-Agent Breakdown:",
            "---------------------------",
            `Prompt Injection: ${pipelineState.prompt_injection_result}`,
            `Data Exfil:       ${pipelineState.data_exfil_result}`,
            `Cmd Injection:    ${pipelineState.command_injection_result}`,
            `Tool Abuse:       ${pipelineState.tool_abuse_result}\n`
        ].join('\n');

        return {
            text: `${rawReport}\n\n${details}`,
            severity: highestSeverity
        };
    }

    _isHigherSeverity(newSev, currentSev) {
        const order = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        return order.indexOf(newSev) > order.indexOf(currentSev);
    }
}

module.exports = { SkillScanner };
