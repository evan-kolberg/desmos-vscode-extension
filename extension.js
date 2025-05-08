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
    const unsavedData = this.context.workspaceState.get('unsavedData', []);
    const recentFiles = this.context.workspaceState.get('recentFiles', []);
    return [
      {
        label: "Open Desmos (v1.10.1)",
        command: { command: "extension.openDesmos" },
        tooltip: "Open an offline, local version of Desmos",
        icon: new vscode.ThemeIcon("add")
      },
      {
        label: "Export Data",
        command: { command: "extension.exportJson" },
        tooltip: "Export all current data from the calculator",
        icon: new vscode.ThemeIcon("save-as")
      },
      {
        label: "Import Data",
        command: { command: "extension.importJson" },
        tooltip: "Import data into the calculator",
        icon: new vscode.ThemeIcon("new-file")
      },
      {
        label: "Clear Recovery Items",
        command: { command: "extension.clearUnsavedData" },
        tooltip: "Clear all unsaved recovery items",
        icon: new vscode.ThemeIcon("trash")
      },
      ...unsavedData.map(item => ({
        label: `Unsaved: ${item}`,
        command: { command: "extension.recoverData", arguments: [item] },
        tooltip: "Recover unsaved data",
        icon: new vscode.ThemeIcon("close-dirty")
      })),
    ];
  }
}

function openDesmosLocal(restoredState, extensionUri, dataProvider) {
  const desmosUri = vscode.Uri.joinPath(extensionUri, 'desmos.js');
  openDesmos({
    viewType: 'desmosCalcView',
    title: 'Desmos Calculator',
    script: desmosUri,
    restoredState,
    extensionUri,
    onRestore: (state, uri) => openDesmosLocal(state, uri, dataProvider),
    onUnsaved: (discardedState) => {
      const ws = dataProvider.context.workspaceState;
      const state = JSON.stringify(discardedState);
      const unsavedData = ws.get('unsavedData', []);
      unsavedData.push(state);
      ws.update('unsavedData', unsavedData);
      dataProvider.refresh();
    }
  });
}

function activate(context) {
  const dataProvider = new DesmosDataProvider(context);
  vscode.window.registerTreeDataProvider("desmosCalcView", dataProvider);
  dataProvider.refresh();

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openDesmos", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider);
    }),
    vscode.commands.registerCommand("extension.exportJson", () => {
      const panel = getPanel();
      if (!panel) {
        vscode.window.showErrorMessage("No active panel available");
        return;
      }
      if (panel) {
        panel.webview.postMessage({ command: "export" });
      }
      dataProvider.refresh();
    }),
    vscode.commands.registerCommand("extension.importJson", async () => {
      let panel = getPanel();
      if (!panel) {
        openDesmosLocal(null, context.extensionUri, dataProvider);
        panel = getPanel();
      }
      if (!panel) {
        vscode.window.showErrorMessage("Failed to open a new panel for importing");
        return;
      }
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
        setTempImport(panel, jsonData);
        panel.webview.postMessage({ command: "import", data: jsonData });
        vscode.window.showInformationMessage("Data imported into the active panel");
      }
    }),
    vscode.commands.registerCommand("extension.recoverData", (item) => {
      const state = JSON.parse(item);
      openDesmosLocal(state, context.extensionUri, dataProvider);
      const ws = context.workspaceState;
      const existing = ws.get('unsavedData', []);
      ws.update('unsavedData', existing.filter(x => x !== item));
      dataProvider.refresh();
    }),
    vscode.commands.registerCommand("extension.clearUnsavedData", () => {
      context.workspaceState.update('unsavedData', []);
      dataProvider.refresh();
      vscode.window.showInformationMessage("All unsaved recovery items cleared");
    })
  );
}

exports.activate = activate;
exports.deactivate = () => {};