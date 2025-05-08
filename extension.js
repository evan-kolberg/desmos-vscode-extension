const vscode = require('vscode');
const fs = require('fs');
const { openDesmos, getPanel } = require('./panelManager');

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

function openDesmosOffline(restoredState, extensionUri) {
  const desmosUri = vscode.Uri.joinPath(extensionUri, 'desmos.js');
  openDesmos({
    viewType: 'desmosCalcView',
    title: 'Desmos Calculator',
    script: desmosUri,
    restoredState,
    extensionUri,
    onRestore: openDesmosOffline
  });
}

function openDesmosOnline(restoredState, extensionUri) {
  const api = "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
  openDesmos({
    viewType: 'desmosOnlineCalcView',
    title: 'Desmos Calculator Online',
    script: api,
    restoredState,
    extensionUri,
    onRestore: openDesmosOnline
  });
}

function activate(context) {
  vscode.window.registerTreeDataProvider("desmosCalcView", new DesmosDataProvider());

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openDesmosOffline", () => {
      openDesmosOffline(null, context.extensionUri);
    }),
    vscode.commands.registerCommand("extension.openDesmosOnline", () => {
      openDesmosOnline(null, context.extensionUri);
    }),
    vscode.commands.registerCommand("extension.exportJson", () => {
      const panel = getPanel();
      if (panel) {
        panel.webview.postMessage({ command: "export" });
      }
    }),
    vscode.commands.registerCommand("extension.importJson", async () => {
      const panel = getPanel();
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
    })
  );
}

exports.activate = activate;
exports.deactivate = () => {};