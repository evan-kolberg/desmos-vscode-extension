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
        command: { command: "extension.openDesmosOffline", title: "Open Desmos from Offline" },
        tooltip: "Open an offline & local version of Desmos",
        icon: new vscode.ThemeIcon("add")
      },
      {
        label: "Open via API (v1.10.1)",
        command: { command: "extension.openDesmosOnline", title: "Open Desmos from Online" },
        tooltip: "Request Desmos via the API",
        icon: new vscode.ThemeIcon("globe")
      },
      {
        label: "Export Work (.json)",
        command: { command: "extension.exportJson", title: "Export JSON" },
        tooltip: "Export all current work in the calculator",
        icon: new vscode.ThemeIcon("file-code")
      },
      {
        label: "Import Work (.json)",
        command: { command: "extension.importJson", title: "Import JSON" },
        tooltip: "Import work into the calculator",
        icon: new vscode.ThemeIcon("cloud-upload")
      },
    ];
  }
}

function openDesmosOffline(restoredState, extensionUri) {
  panel = vscode.window.createWebviewPanel(
    "desmosCalcView",
    "Desmos Calculator",
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const desmosUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'desmos.js')
  );

  const html = `
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
    <script src="${desmosUri}"></script>
    <script>
      const vscode = acquireVsCodeApi();
      const Calc = Desmos.GraphingCalculator(document.getElementById('calculator'));
      Calc.observeEvent('change', () => {
        vscode.postMessage({ command: "tempState", data: Calc.getState() });
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

  panel.webview.html = html;

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "calcState") {
      const saveUri = await vscode.window.showSaveDialog({ filters: { JSON: ["json"] } });
      if (saveUri) {
        fs.writeFileSync(saveUri.fsPath, JSON.stringify(message.data, null, 2));
        vscode.window.showInformationMessage("State exported");
      }
    } else if (message.command === "tempState") {
      tempState = message.data;
    }
  });

  panel.onDidDispose(async () => {
    const answer = await vscode.window.showWarningMessage(
      "Are you sure you wanted to close this panel?",
      "NO! Go back now!", "Yes, discard unsaved work"
    );
    if (answer === "NO! Go back now!") {
      openDesmosOffline(tempState, extensionUri);
    } else {
      tempState = null;
    }
  });

  if (restoredState) {
    panel.webview.postMessage({ command: "import", data: restoredState });
  }
}

function openDesmosOnline(restoredState, extensionUri) {
  panel = vscode.window.createWebviewPanel(
    "desmosOnlineCalcView",
    "Desmos Calculator Online",
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const onlineScriptAPI = "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

  const html = `
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
    <script src="${onlineScriptAPI}"></script>
    <script>
      const vscode = acquireVsCodeApi();
      const Calc = Desmos.GraphingCalculator(document.getElementById('calculator'));
      Calc.observeEvent('change', () => {
        vscode.postMessage({ command: "tempState", data: Calc.getState() });
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

  panel.webview.html = html;

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "calcState") {
      const saveUri = await vscode.window.showSaveDialog({ filters: { JSON: ["json"] } });
      if (saveUri) {
        fs.writeFileSync(saveUri.fsPath, JSON.stringify(message.data, null, 2));
        vscode.window.showInformationMessage("State exported");
      }
    } else if (message.command === "tempState") {
      tempState = message.data;
    }
  });

  panel.onDidDispose(async () => {
    const answer = await vscode.window.showWarningMessage(
      "Are you sure you wanted to close this panel?",
      "NO! Go back now!", "Yes, discard unsaved work"
    );
    if (answer === "NO! Go back now!") {
      openDesmosOnline(tempState, extensionUri);
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
      vscode.window.showInformationMessage("State imported");
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