const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/** @type {vscode.StatusBarItem} */
let myStatusBarItem;
let isMonitoring = true;

function activate(context) {
    console.log('Skill Monitor is now active!');

    // Create a status bar item
    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = 'skill-monitor.toggle';
    context.subscriptions.push(myStatusBarItem);

    // Initial update
    updateStatusBarItem();
    myStatusBarItem.show();

    // Register WebviewViewProvider
    const provider = new SkillMonitorWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('skillMonitorWebView', provider)
    );

    // Toggle command
    vscode.commands.registerCommand('skill-monitor.toggle', () => {
        isMonitoring = !isMonitoring;
        vscode.window.showInformationMessage(`Skill Monitor is now ${isMonitoring ? 'ON' : 'OFF'}`);
        updateStatusBarItem();
        provider.updateState();
        vscode.commands.executeCommand('setContext', 'skill-monitor:isMonitoring', isMonitoring);
    });

    // Interaction: Open Skill Documentation
    vscode.commands.registerCommand('skill-monitor.openSkill', (skillName) => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const rootPath = workspaceFolders[0].uri.fsPath;
        const skillMdPath = path.join(rootPath, '.agents', 'skills', skillName, 'SKILL.md');

        if (fs.existsSync(skillMdPath)) {
            vscode.workspace.openTextDocument(skillMdPath).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        } else {
            vscode.window.showErrorMessage(`No SKILL.md found for ${skillName}`);
        }
    });

    // File Watchers
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootPath = workspaceFolders[0].uri.fsPath;

        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(rootPath, '.agents/active_skill.json'));
        const updateAll = () => {
            if (isMonitoring) {
                updateStatusBarItem();
                provider.updateState();
            }
        };

        watcher.onDidChange(updateAll);
        watcher.onDidCreate(updateAll);
        watcher.onDidDelete(() => {
            if (isMonitoring) {
                myStatusBarItem.text = `$(gear) Skill: None`;
                provider.updateState();
            }
        });

        // Watch the skills folder for direct subdirectory changes (skill additions/removals)
        const skillsWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(rootPath, '.agents/skills/*'));
        skillsWatcher.onDidCreate(() => provider.updateState());
        skillsWatcher.onDidDelete(() => provider.updateState());
        skillsWatcher.onDidChange(() => provider.updateState());

        context.subscriptions.push(watcher, skillsWatcher);
    }
}

