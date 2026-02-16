const vscode = require('vscode');
const fs = require('fs');
const { openDesmos, getPanel, setTempImport } = require('./panelManager');

let usePrerelease = false;

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
    treeItem.description = element.description;
    if (element.children) treeItem.collapsibleState = element.collapsibleState;
    return treeItem;
  }

  getChildren(element) {
    const unsavedData = this.context.workspaceState.get('unsavedData', []);
    if (element && element.children) {
      return element.children;
    }
    const versionLabel = usePrerelease ? 'v1.12-prerelease' : 'v1.11.4';
    return [
      {
        label: "Graphing Calculator",
        command: { command: "extension.openDesmos" },
        tooltip: `Open the Graphing Calculator (${versionLabel})`,
        icon: new vscode.ThemeIcon("graph-line", new vscode.ThemeColor("testing.iconPassed"))
      },
      {
        label: "3D Calculator",
        command: { command: "extension.openDesmos3D" },
        tooltip: `Open the 3D Calculator (${versionLabel})`,
        icon: new vscode.ThemeIcon("symbol-misc", new vscode.ThemeColor("terminal.ansiMagenta"))
      },
      {
        label: "Geometry Calculator",
        command: { command: "extension.openDesmosGeometry" },
        tooltip: `Open the Geometry Calculator (${versionLabel})`,
        icon: new vscode.ThemeIcon("compass", new vscode.ThemeColor("charts.purple"))
      },
      {
        label: "Scientific Calculator",
        command: { command: "extension.openDesmosScientific" },
        tooltip: `Open the Scientific Calculator (${versionLabel})`,
        icon: new vscode.ThemeIcon("beaker", new vscode.ThemeColor("terminal.ansiCyan"))
      },
      {
        label: "Four Function Calculator",
        command: { command: "extension.openDesmosFourFunction" },
        tooltip: `Open the Four Function Calculator (${versionLabel})`,
        icon: new vscode.ThemeIcon("symbol-numeric", new vscode.ThemeColor("terminal.ansiBlue"))
      },
      {
        label: usePrerelease ? "Prerelease (v1.12)" : "Stable (v1.11.4)",
        description: usePrerelease ? "ON" : "OFF",
        command: { command: "extension.togglePrerelease" },
        tooltip: usePrerelease ? "Using v1.12-prerelease – click to switch to stable" : "Using v1.11.4 stable – click to switch to prerelease",
        icon: new vscode.ThemeIcon(usePrerelease ? "pass-filled" : "circle-large-outline", new vscode.ThemeColor("charts.yellow"))
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

function openDesmosLocal(restoredState, extensionUri, dataProvider, calculatorType) {
  calculatorType = calculatorType || 'GraphingCalculator';
  const calcNames = {
    GraphingCalculator: 'Graphing',
    Calculator3D: '3D',
    ScientificCalculator: 'Scientific',
    FourFunctionCalculator: 'Four Function',
    Geometry: 'Geometry'
  };
  const file = usePrerelease ? 'desmos_1.12-prerelease.js' : 'desmos_1.11.4_stable.js';
  const version = usePrerelease ? 'prerelease' : 'stable';
  const versionLabel = usePrerelease ? 'v1.12-pre' : 'v1.11.4';
  const desmosUri = vscode.Uri.joinPath(extensionUri, 'lib', file);
  openDesmos({
    viewType: 'desmosCalcView',
    script: desmosUri,
    title: `${calcNames[calculatorType] || calculatorType} (${versionLabel})`,
    restoredState,
    calculatorType,
    onUnsaved: (discardedState, hasRecovery) => {
      updateRecovery(version, discardedState, hasRecovery, dataProvider, calculatorType);
    }
  });
}

function updateRecovery(version, discardedState, hasRecovery, dataProvider, calculatorType) {
  const ws = dataProvider.context.workspaceState;
  const timestamp = new Date().toISOString();
  const state = JSON.stringify({ version, data: discardedState, timestamp, calculatorType: calculatorType || 'GraphingCalculator' });
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
      openDesmosLocal(null, context.extensionUri, dataProvider, 'GraphingCalculator');
    }),
    vscode.commands.registerCommand("extension.openDesmos3D", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'Calculator3D');
    }),
    vscode.commands.registerCommand("extension.openDesmosScientific", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'ScientificCalculator');
    }),
    vscode.commands.registerCommand("extension.openDesmosFourFunction", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'FourFunctionCalculator');
    }),
    vscode.commands.registerCommand("extension.openDesmosGeometry", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'Geometry');
    }),
    vscode.commands.registerCommand("extension.togglePrerelease", () => {
      usePrerelease = !usePrerelease;
      dataProvider.refresh();
      vscode.window.showInformationMessage(`Switched to ${usePrerelease ? 'v1.12-prerelease' : 'v1.11.4 stable'}`);
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
      const { version, data, timestamp, calculatorType } = parsedItem;
      if (version === 'prerelease') usePrerelease = true;
      openDesmosLocal(data, context.extensionUri, dataProvider, calculatorType || 'GraphingCalculator');
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
