const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class SkillMonitorWebviewProvider {
    constructor(extensionUri, getIsMonitoring) {
        this._extensionUri = extensionUri;
        this._getIsMonitoring = getIsMonitoring;
        this._view = undefined;
        this._updateTimer = undefined;
    }

    resolveWebviewView(webviewView, context, token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateState();
            }
        });

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'openSkill':
                    vscode.commands.executeCommand('skill-monitor.openSkill', data.skillName);
                    break;
                case 'toggleSkill':
                    this._toggleSkillActivation(data.skillName);
                    break;
                case 'applySkill':
                    this._applySkillToChat(data.skillName);
                    break;
                case 'scanSkill':
                    vscode.commands.executeCommand('skill-monitor.scanSkill', data.skillName);
                    break;
                case 'reScanSkill':
                    vscode.commands.executeCommand('skill-monitor.reScanSkill', data.skillName);
                    break;
                case 'toggle':
                    vscode.commands.executeCommand('skill-monitor.toggle');
                    break;
                case 'requestUpdate':
                    this.updateState();
                    break;
                case 'importExamples':
                    vscode.commands.executeCommand('skill-monitor.importExamples', data.skillName);
                    break;
                case 'previewExampleSkill':
                    vscode.commands.executeCommand('skill-monitor.previewExampleSkill', data.skillName);
                    break;
            }
        });

        this.updateState();
    }

    async updateState() {
        if (!this._view) return;
        if (this._updateTimer) clearTimeout(this._updateTimer);
        this._updateTimer = setTimeout(() => {
            this._performUpdate();
        }, 300);
    }

    postMessage(message) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    async _performUpdate() {
        if (!this._view) return;

        const isMonitoring = this._getIsMonitoring();
        const workspaceFolders = vscode.workspace.workspaceFolders;

        let activeSkills = [];
        let availableSkills = [];
        let exampleSkills = [];

        if (!workspaceFolders || workspaceFolders.length === 0) {
            this._readExampleSkills(exampleSkills);
            this._view.webview.postMessage({ type: 'update', isMonitoring, activeSkills, availableSkills, exampleSkills });
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const skillsDir = path.join(rootPath, '.agents', 'skills');
        const activeSkillPath = path.join(rootPath, '.agents', 'active_skill.json');

        try {
            if (fs.existsSync(activeSkillPath)) {
                const data = JSON.parse(fs.readFileSync(activeSkillPath, 'utf8'));
                activeSkills = data.active_skills || [];
            }
        } catch (e) { }

        try {
            if (fs.existsSync(skillsDir)) {
                const dirents = fs.readdirSync(skillsDir, { withFileTypes: true });
                for (const dirent of dirents) {
                    if (dirent.isDirectory()) {
                        const skillName = dirent.name;
                        const skillMdPath = path.join(skillsDir, skillName, 'SKILL.md');
                        let metadataName = skillName;

                        if (fs.existsSync(skillMdPath)) {
                            const content = fs.readFileSync(skillMdPath, 'utf8');
                            const match = content.match(/^---\n([\s\S]*?)\n---/);
                            if (match) {
                                const frontmatterText = match[1];
                                const nameLine = frontmatterText.split('\n').find(l => l.startsWith('name:'));
                                if (nameLine) {
                                    metadataName = nameLine.split(':')[1].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
                                }
                            }
                        }

                        availableSkills.push({
                            folder: skillName,
                            name: metadataName
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Error reading skills directory:', e);
        }

        this._readExampleSkills(exampleSkills);

        this._view.webview.postMessage({
            type: 'update',
            isMonitoring,
            activeSkills,
            availableSkills,
            exampleSkills
        });
    }

    _readExampleSkills(exampleSkills) {
        try {
            const sampleSkillsDir = path.join(this._extensionUri.fsPath, 'sample-skills');
            if (fs.existsSync(sampleSkillsDir)) {
                const dirents = fs.readdirSync(sampleSkillsDir, { withFileTypes: true });
                for (const dirent of dirents) {
                    if (dirent.isDirectory()) {
                        const skillName = dirent.name;
                        const skillMdPath = path.join(sampleSkillsDir, skillName, 'SKILL.md');
                        let metadataName = skillName;

                        if (fs.existsSync(skillMdPath)) {
                            const content = fs.readFileSync(skillMdPath, 'utf8');
                            const match = content.match(/^---\n([\s\S]*?)\n---/);
                            if (match) {
                                const frontmatterText = match[1];
                                const nameLine = frontmatterText.split('\n').find(l => l.startsWith('name:'));
                                if (nameLine) {
                                    metadataName = nameLine.split(':')[1].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
                                }
                            }
                        }

                        exampleSkills.push({
                            folder: skillName,
                            name: metadataName
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Error reading sample skills directory:', e);
        }
    }

    async _toggleSkillActivation(skillName) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return;
        const rootPath = workspaceFolders[0].uri.fsPath;
        const activeSkillPath = path.join(rootPath, '.agents', 'active_skill.json');

        try {
            let activeSkills = [];
            if (fs.existsSync(activeSkillPath)) {
                const data = JSON.parse(fs.readFileSync(activeSkillPath, 'utf8'));
                activeSkills = data.active_skills || [];
            }

            const index = activeSkills.indexOf(skillName);
            if (index > -1) {
                activeSkills.splice(index, 1);
            } else {
                activeSkills.push(skillName);
            }
            fs.writeFileSync(activeSkillPath, JSON.stringify({ active_skills: activeSkills }, null, 4));
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to update active skills: ${err.message}`);
        }
    }

    async _applySkillToChat(skillIdentifier) {
        try {
            const slashCommand = `/${skillIdentifier}`;
            await vscode.env.clipboard.writeText(slashCommand);
            vscode.window.showInformationMessage(`Skill command "${slashCommand}" copied to clipboard!`);
        } catch (err) {
            vscode.window.showErrorMessage(`Error copying skill command: ${err.message}`);
        }
    }

    _getHtmlForWebview(webview) {
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview.html');
        return fs.readFileSync(htmlPath, 'utf8');
    }
}

module.exports = {
    SkillMonitorWebviewProvider
};
