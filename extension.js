const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let panel;

class DesmosDataProvider {
  getTreeItem(element) { return element; }
  getChildren() {
    return [
      { label: "Open Desmos", command: { command: "extension.openDesmos" } },
      { label: "Export JSON", command: { command: "extension.exportJson" } },
      { label: "Import JSON", command: { command: "extension.importJson" } }
    ];
  }
}

function activate(context) {
  vscode.window.registerTreeDataProvider("desmosCalcView", new DesmosDataProvider());

  let disposableOpen = vscode.commands.registerCommand("extension.openDesmos", () => {
    panel = vscode.window.createWebviewPanel(
      "desmosCalcView",
      "Desmos Calculator",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const webviewUri = vscode.Uri.file(path.join(__dirname, "webview.html"));
    panel.webview.html = fs.readFileSync(webviewUri.fsPath, "utf8");

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "calcState") {
        const saveUri = await vscode.window.showSaveDialog({ filters: { JSON: ["json"] } });
        if (saveUri) {
          fs.writeFileSync(saveUri.fsPath, JSON.stringify(message.data, null, 2));
          vscode.window.showInformationMessage("State exported");
        }
      }
    });
  });

  let disposableExport = vscode.commands.registerCommand("extension.exportJson", () => {
    if (panel) {
      panel.webview.postMessage({ command: "export" });
    }
  });

  let disposableImport = vscode.commands.registerCommand("extension.importJson", async () => {
    if (!panel) return;
    const files = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { JSON: ["json"] } });
    if (files && files.length > 0) {
      const fileContent = fs.readFileSync(files[0].fsPath, "utf8");
      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch {
        vscode.window.showErrorMessage("Invalid JSON file");
        return;
      }
      panel.webview.postMessage({ command: "import", data: jsonData });
      vscode.window.showInformationMessage("State imported");
    }
  });

  context.subscriptions.push(disposableOpen, disposableExport, disposableImport);
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;