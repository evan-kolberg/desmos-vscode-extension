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
    const treeItem = new vscode.TreeItem(element.label, element.collapsibleState ?? vscode.TreeItemCollapsibleState.None);
    treeItem.command = element.command;
    treeItem.tooltip = element.tooltip;
    treeItem.iconPath = element.icon;
    if (element.children) treeItem.collapsibleState = element.collapsibleState;
    return treeItem;
  }

  getChildren(element) {
    const unsavedData = this.context.workspaceState.get('unsavedData', []);
    if (element && element.children) {
      return element.children;
    }
    return [
      {
        label: "Open Desmos (v1.11.0)",
        command: { command: "extension.openDesmos" },
        tooltip: "Open a stable, offline, & local version of Desmos",
        icon: new vscode.ThemeIcon("add")
      },
      {
        label: "Open Desmos (v1.12-prerelease)",
        command: { command: "extension.openDesmosPrerelease" },
        tooltip: "Open the latest, offline, & local version of Desmos",
        icon: new vscode.ThemeIcon("add")
      },
      {
        label: "Open Online Desmos (Web)",
        command: { command: "extension.openOnlineDesmos" },
        tooltip: "Open the online version of Desmos",
        icon: new vscode.ThemeIcon("globe")
      },
      {
        label: "Randomize Seed",
        command: { command: "extension.randomizeSeed" },
        tooltip: "Randomize the calculator's random seed",
        icon: new vscode.ThemeIcon("refresh")
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
      {
        label: `Recovery Items (${unsavedData.length})`,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        icon: new vscode.ThemeIcon("close-dirty"),
        children: unsavedData.map(item => {
          let labelTime = 'Invalid date';
          let firstLatex = '';
          try {
            const parsed = JSON.parse(item);
            const dt = new Date(parsed.timestamp);
            labelTime = dt.toLocaleTimeString();
            if (parsed.data && parsed.data.expressions && Array.isArray(parsed.data.expressions.list) && parsed.data.expressions.list.length > 0) {
              firstLatex = parsed.data.expressions.list[0].latex || '';
            }
          } catch {}
          const displayLabel = firstLatex ? `${labelTime} – ${firstLatex}` : labelTime;
          return {
            label: displayLabel,
            command: { command: "extension.recoverData", arguments: [item] },
            tooltip: "Recover unsaved data",
            icon: new vscode.ThemeIcon("close-dirty")
          };
        })
      }
    ];
  }
}

function openDesmosLocal(restoredState, extensionUri, dataProvider) {
  const desmosUri = vscode.Uri.joinPath(extensionUri, 'desmos_1.11.0_stable.js');
  openDesmos({
    viewType: 'desmosCalcView',
    script: desmosUri,
    title: '1.11.0 (Stable)',
    restoredState,
    onUnsaved: (discardedState, hasRecovery) => {
      updateRecovery('stable', discardedState, hasRecovery, dataProvider);
    }
  });
}

function openDesmosLocalPrerelease(restoredState, extensionUri, dataProvider) {
  const desmosUri = vscode.Uri.joinPath(extensionUri, 'desmos_1.12-prerelease.js');
  openDesmos({
    viewType: 'desmosCalcView',
    script: desmosUri,
    title: '1.12-prerelease (Latest)',
    restoredState,
    onUnsaved: (discardedState, hasRecovery) => {
      updateRecovery('prerelease', discardedState, hasRecovery, dataProvider);
    }
  });
}

function updateRecovery(version, discardedState, hasRecovery, dataProvider) {
  const ws = dataProvider.context.workspaceState;
  const timestamp = new Date().toISOString();
  const state = JSON.stringify({ version, data: discardedState, timestamp });
  let unsavedData = ws.get('unsavedData', []);
  if (hasRecovery && unsavedData.length > 0) {
    unsavedData[0] = state;
  } else {
    unsavedData.unshift(state);
  }
  if (unsavedData.length > 1000) unsavedData = unsavedData.slice(0, 100);
  ws.update('unsavedData', unsavedData);
  dataProvider.refresh();
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openOnlineDesmos", () => {
      const panel = vscode.window.createWebviewPanel(
        'onlineDesmos',
        'Online Desmos (Web)',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );
      panel.webview.html = `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src https:; frame-src https://www.desmos.com https://*.desmos.com; child-src https://www.desmos.com https://*.desmos.com; script-src https: 'unsafe-inline'; style-src https: 'unsafe-inline';">
          <title>Online Desmos</title>
          <style>html,body{height:100%;margin:0;padding:0;}iframe{border:none;width:100vw;height:100vh;}</style>
        </head>
        <body>
          <div style="padding:8px;background:#fff;color:#333;font-size:13px;">Certain features (e.g., signing-in) may not work due to browser security restrictions. For full functionality, please use Desmos in your personal browser.</div>
          <iframe id="desmos-iframe" src="https://www.desmos.com/calculator" allow="clipboard-write; clipboard-read; fullscreen;" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"></iframe>
        </body>
        </html>`;
    })
  );
  const dataProvider = new DesmosDataProvider(context);
  vscode.window.registerTreeDataProvider("desmosCalcView", dataProvider);
  dataProvider.refresh();

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openDesmos", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider);
    }),
    vscode.commands.registerCommand("extension.openDesmosPrerelease", () => {
      openDesmosLocalPrerelease(null, context.extensionUri, dataProvider);
    }),
    vscode.commands.registerCommand("extension.randomizeSeed", () => {
      const panel = getPanel();
      if (!panel) {
        vscode.window.showErrorMessage("No active panel available");
        return;
      }
      panel.webview.postMessage({ command: "randomizeSeed" });
    }),
    vscode.commands.registerCommand("extension.exportJson", () => {
      const panel = getPanel();
      if (!panel) {
        vscode.window.showErrorMessage("No active panel available");
        return;
      }
      panel.webview.postMessage({ command: "export" });
      dataProvider.refresh();
    }),
    vscode.commands.registerCommand("extension.importJson", async () => {
      let panel = getPanel();
      if (!panel) {
        openDesmosLocal(null, context.extensionUri, dataProvider);
        panel = getPanel();
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
      const parsedItem = JSON.parse(item);
      const { version, data, timestamp } = parsedItem;
      if (version === 'stable') {
        openDesmosLocal(data, context.extensionUri, dataProvider);
      } else if (version === 'prerelease') {
        openDesmosLocalPrerelease(data, context.extensionUri, dataProvider);
      }
      const ws = context.workspaceState;
      const existing = ws.get('unsavedData', []);
      ws.update('unsavedData', existing.filter(x => x !== item));
      dataProvider.refresh();
      vscode.window.showInformationMessage(`Recovered data from ${timestamp}`);
    }),
    vscode.commands.registerCommand("extension.clearUnsavedData", () => {
      context.workspaceState.update('unsavedData', []);
      dataProvider.refresh();
      vscode.window.showInformationMessage("All recovery items cleared");
    })
  );
}

exports.activate = activate;
exports.deactivate = () => {};