const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { SkillScanner } = require('./scanner');
const { SkillMonitorWebviewProvider } = require('./webviewProvider');

/** @type {vscode.OutputChannel} */
let scannerOutputChannel;

/** @type {vscode.StatusBarItem} */
let myStatusBarItem;
let isMonitoring = true;
const scanner = new SkillScanner();

function activate(context) {
    console.log('Skill Monitor is now active!');

    // Create a status bar item
    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = 'skill-monitor.toggle';
    context.subscriptions.push(myStatusBarItem);

    // Create an output channel for the scanner
    scannerOutputChannel = vscode.window.createOutputChannel('Skill Scanner');
    context.subscriptions.push(scannerOutputChannel);

    // Initial update
    updateStatusBarItem();
    myStatusBarItem.show();

    // Register WebviewViewProvider
    const provider = new SkillMonitorWebviewProvider(context.extensionUri, () => isMonitoring);
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

    // Interaction: Scan Skill using Unified SkillScanner
    vscode.commands.registerCommand('skill-monitor.scanSkill', async (skillName) => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No active workspace folder.');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `💎 AI & Structural Scan: ${skillName}...`,
            cancellable: false
        }, async (progress) => {
            scannerOutputChannel.appendLine(`\n========== Skill Scanner: ${skillName} ==========`);
            scannerOutputChannel.show(true);

            try {
                const scanResult = await scanner.scan(skillName, rootPath);

                // Log to output channel
                scannerOutputChannel.appendLine(`Severity: ${scanResult.severity}`);
                if (!scanResult.structural.valid) {
                    scannerOutputChannel.appendLine(`Structural Errors: ${scanResult.structural.errors.join(', ')}`);
                }
                scannerOutputChannel.appendLine(`\n--- Security Summary ---\n${scanResult.security.summary}`);
                scannerOutputChannel.appendLine('\n[Scan Finished]');

                // Notify WebView
                provider.postMessage({ type: 'scanResult', scanResult });

                // Show basic notification
                if (scanResult.severity === 'CRITICAL' || scanResult.severity === 'HIGH') {
                    vscode.window.showWarningMessage(`Scan complete for ${skillName}. Severity: ${scanResult.severity}`, 'View Details').then(s => {
                        if (s === 'View Details') vscode.commands.executeCommand('skillMonitorWebView.focus');
                    });
                } else {
                    vscode.window.showInformationMessage(`Scan complete for ${skillName}. Severity: ${scanResult.severity}`);
                }

            } catch (err) {
                scannerOutputChannel.appendLine(`\n[Scan Failed] Error: ${err.message}`);
                vscode.window.showErrorMessage(`Skill scan failed: ${err.message}`);
            }
        });
    });

    // Interaction: Import Example Skills
    vscode.commands.registerCommand('skill-monitor.importExamples', async (skillName) => {
        if (!skillName || typeof skillName !== 'string') return;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No active workspace folder to import into.');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const targetDir = path.join(rootPath, '.agents', 'skills', skillName);
        const sourceDir = path.join(context.extensionPath, 'sample-skills', skillName);

        const targetDirUri = vscode.Uri.file(targetDir);
        const sourceDirUri = vscode.Uri.file(sourceDir);

        try {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            await vscode.workspace.fs.copy(sourceDirUri, targetDirUri, { overwrite: true });
            vscode.window.showInformationMessage(`Example skill '${skillName}' imported successfully!`);
            provider.updateState();
        } catch (err) {
            console.error(`Failed to import example skill '${skillName}':`, err);
            vscode.window.showErrorMessage(`Failed to import example skill '${skillName}': ${err.message}`);
        }
    });

    // Interaction: Preview Example Skill
    vscode.commands.registerCommand('skill-monitor.previewExampleSkill', async (skillName) => {
        if (!skillName || typeof skillName !== 'string') return;
        const skillPath = path.join(context.extensionPath, 'sample-skills', skillName, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
            const doc = await vscode.workspace.openTextDocument(skillPath);
            await vscode.window.showTextDocument(doc, { preview: true });
        } else {
            vscode.window.showErrorMessage(`SKILL.md not found for example skill '${skillName}'.`);
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

        const skillsWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(rootPath, '.agents/skills/*'));
        skillsWatcher.onDidCreate(() => provider.updateState());
        skillsWatcher.onDidDelete(() => provider.updateState());
        skillsWatcher.onDidChange(() => provider.updateState());

        context.subscriptions.push(watcher, skillsWatcher);
    }
}

function updateStatusBarItem() {
    if (!isMonitoring) {
        myStatusBarItem.text = `$(debug-pause) Monitor: OFF`;
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