class SkillMonitorWebviewProvider {
    constructor(extensionUri) {
        this._extensionUri = extensionUri;
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
                case 'toggle':
                    vscode.commands.executeCommand('skill-monitor.toggle');
                    break;
                case 'requestUpdate':
                    this.updateState();
                    break;
            }
        });

        this.updateState();
    }

    async updateState() {
        if (!this._view) return;

        // Debounce updates to avoid rapid file watcher triggers causing UI lag
        if (this._updateTimer) {
            clearTimeout(this._updateTimer);
        }

        this._updateTimer = setTimeout(() => {
            this._performUpdate();
        }, 300);
    }

    async _performUpdate() {
        if (!this._view) return;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            this._view.webview.postMessage({ type: 'update', isMonitoring, activeSkills: [], availableSkills: [] });
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const skillsDir = path.join(rootPath, '.agents', 'skills');
        const activeSkillPath = path.join(rootPath, '.agents', 'active_skill.json');

        let activeSkills = [];
        let availableSkills = [];

        try {
            if (fs.existsSync(activeSkillPath)) {
                const data = JSON.parse(fs.readFileSync(activeSkillPath, 'utf8'));
                activeSkills = data.active_skills || [];
            }
        } catch (e) { }

        try {
            if (fs.existsSync(skillsDir)) {
                availableSkills = fs.readdirSync(skillsDir, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
            }
        } catch (e) { }

        this._view.webview.postMessage({
            type: 'update',
            isMonitoring,
            activeSkills,
            availableSkills
        });
    }

    async _toggleSkillActivation(skillName) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

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

    async _applySkillToChat(skillName) {
        try {
            const slashCommand = `/${skillName}`;
            await vscode.env.clipboard.writeText(slashCommand);
            vscode.window.showInformationMessage(`Skill command "${slashCommand}" copied to clipboard!`);
        } catch (err) {
            vscode.window.showErrorMessage(`Error copying skill command: ${err.message}`);
        }
    }

    _getHtmlForWebview(webview) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    :root {
                        --bg-color: #0d1117;
                        --card-bg: rgba(255, 255, 255, 0.05);
                        --glow-color: #58a6ff;
                        --active-glow: #79c0ff;
                        --inactive-color: #30363d;
                        --text-primary: #c9d1d9;
                        --text-secondary: #8b949e;
                    }
                    body {
                        font-family: 'Segoe UI', sans-serif;
                        background: transparent;
                        color: var(--text-primary);
                        padding: 10px;
                        margin: 0;
                        user-select: none;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid var(--inactive-color);
                    }
                    .title {
                        font-size: 14px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: var(--text-secondary);
                    }
                    .toggle-btn {
                        cursor: pointer;
                        padding: 4px 8px;
                        border-radius: 4px;
                        background: var(--card-bg);
                        font-size: 10px;
                        border: 1px solid var(--inactive-color);
                        color: var(--text-secondary);
                        transition: 0.3s;
                    }
                    .toggle-btn:hover {
                        background: var(--inactive-color);
                    }
                    .toggle-btn.active {
                        border-color: var(--glow-color);
                        color: var(--glow-color);
                        box-shadow: 0 0 5px var(--glow-color);
                    }
                    .skill-list {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .skill-card {
                        background: var(--card-bg);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                        position: relative;
                        overflow: hidden;
                    }
                    .skill-card:hover {
                        transform: translateY(-2px);
                        background: rgba(255, 255, 255, 0.08);
                    }
                    .skill-info {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                    }
                    .skill-name {
                        font-weight: 500;
                        font-size: 13px;
                    }
                    .skill-status {
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 10px;
                        background: var(--inactive-color);
                        color: var(--text-secondary);
                    }
                    .skill-card.active .skill-status {
                        background: rgba(88, 166, 255, 0.2);
                        color: var(--glow-color);
                    }
                    /* The Status Bar */
                    .status-bar-container {
                        width: 100%;
                        height: 4px;
                        background: var(--inactive-color);
                        border-radius: 2px;
                        overflow: hidden;
                        position: relative;
                    }
                    .status-bar-fill {
                        height: 100%;
                        width: 0%;
                        background: var(--glow-color);
                        transition: width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    .skill-card.active .status-bar-fill {
                        width: 100%;
                        background: var(--glow-color);
                        box-shadow: 0 0 10px var(--glow-color);
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.6; }
                        100% { opacity: 1; }
                    }
                    .paused-overlay {
                        display: none;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        margin-top: 40px;
                        color: var(--text-secondary);
                        text-align: center;
                    }
                    .paused-overlay.visible { display: flex; }
                    .skill-action-btn {
                        background: none;
                        border: 1px solid var(--inactive-color);
                        color: var(--text-secondary);
                        border-radius: 4px;
                        font-size: 10px;
                        padding: 2px 6px;
                        cursor: pointer;
                        transition: 0.2s;
                    }
                    .skill-action-btn:hover {
                        border-color: var(--glow-color);
                        color: var(--glow-color);
                        box-shadow: 0 0 5px var(--glow-color);
                    }
                    .skill-actions {
                        display: flex;
                        gap: 8px;
                        margin-top: 10px;
                        justify-content: flex-end;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">Skill Dashboard</div>
                    <div id="toggle-btn" class="toggle-btn">MONITOR ON</div>
                </div>
                <div id="skill-list" class="skill-list"></div>
                <div id="paused-overlay" class="paused-overlay">
                    <p>Monitoring is currently paused.</p>
                    <button class="toggle-btn" onclick="toggle()">RESUME</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const skillList = document.getElementById('skill-list');
                    const toggleBtn = document.getElementById('toggle-btn');
                    const pausedOverlay = document.getElementById('paused-overlay');

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'update') {
                            render(message);
                        }
                    });

                    function toggle() {
                        vscode.postMessage({ type: 'toggle' });
                    }

                    toggleBtn.onclick = toggle;

                    function render(state) {
                        const { isMonitoring, activeSkills, availableSkills } = state;
                        
                        toggleBtn.innerText = isMonitoring ? 'MONITOR ON' : 'MONITOR OFF';
                        toggleBtn.className = isMonitoring ? 'toggle-btn active' : 'toggle-btn';
                        
                        if (!isMonitoring) {
                            skillList.style.display = 'none';
                            pausedOverlay.className = 'paused-overlay visible';
                            return;
                        }

                        skillList.style.display = 'flex';
                        pausedOverlay.className = 'paused-overlay';
                        skillList.innerHTML = '';

                        availableSkills.forEach(skill => {
                            const isActive = activeSkills.includes(skill);
                            const card = document.createElement('div');
                            card.className = isActive ? 'skill-card active' : 'skill-card';
                            
                            // Handling Single vs Double Click
                            let timer = null;
                            card.onclick = () => {
                                if (timer) clearTimeout(timer);
                                timer = setTimeout(() => {
                                    vscode.postMessage({ type: 'openSkill', skillName: skill });
                                }, 250);
                            };
                            card.ondblclick = () => {
                                if (timer) clearTimeout(timer);
                                vscode.postMessage({ type: 'toggleSkill', skillName: skill });
                            };
                            
                            card.innerHTML = \`
                                <div class="skill-info">
                                    <span class="skill-name">\${skill}</span>
                                    <span class="skill-status">\${isActive ? 'ACTIVE' : 'READY'}</span>
                                </div>
                                <div class="status-bar-container">
                                    <div class="status-bar-fill"></div>
                                </div>
                                <div class="skill-actions">
                                    <button class="skill-action-btn" onclick="event.stopPropagation(); vscode.postMessage({ type: 'applySkill', skillName: '\${skill}' })">Apply to Chat</button>
                                </div>
                            \`;
        skillList.appendChild(card);
    });

    if(availableSkills.length === 0) {
    skillList.innerHTML = '<p style="color: grey; font-size: 12px; text-align: center;">No skills found in .agents/skills</p>';
}
                    }

// Request initial state
vscode.postMessage({ type: 'requestUpdate' });
                </script >
            </body >
            </html >
    `;
    }
}

function updateStatusBarItem() {
    if (!isMonitoring) {
        myStatusBarItem.text = `$(debug - pause) Monitor: OFF`;
        myStatusBarItem.tooltip = 'Click to start monitoring skills';
        return;
    }
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        myStatusBarItem.text = `$(gear) Skill: None`;
        return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const skillFilePath = path.join(rootPath, '.agents', 'active_skill.json');

    try {
        if (fs.existsSync(skillFilePath)) {
            const data = JSON.parse(fs.readFileSync(skillFilePath, 'utf8'));
            const skills = data.active_skills || [];
            const displaySkills = skills.length > 0 ? skills.join(', ') : 'None';
            myStatusBarItem.text = `$(zap) Skill: ${displaySkills} `;
            myStatusBarItem.tooltip = `Current Active Skills: ${displaySkills} (Click to stop)`;
        } else {
            myStatusBarItem.text = `$(gear) Skill: None`;
        }
    } catch (err) {
        console.error('Error reading active_skill.json:', err);
        myStatusBarItem.text = `$(alert) Skill: Error`;
    }
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
