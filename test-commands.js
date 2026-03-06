const vscode = require('vscode');
vscode.commands.getCommands().then(cmds => {
    console.log(cmds.filter(c => c.toLowerCase().includes('anti') || c.toLowerCase().includes('gemini') || c.toLowerCase().includes('model')));
});
