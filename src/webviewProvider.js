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
                        --success: #238636;
                        --warning: #d29922;
                        --error: #f85149;
                        --critical: #da3633;
                    }
                    body {
                        font-family: 'Segoe UI', -apple-system, sans-serif;
                        background: transparent;
                        color: var(--text-primary);
                        padding: 10px;
                        margin: 0;
                        user-select: none;
                        overflow-x: hidden;
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
                    .tabs {
                        display: flex;
                        gap: 15px;
                        margin-bottom: 12px;
                        border-bottom: 1px solid var(--inactive-color);
                        padding-bottom: 5px;
                    }
                    .tab {
                        font-size: 13px;
                        color: var(--text-secondary);
                        cursor: pointer;
                        padding: 4px 8px;
                        border-bottom: 2px solid transparent;
                    }
                    .tab.active {
                        color: var(--text-primary);
                        border-bottom-color: var(--glow-color);
                        font-weight: bold;
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
                    .toggle-btn:hover { background: var(--inactive-color); }
                    .toggle-btn.active {
                        border-color: var(--glow-color);
                        color: var(--glow-color);
                        box-shadow: 0 0 5px var(--glow-color);
                    }
                    .skill-list { display: flex; flex-direction: column; gap: 12px; }
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
                    .skill-name { font-weight: 500; font-size: 13px; }
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
                    .status-bar-container {
                        width: 100%;
                        height: 4px;
                        background: var(--inactive-color);
                        border-radius: 2px;
                        overflow: hidden;
                        position: relative;
                        margin-bottom: 8px;
                    }
                    .status-bar-fill {
                        height: 100%;
                        width: 0%;
                        background: var(--glow-color);
                        transition: width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    .skill-card.active .status-bar-fill {
                        width: 100%;
                        box-shadow: 0 0 10px var(--glow-color);
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }

                    .skill-actions { display: flex; gap: 6px; justify-content: flex-end; }
                    .action-btn {
                        background: none;
                        border: 1px solid var(--inactive-color);
                        color: var(--text-secondary);
                        border-radius: 4px;
                        font-size: 10px;
                        padding: 2px 6px;
                        cursor: pointer;
                        transition: 0.2s;
                    }
                    .action-btn:hover {
                        border-color: var(--glow-color);
                        color: var(--glow-color);
                        box-shadow: 0 0 5px var(--glow-color);
                    }

                    /* Scan Result Overlay */
                    #scan-overlay {
                        display: none;
                        position: fixed;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.8);
                        backdrop-filter: blur(8px);
                        z-index: 100;
                        padding: 20px;
                        overflow-y: auto;
                        animation: fadeIn 0.3s;
                    }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    .scan-content {
                        background: #161b22;
                        border: 1px solid var(--inactive-color);
                        border-radius: 12px;
                        padding: 20px;
                        max-width: 100%;
                    }
                    .scan-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .severity-badge {
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 10px;
                        font-weight: bold;
                    }
                    .sev-NONE { background: var(--success); color: white; }
                    .sev-LOW { background: var(--inactive-color); color: var(--text-primary); }
                    .sev-MEDIUM { background: var(--warning); color: black; }
                    .sev-HIGH { background: var(--error); color: white; }
                    .sev-CRITICAL { background: var(--critical); color: white; animation: shake 0.5s infinite; }
                    @keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-2px); } 50% { transform: translateX(2px); } 100% { transform: translateX(0); } }

                    .scan-section { margin-bottom: 15px; }
                    .scan-section-title { font-size: 12px; font-weight: bold; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; }
                    .scan-text { font-size: 12px; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap; }
                    .error-list { color: var(--error); margin: 0; padding-left: 15px; font-size: 12px; }
                    
                    .close-overlay-btn {
                        background: var(--glow-color);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        padding: 8px 16px;
                        width: 100%;
                        cursor: pointer;
                        font-weight: bold;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">Skill Dashboard</div>
                    <div style="display: flex; gap: 8px;">
                        <div id="toggle-btn" class="toggle-btn">MONITOR ON</div>
                    </div>
                </div>
                <div class="tabs">
                    <div class="tab active" id="tab-dashboard" onclick="switchTab('dashboard')">Dashboard</div>
                    <div class="tab" id="tab-examples" onclick="switchTab('examples')">Example Skills</div>
                </div>
                <div id="skill-list" class="skill-list"></div>
                <div id="example-list" class="skill-list" style="display:none;"></div>
                <div id="paused-overlay" style="display:none; flex-direction:column; align-items:center; margin-top:40px; color:var(--text-secondary); text-align:center;">
                    <p>Monitoring is currently paused.</p>
                    <button class="toggle-btn" onclick="vscode.postMessage({type:'toggle'})">RESUME</button>
                </div>

                <div id="scan-overlay">
                    <div class="scan-content">
                        <div class="scan-header">
                            <div id="scan-skill-name" class="skill-name">Scanning...</div>
                            <div id="severity-badge" class="severity-badge">NONE</div>
                        </div>
                        <div class="scan-section">
                            <div class="scan-section-title">Structural Validation</div>
                            <div id="structural-status" class="scan-text">Validating...</div>
                            <ul id="structural-errors" class="error-list"></ul>
                        </div>
                        <div class="scan-section">
                            <div class="scan-section-title">Security Analysis</div>
                            <div id="security-summary" class="scan-text">Analyzing...</div>
                        </div>
                        <button class="close-overlay-btn" onclick="document.getElementById('scan-overlay').style.display='none'">CLOSE REPORT</button>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const skillList = document.getElementById('skill-list');
                    const toggleBtn = document.getElementById('toggle-btn');
                    const pausedOverlay = document.getElementById('paused-overlay');
                    const scanOverlay = document.getElementById('scan-overlay');

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'update') render(message);
                        if (message.type === 'scanResult') showScanResult(message.scanResult);
                    });

                    let activeTab = 'dashboard';
                    function switchTab(tab) {
                        activeTab = tab;
                        document.getElementById('tab-dashboard').className = tab === 'dashboard' ? 'tab active' : 'tab';
                        document.getElementById('tab-examples').className = tab === 'examples' ? 'tab active' : 'tab';
                        if (tab === 'dashboard') {
                            document.getElementById('skill-list').style.display = 'flex';
                            document.getElementById('example-list').style.display = 'none';
                        } else {
                            document.getElementById('skill-list').style.display = 'none';
                            document.getElementById('example-list').style.display = 'flex';
                        }
                    }

                    function render(state) {
                        const { isMonitoring, activeSkills, availableSkills, exampleSkills } = state;
                        toggleBtn.innerText = isMonitoring ? 'MONITOR ON' : 'MONITOR OFF';
                        toggleBtn.className = isMonitoring ? 'toggle-btn active' : 'toggle-btn';
                        
                        if (!isMonitoring) {
                            skillList.style.display = 'none';
                            document.getElementById('example-list').style.display = 'none';
                            document.querySelector('.tabs').style.display = 'none';
                            pausedOverlay.style.display = 'flex';
                            return;
                        }

                        document.querySelector('.tabs').style.display = 'flex';
                        if (activeTab === 'dashboard') {
                            skillList.style.display = 'flex';
                            document.getElementById('example-list').style.display = 'none';
                        } else {
                            skillList.style.display = 'none';
                            document.getElementById('example-list').style.display = 'flex';
                        }

                        pausedOverlay.style.display = 'none';
                        skillList.innerHTML = '';
                        const exampleList = document.getElementById('example-list');
                        exampleList.innerHTML = '';

                        availableSkills.forEach(skillObj => {
                            const skill = skillObj.folder;
                            const displayName = skillObj.name;
                            const isActive = activeSkills.includes(skill);
                            const card = document.createElement('div');
                            card.className = isActive ? 'skill-card active' : 'skill-card';
                            
                            let timer = null;
                            card.onclick = () => {
                                if (timer) clearTimeout(timer);
                                timer = setTimeout(() => vscode.postMessage({ type: 'openSkill', skillName: skill }), 250);
                            };
                            card.ondblclick = () => {
                                if (timer) clearTimeout(timer);
                                vscode.postMessage({ type: 'toggleSkill', skillName: skill });
                            };
                            
                            card.innerHTML = \`
                                <div class="skill-info">
                                    <span class="skill-name">\${displayName}</span>
                                    <span class="skill-status">\${isActive ? 'ACTIVE' : 'READY'}</span>
                                </div>
                                <div class="status-bar-container">
                                    <div class="status-bar-fill"></div>
                                </div>
                                <div class="skill-actions">
                                    <button class="action-btn" onclick="event.stopPropagation(); vscode.postMessage({ type: 'applySkill', skillName: '\${displayName}' })">Apply</button>
                                    <button class="action-btn" onclick="event.stopPropagation(); vscode.postMessage({ type: 'scanSkill', skillName: '\${skill}' })">Scan</button>
                                </div>
                            \`;
                            skillList.appendChild(card);
                        });

                        if(availableSkills.length === 0) {
                            skillList.innerHTML = \`
                                <div style="text-align: center; padding: 20px;">
                                    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 15px;">No skills found in workspace.</p>
                                    <button class="action-btn" onclick="switchTab('examples')" style="padding: 8px 16px; font-weight: bold; border-color: var(--glow-color); color: var(--glow-color);">Browse Examples</button>
                                </div>
                            \`;
                        } else {
                            const addDiv = document.createElement('div');
                            addDiv.style.textAlign = 'center';
                            addDiv.style.marginTop = '8px';
                            addDiv.innerHTML = \`<button class="action-btn" onclick="switchTab('examples')" style="padding: 6px 12px; border-style: dashed;">+ Browse Examples</button>\`;
                            skillList.appendChild(addDiv);
                        }

                        exampleSkills.forEach(skillObj => {
                            const skill = skillObj.folder;
                            const displayName = skillObj.name;
                            const isImported = availableSkills.some(s => s.folder === skill);
                            const card = document.createElement('div');
                            card.className = 'skill-card';
                            
                            card.onclick = () => {
                                vscode.postMessage({ type: 'previewExampleSkill', skillName: skill });
                            };
                            
                            card.innerHTML = \`
                                <div class="skill-info">
                                    <span class="skill-name">\${displayName}</span>
                                    <span class="skill-status" style="background:var(--card-bg);color:var(--text-secondary);border:1px solid var(--inactive-color);">\${isImported ? 'IMPORTED' : 'TEMPLATE'}</span>
                                </div>
                                <div style="margin-top: 8px; color: var(--text-secondary); font-size: 11px;">
                                    Click to view SKILL.md rules 
                                </div>
                                <div class="skill-actions" style="margin-top:12px;">
                                    \${!isImported ? \`<button class="action-btn" onclick="event.stopPropagation(); vscode.postMessage({ type: 'importExamples', skillName: '\${skill}' })">Import</button>\` : \`<button class="action-btn" disabled style="opacity:0.5;cursor:default;">Already Imported</button>\`}
                                </div>
                            \`;
                            exampleList.appendChild(card);
                        });
                    }

                    function showScanResult(result) {
                        document.getElementById('scan-skill-name').innerText = "🛡️ " + result.skillName;
                        const badge = document.getElementById('severity-badge');
                        badge.innerText = result.severity;
                        badge.className = 'severity-badge sev-' + result.severity;

                        const structuralStatus = document.getElementById('structural-status');
                        const errorList = document.getElementById('structural-errors');
                        errorList.innerHTML = '';
                        
                        if (result.structural.valid) {
                            structuralStatus.innerText = "✅ All structural rules satisfied.";
                            structuralStatus.style.color = "var(--success)";
                        } else {
                            structuralStatus.innerText = "❌ Validation failed:";
                            structuralStatus.style.color = "var(--error)";
                            result.structural.errors.forEach(err => {
                                const li = document.createElement('li');
                                li.innerText = err;
                                errorList.appendChild(li);
                            });
                        }

                        document.getElementById('security-summary').innerText = result.security.summary;
                        scanOverlay.style.display = 'block';
                    }

                    toggleBtn.onclick = () => vscode.postMessage({ type: 'toggle' });
                    vscode.postMessage({ type: 'requestUpdate' });
                </script>
            </body>
            </html>
        `;
    }
}

module.exports = {
    SkillMonitorWebviewProvider
};
