const vscode = require('vscode');
const fs = require('fs');
const { openDesmos, getPanel, setTempImport } = require('./panelManager');

class DesmosDataProvider {
  constructor(context) {
    this.context = context;
    this._onDidChangeTreeData = new vscode.EventEmitter();
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  get onDidChangeTreeData() {
    return this._onDidChangeTreeData.event;
  }

  getTreeItem(element) {
    const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    treeItem.command = element.command;
    treeItem.tooltip = element.tooltip;
    treeItem.iconPath = element.icon;
    return treeItem;
  }

  getChildren() {
    const unsavedWork = this.context.workspaceState.get('unsavedWork', []);
    const recentFiles = this.context.workspaceState.get('recentFiles', []);
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
      ...unsavedWork.map(item => ({
        label: `Unsaved: ${item}`,
        command: { command: "extension.recoverWork", arguments: [item] },
        tooltip: "Recover unsaved work",
        icon: new vscode.ThemeIcon("warning")
      })),
      ...recentFiles.map(file => ({
        label: `Recent: ${file}`,
        tooltip: file,
        icon: new vscode.ThemeIcon("history")
      }))
    ];
  }
}

function openDesmosOffline(restoredState, extensionUri, dataProvider) {
  const desmosUri = vscode.Uri.joinPath(extensionUri, 'desmos.js');
  openDesmos({
    viewType: 'desmosCalcView',
    title: 'Desmos Calculator',
    script: desmosUri,
    restoredState,
    extensionUri,
    onRestore: (state, uri) => openDesmosOffline(state, uri, dataProvider),
    onUnsaved: (discardedState) => {
      const ws = dataProvider.context.workspaceState;
      const state = JSON.stringify(discardedState);
      const unsavedWork = ws.get('unsavedWork', []);
      unsavedWork.push(state);
      ws.update('unsavedWork', unsavedWork);
      dataProvider.refresh();
    }
  });
}

function openDesmosOnline(restoredState, extensionUri, dataProvider) {
  const api = "https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
  openDesmos({
    viewType: 'desmosOnlineCalcView',
    title: 'Desmos Calculator Online',
    script: api,
    restoredState,
    extensionUri,
    onRestore: (state, uri) => openDesmosOnline(state, uri, dataProvider),
    onUnsaved: (discardedState) => {
      const ws = dataProvider.context.workspaceState;
      const state = JSON.stringify(discardedState);
      const unsavedWork = ws.get('unsavedWork', []);
      unsavedWork.push(state);
      ws.update('unsavedWork', unsavedWork);
      dataProvider.refresh();
    }
  });
}

function activate(context) {
  const dataProvider = new DesmosDataProvider(context);
  vscode.window.registerTreeDataProvider("desmosCalcView", dataProvider);
  dataProvider.refresh();  // initial population

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openDesmosOffline", () => {
      openDesmosOffline(null, context.extensionUri, dataProvider);
    }),
    vscode.commands.registerCommand("extension.openDesmosOnline", () => {
      openDesmosOnline(null, context.extensionUri, dataProvider);
    }),
    vscode.commands.registerCommand("extension.exportJson", () => {
      const panel = getPanel();
      if (panel) {
        panel.webview.postMessage({ command: "export" });
      }
      context.workspaceState.update('unsavedWork', []);
      dataProvider.refresh();
    }),
    vscode.commands.registerCommand("extension.importJson", async () => {
      let panel = getPanel();
      if (!panel) {
        openDesmosOffline(null, context.extensionUri, dataProvider);
        panel = getPanel();
      }
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
        setTempImport(jsonData);
        vscode.window.showInformationMessage("Work imported");
      }
    }),
    vscode.commands.registerCommand("extension.recoverWork", (item) => {
      const state = JSON.parse(item);
      openDesmosOffline(state, context.extensionUri, dataProvider);
      const ws = context.workspaceState;
      const existing = ws.get('unsavedWork', []);
      ws.update('unsavedWork', existing.filter(x => x !== item));
      dataProvider.refresh();
    })
  );
}

exports.activate = activate;
exports.deactivate = () => {};