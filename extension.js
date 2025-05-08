const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let panel;
let tempState = null;

class DesmosDataProvider {
  getTreeItem(element) {
    const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    treeItem.command = element.command;
    treeItem.tooltip = element.tooltip;
    treeItem.iconPath = element.icon;
    return treeItem;
  }

  getChildren() {
    return [
      {
        label: "Open Desmos",
        command: { command: "extension.openDesmos", title: "Open Desmos" },
        tooltip: "Open the Desmos Calculator",
        icon: new vscode.ThemeIcon("add")
      },
      {
        label: "Export JSON",
        command: { command: "extension.exportJson", title: "Export JSON" },
        tooltip: "Export the current state as JSON",
        icon: new vscode.ThemeIcon("file-code")
      },
      {
        label: "Import JSON",
        command: { command: "extension.importJson", title: "Import JSON" },
        tooltip: "Import a JSON file into the calculator",
        icon: new vscode.ThemeIcon("cloud-upload")
      }
    ];
  }
}

function openDesmos(restoredState, extensionUri) {
  panel = vscode.window.createWebviewPanel(
    "desmosCalcView",
    "Desmos Calculator",
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const desmosUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'desmos.js')
  );

  const htmlPath = vscode.Uri.joinPath(extensionUri, 'webview.html');
  let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
  html = html.replace('DESMOS_LOCAL_URI', desmosUri);

  panel.webview.html = html;

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "calcState") {
      const saveUri = await vscode.window.showSaveDialog({ filters: { JSON: ["json"] } });
      if (saveUri) {
        fs.writeFileSync(saveUri.fsPath, JSON.stringify(message.data, null, 2));
        vscode.window.showInformationMessage("State exported");
      }
    }
    if (message.command === "tempState") {
      tempState = message.data;
    }
  });

  panel.onDidDispose(async () => {
    const answer = await vscode.window.showWarningMessage(
      "Are you sure you wanted to close this panel?",
      "NO! Go back now!","Yes, discard unsaved work"
    );
    if (answer === "NO! Go back now!") {
      openDesmos(tempState, extensionUri);
    } else {
      tempState = null;
    }
  });

  if (restoredState) {
    panel.webview.postMessage({ command: "import", data: restoredState });
  }
}

function activate(context) {
  vscode.window.registerTreeDataProvider("desmosCalcView", new DesmosDataProvider());

  let disposableOpen = vscode.commands.registerCommand("extension.openDesmos", () => {
    openDesmos(null, context.extensionUri);
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