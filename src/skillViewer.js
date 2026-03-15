const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/** @type {Map<string, vscode.WebviewPanel>} */
const openPanels = new Map();

/**
 * Open the dual-mode skill viewer panel.
 * @param {vscode.ExtensionContext} context
 * @param {string} skillName  folder name
 * @param {string} skillMdPath  absolute path to SKILL.md
 */
function openSkillViewer(context, skillName, skillMdPath) {
    // Reuse existing panel if already open
    if (openPanels.has(skillName)) {
        openPanels.get(skillName).reveal(vscode.ViewColumn.One);
        return;
    }

    const content = fs.existsSync(skillMdPath)
        ? fs.readFileSync(skillMdPath, 'utf8')
        : '';

    const panel = vscode.window.createWebviewPanel(
        'skillViewer',
        `⚡ ${skillName}`,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    panel.webview.html = buildViewerHtml(skillName, content);

    panel.webview.onDidReceiveMessage(msg => {
        switch (msg.type) {
            case 'save':
                try {
                    fs.writeFileSync(skillMdPath, msg.content, 'utf8');
                    vscode.window.showInformationMessage(`✅ Skill "${skillName}" saved.`);
                    panel.webview.postMessage({ type: 'saved' });
                } catch (err) {
                    vscode.window.showErrorMessage(`Failed to save: ${err.message}`);
                }
                break;
            case 'openInEditor':
                vscode.workspace.openTextDocument(skillMdPath).then(doc =>
                    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                );
                break;
            case 'requestRender':
                vscode.commands.executeCommand('markdown.api.render', msg.content)
                    .then(html => panel.webview.postMessage({ type: 'renderResult', html }))
                    .catch(err => panel.webview.postMessage({ type: 'renderResult', error: err.message }));
                break;
            case 'renderError': {
                vscode.window.showWarningMessage(`⚠️ Skill render failed: ${msg.message}`);
                break;
            }
        }
    });

    panel.onDidDispose(() => {
        openPanels.delete(skillName);
    });

    openPanels.set(skillName, panel);
}

/**
 * Build the full HTML for the viewer panel.
 */
function buildViewerHtml(skillName, content) {
    const escaped = escapeHtml(content);
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(skillName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-editor-foreground);
    background: var(--vscode-editor-background);
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--vscode-titleBar-activeBackground, #1e1e1e);
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    flex-shrink: 0;
  }
  .header h2 {
    font-size: 14px;
    font-weight: 600;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Tab Bar ── */
  .tab-bar {
    display: flex;
    gap: 4px;
    padding: 8px 16px 0;
    background: var(--vscode-editorGroupHeader-tabsBackground, #252526);
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    flex-shrink: 0;
  }
  .tab {
    padding: 6px 16px;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-tab-inactiveForeground, #999);
    background: transparent;
    border: 1px solid transparent;
    border-bottom: none;
    transition: all 0.15s;
    user-select: none;
  }
  .tab:hover { color: var(--vscode-tab-activeForeground, #ccc); }
  .tab.active {
    color: var(--vscode-tab-activeForeground, #fff);
    background: var(--vscode-editor-background);
    border-color: var(--vscode-panel-border, #333);
    border-bottom-color: var(--vscode-editor-background);
    margin-bottom: -1px;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    background: var(--vscode-editorWidget-background, #1e1e1e);
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    flex-shrink: 0;
    min-height: 36px;
  }
  .btn {
    padding: 4px 12px;
    border-radius: 3px;
    border: 1px solid var(--vscode-button-border, transparent);
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: opacity 0.15s;
  }
  .btn-primary {
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
  }
  .btn-primary:hover { opacity: 0.85; }
  .btn-secondary {
    background: var(--vscode-button-secondaryBackground, #3a3d41);
    color: var(--vscode-button-secondaryForeground, #ccc);
  }
  .btn-secondary:hover { opacity: 0.85; }
  .save-indicator {
    font-size: 11px;
    color: var(--vscode-notificationsInfoIcon-foreground, #75beff);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .save-indicator.show { opacity: 1; }

  /* ── Content Panels ── */
  .panel { flex: 1; overflow: hidden; display: none; }
  .panel.active { display: flex; flex-direction: column; }

  /* Edit panel */
  #edit-panel { padding: 0; }
  #editor {
    flex: 1;
    width: 100%;
    resize: none;
    border: none;
    outline: none;
    padding: 16px;
    font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
    font-size: var(--vscode-editor-font-size, 13px);
    line-height: 1.6;
    color: var(--vscode-editor-foreground);
    background: var(--vscode-editor-background);
    tab-size: 2;
  }

  /* Render panel */
  #render-panel { overflow-y: auto; padding: 24px 32px; }
  #render-output {
    max-width: 780px;
    line-height: 1.7;
  }

  /* Markdown rendered styles */
  #render-output h1 { font-size: 1.8em; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--vscode-panel-border, #333); }
  #render-output h2 { font-size: 1.4em; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--vscode-panel-border, #333); }
  #render-output h3 { font-size: 1.15em; margin: 20px 0 8px; }
  #render-output h4 { font-size: 1em; margin: 16px 0 6px; }
  #render-output p { margin: 0 0 12px; }
  #render-output ul, #render-output ol { margin: 0 0 12px 24px; }
  #render-output li { margin: 4px 0; }
  #render-output code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 0.9em;
    padding: 2px 5px;
    border-radius: 3px;
    background: var(--vscode-textCodeBlock-background, #1e1e1e);
  }
  #render-output pre {
    background: var(--vscode-textCodeBlock-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, #333);
    border-radius: 4px;
    padding: 12px 16px;
    overflow-x: auto;
    margin: 0 0 16px;
  }
  #render-output pre code {
    background: none;
    padding: 0;
    font-size: 0.88em;
  }
  #render-output blockquote {
    border-left: 3px solid var(--vscode-activityBarBadge-background, #0e639c);
    margin: 0 0 12px;
    padding: 4px 12px;
    color: var(--vscode-descriptionForeground, #aaa);
  }
  #render-output hr { border: none; border-top: 1px solid var(--vscode-panel-border, #444); margin: 16px 0; }
  #render-output table { border-collapse: collapse; width: 100%; margin: 0 0 16px; }
  #render-output th, #render-output td {
    border: 1px solid var(--vscode-panel-border, #444);
    padding: 6px 10px;
    text-align: left;
  }
  #render-output th { background: var(--vscode-editorWidget-background, #252526); font-weight: 600; }
  #render-output strong { font-weight: 700; }
  #render-output em { font-style: italic; }
  /* Syntax highlighting — highlight.js Dark+ tokens */
  .hljs-keyword, .hljs-selector-tag, .hljs-deletion   { color: #569cd6; }
  .hljs-string,  .hljs-attr, .hljs-addition            { color: #ce9178; }
  .hljs-comment, .hljs-quote                           { color: #6a9955; font-style: italic; }
  .hljs-number,  .hljs-literal                         { color: #b5cea8; }
  .hljs-type,    .hljs-class .hljs-title               { color: #4ec9b0; }
  .hljs-built_in, .hljs-builtin-name                   { color: #dcdcaa; }
  .hljs-title,   .hljs-function .hljs-title            { color: #dcdcaa; }
  .hljs-variable, .hljs-name, .hljs-params             { color: #9cdcfe; }
  .hljs-meta                                           { color: #9b9b9b; }
  .hljs-section                                        { color: #569cd6; font-weight: 700; }
  /* Rendering indicator */
  .rendering-msg { color: var(--vscode-descriptionForeground, #aaa); font-style: italic; }
  /* Render error block */
  .render-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 4px;
    border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
    background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
    color: var(--vscode-errorForeground, #f48771);
    font-size: 13px;
  }
  .render-error-icon { font-size: 18px; flex-shrink: 0; }
  .render-error strong { display: block; margin-bottom: 4px; }
  .render-error-msg {
    display: block;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 0.85em;
    color: var(--vscode-descriptionForeground, #aaa);
    white-space: pre-wrap;
    word-break: break-all;
    margin-top: 4px;
  }
  .render-error-source {
    margin-top: 8px;
    font-size: 0.82em;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .render-error-source-label {
    color: var(--vscode-descriptionForeground, #aaa);
    flex-shrink: 0;
  }
  .render-error-source code {
    background: rgba(0,0,0,0.3);
    padding: 2px 6px;
    border-radius: 3px;
    word-break: break-all;
  }

  /* Frontmatter block */
  .frontmatter-block {
    background: var(--vscode-textCodeBlock-background, #1e1e1e);
    border: 1px solid var(--vscode-panel-border, #444);
    border-radius: 4px;
    padding: 10px 14px;
    margin-bottom: 20px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 0.85em;
    color: var(--vscode-descriptionForeground, #aaa);
  }
  .frontmatter-block .fm-title {
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
    color: var(--vscode-activityBarBadge-background, #75beff);
  }
</style>
</head>
<body>

<div class="header">
  <span>⚡</span>
  <h2>${escapeHtml(skillName)}</h2>
</div>

<div class="tab-bar">
  <div class="tab" id="tab-edit" onclick="switchTab('edit')">✏️ Edit</div>
  <div class="tab active" id="tab-render" onclick="switchTab('render')">👁️ Render</div>
</div>

<div class="toolbar" id="edit-toolbar" style="display:none;">
  <button class="btn btn-primary" onclick="saveContent()">💾 Save</button>
  <button class="btn btn-secondary" onclick="openInEditor()">↗ Open in Editor</button>
  <span class="save-indicator" id="save-indicator">Saved!</span>
</div>
<div class="toolbar" id="render-toolbar">
  <button class="btn btn-secondary" onclick="switchTab('edit')">✏️ Edit</button>
  <span style="font-size:11px; color:var(--vscode-descriptionForeground);">Read-only rendered view</span>
</div>

<div class="panel" id="edit-panel">
  <textarea id="editor" spellcheck="false">${escaped}</textarea>
</div>

<div class="panel active" id="render-panel">
  <div id="render-output"></div>
</div>

<script>
const vscode = acquireVsCodeApi();
let currentTab = 'render';
const editor = document.getElementById('editor');

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showRenderError(message) {
  document.getElementById('render-output').innerHTML = \`<div class="render-error">
    <span class="render-error-icon">⚠️</span>
    <div>
      <strong>Render failed</strong>
      <span class="render-error-msg">\${escHtml(message)}</span>
    </div>
  </div>\`;
  vscode.postMessage({ type: 'renderError', message });
}

function safeRender() {
  document.getElementById('render-output').innerHTML = '<span class="rendering-msg">Rendering…</span>';
  vscode.postMessage({ type: 'requestRender', content: editor.value });
}

// Render on load
safeRender();

function switchTab(tab) {
  currentTab = tab;

  document.getElementById('tab-edit').classList.toggle('active', tab === 'edit');
  document.getElementById('tab-render').classList.toggle('active', tab === 'render');
  document.getElementById('edit-panel').classList.toggle('active', tab === 'edit');
  document.getElementById('render-panel').classList.toggle('active', tab === 'render');
  document.getElementById('edit-toolbar').style.display = tab === 'edit' ? 'flex' : 'none';
  document.getElementById('render-toolbar').style.display = tab === 'render' ? 'flex' : 'none';

  if (tab === 'render') {
    safeRender();
  }
}

function saveContent() {
  vscode.postMessage({ type: 'save', content: editor.value });
}

function openInEditor() {
  vscode.postMessage({ type: 'openInEditor' });
}

// Keyboard shortcut: Cmd/Ctrl+S to save
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    saveContent();
  }
});

window.addEventListener('message', e => {
  const msg = e.data;
  if (msg.type === 'saved') {
    const ind = document.getElementById('save-indicator');
    ind.classList.add('show');
    setTimeout(() => ind.classList.remove('show'), 2000);
  }
  if (msg.type === 'renderResult') {
    if (msg.error) {
      showRenderError(msg.error);
    } else {
      document.getElementById('render-output').innerHTML = msg.html;
    }
  }
});

</script>
</body>
</html>`;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = { openSkillViewer };
