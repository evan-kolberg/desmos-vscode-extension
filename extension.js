const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let panel = null;
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
        label: "Open Desmos Offline (v1.10.1)",
        command: { command: "extension.openDesmosOffline" },
        tooltip: "Open an offline, local version of Desmos",
        icon: new vscode.ThemeIcon("add")
      },
      {
        label: "Open Desmos via API (v1.10.1)",
        command: { command: "extension.openDesmosOnline" },
        tooltip: "Request Desmos via the API",
        icon: new vscode.ThemeIcon("globe")
      },
      {
        label: "Export Work (.json)",
        command: { command: "extension.exportJson" },
        tooltip: "Export all current work in the calculator",
        icon: new vscode.ThemeIcon("file-code")
      },
      {
        label: "Import Work (.json)",
        command: { command: "extension.importJson" },
        tooltip: "Import work into the calculator",
        icon: new vscode.ThemeIcon("cloud-upload")
      },
    ];
  }
}

function createDesmosPanel(title, viewType, htmlContent, restoredState, extensionUri, onRestore) {
  panel = vscode.window.createWebviewPanel(
    viewType,
    title,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = htmlContent;

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "calcState") {
      const saveUri = await vscode.window.showSaveDialog({ filters: { JSON: ["json"] } });
      if (saveUri) {
        fs.writeFileSync(saveUri.fsPath, JSON.stringify(message.data, null, 2));
        vscode.window.showInformationMessage("Work exported");
      }
    } else if (message.command === "tempState") {
      tempState = message.data; // Always keep the latest state
    }
  });

  panel.onDidDispose(async () => {
    const answer = await vscode.window.showWarningMessage(
      "Are you sure you wanted to close Desmos?",
      "No! Go back now!", "Yes & discard any unsaved work"
    );
    if (answer === "No! Go back now!") {
      onRestore(tempState, extensionUri); // Restore the latest saved state
    } else {
      tempState = null;
    }
  });

  if (restoredState) {
    panel.webview.postMessage({ command: "import", data: restoredState });
  }
}

function getDesmosHtml(apiOrUri) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
      }
      #calculator {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>
    <div id="calculator"></div>
    <script src="${apiOrUri}"></script>
    <script>
      const vscode = acquireVsCodeApi();
      const Calc = Desmos.GraphingCalculator(document.getElementById('calculator'));
      Calc.observeEvent('change', () => {
        const state = Calc.getState();
        vscode.postMessage({ command: "tempState", data: state });
      });
      window.addEventListener("message", (event) => {
        if (event.data.command === "export") {
          const state = Calc.getState();
          vscode.postMessage({ command: "calcState", data: state });
        } else if (event.data.command === "import") {
          Calc.setState(event.data.data);
        }
      });
    </script>
  </body>
  </html>
  `;
}

function openDesmosOffline(restoredState, extensionUri) {
  const desmosUri = vscode.Uri.joinPath(extensionUri, 'desmos.js');

  // Create the panel first to access `panel.webview.asWebviewUri`
  panel = vscode.window.createWebviewPanel(
    "desmosCalcView",
    "Desmos Calculator",
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const webviewUri = panel.webview.asWebviewUri(desmosUri); // Convert to webview-compatible URI
  const htmlContent = getDesmosHtml(webviewUri.toString());

  panel.webview.html = htmlContent;

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "calcState") {
      const saveUri = await vscode.window.showSaveDialog({ filters: { JSON: ["json"] } });
      if (saveUri) {
        fs.writeFileSync(saveUri.fsPath, JSON.stringify(message.data, null, 2));
        vscode.window.showInformationMessage("Work exported");
      }
    } else if (message.command === "tempState") {
      tempState = message.data; // Always keep the latest state
    }
  });

  panel.onDidDispose(async () => {
    const answer = await vscode.window.showWarningMessage(
      "Are you sure you wanted to close Desmos?",
      "No! Go back now!", "Yes & discard any unsaved work"
    );
    if (answer === "No! Go back now!") {
      openDesmosOffline(tempState, extensionUri); // Restore the latest saved state
    } else {
      tempState = null;
    }
  });

  if (restoredState) {
    panel.webview.postMessage({ command: "import", data: restoredState });
  }
}

function openDesmosOnline(restoredState, extensionUri) {
  const onlineScriptAPI = "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
  const htmlContent = getDesmosHtml(onlineScriptAPI);
  createDesmosPanel(
    "Desmos Calculator Online",
    "desmosOnlineCalcView",
    htmlContent,
    restoredState,
    extensionUri,
    openDesmosOnline
  );
}

function activate(context) {
  vscode.window.registerTreeDataProvider("desmosCalcView", new DesmosDataProvider());

  const disposableOpen = vscode.commands.registerCommand("extension.openDesmosOffline", () => {
    openDesmosOffline(null, context.extensionUri);
  });

  const disposableExport = vscode.commands.registerCommand("extension.exportJson", () => {
    if (panel) {
      panel.webview.postMessage({ command: "export" });
    }
  });

  const disposableImport = vscode.commands.registerCommand("extension.importJson", async () => {
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
      vscode.window.showInformationMessage("Work imported");
    }
  });

  const disposableOpenOnline = vscode.commands.registerCommand("extension.openDesmosOnline", () => {
    openDesmosOnline(null, context.extensionUri);
  });

  context.subscriptions.push(disposableOpen, disposableExport, disposableImport, disposableOpenOnline);
}

exports.activate = activate;

function deactivate() {}

exports.deactivate = deactivate;