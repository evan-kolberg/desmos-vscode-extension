const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { openDesmos, getPanel, setTempImport } = require('./panelManager');
const liveshare = require('./liveshare');

let usePrerelease = true;

let lastLocalActivity = 0;
let pendingRemoteState = null;
let remoteApplyTimer = null;
const TYPING_COOLDOWN_MS = 1000;

function applyRemoteState(state) {
  const panel = getPanel();
  if (panel) {
    setTempImport(panel, state);
    panel.webview.postMessage({ command: 'import', data: state });
  }
}

const SYNC_FILES = {
  GraphingCalculator: 'graphing.desmos',
  Calculator3D: '3d.desmos',
  Geometry: 'geometry.desmos',
};

function sanitizeFilename(str) {
  return str.replace(/[:/\\|?*<>"]/g, '-').trim().slice(0, 60);
}

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

async function openDesmosLocal(restoredState, extensionUri, dataProvider, calculatorType, context, existingPanel, documentUri) {
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
  const jsonTheme = context ? context.globalState.get('jsonTheme', 'dracula') : 'dracula';
  const hasState = ['GraphingCalculator', 'Calculator3D', 'Geometry'].includes(calculatorType);

  const folders = vscode.workspace.workspaceFolders;
  const rootUri = folders?.[0]?.uri;

  let syncPath = null;
  let syncUri = null;
  let syncUriIsNew = false;
  let currentDraftPath = null;
  let draftNameFinalized = false;
  const timeStr = sanitizeFilename(new Date().toLocaleTimeString());

  if (documentUri) {
    if (documentUri.scheme === 'file') {
      syncPath = documentUri.fsPath;
    } else {
      syncUri = documentUri;
    }
  } else if (hasState && rootUri?.scheme === 'file') {
    currentDraftPath = path.join(rootUri.fsPath, timeStr + '.desmos');
  } else if (hasState && rootUri) {
    syncUri = vscode.Uri.joinPath(rootUri, timeStr + '.desmos');
    syncUriIsNew = true;
  }

  let lastKnownContent = null;
  if (!restoredState) {
    if (syncPath) {
      try {
        lastKnownContent = fs.readFileSync(syncPath, 'utf8');
        restoredState = JSON.parse(lastKnownContent);
      } catch {}
    } else if (syncUri) {
      try {
        const bytes = await vscode.workspace.fs.readFile(syncUri);
        lastKnownContent = Buffer.from(bytes).toString('utf8');
        restoredState = JSON.parse(lastKnownContent);
      } catch {}
    }
  }

  let writeTimer = null;

  openDesmos({
    viewType: 'desmosCalcView',
    script: desmosUri,
    title: `${calcNames[calculatorType] || calculatorType} (${versionLabel})`,
    restoredState,
    calculatorType,
    jsonTheme,
    existingPanel,
    onUnsaved: (discardedState, hasRecovery) => {
      lastLocalActivity = Date.now();
      if (pendingRemoteState) {
        clearTimeout(remoteApplyTimer);
        remoteApplyTimer = setTimeout(() => {
          if (pendingRemoteState) { applyRemoteState(pendingRemoteState); pendingRemoteState = null; }
        }, TYPING_COOLDOWN_MS);
      }
      updateRecovery(version, discardedState, hasRecovery, dataProvider, calculatorType);
      liveshare.broadcastState(discardedState, calculatorType);
      const writePath = syncPath || currentDraftPath;
      if (writePath || syncUri) {
        clearTimeout(writeTimer);
        writeTimer = setTimeout(async () => {
          if (currentDraftPath && !draftNameFinalized) {
            const firstExpr = discardedState.expressions?.list?.find(e => e.latex)?.latex || '';
            if (firstExpr.length >= 3) {
              const newName = sanitizeFilename(timeStr + ' – ' + firstExpr.slice(0, 30)) + '.desmos';
              const newPath = path.join(rootUri.fsPath, newName);
              if (newPath !== currentDraftPath) {
                try { if (fs.existsSync(currentDraftPath)) fs.renameSync(currentDraftPath, newPath); } catch {}
                currentDraftPath = newPath;
              }
              draftNameFinalized = true;
            }
          } else if (syncUri && syncUriIsNew && !draftNameFinalized) {
            const firstExpr = discardedState.expressions?.list?.find(e => e.latex)?.latex || '';
            if (firstExpr.length >= 3) {
              const newName = sanitizeFilename(timeStr + ' – ' + firstExpr.slice(0, 30)) + '.desmos';
              const newUri = vscode.Uri.joinPath(rootUri, newName);
              try {
                const renameEdit = new vscode.WorkspaceEdit();
                renameEdit.renameFile(syncUri, newUri, { ignoreIfExists: true });
                const ok = await vscode.workspace.applyEdit(renameEdit);
                if (ok) syncUri = newUri;
              } catch {}
              draftNameFinalized = true;
            }
          }

          const content = JSON.stringify({ ...discardedState, _calculatorType: calculatorType }, null, 2);
          lastKnownContent = content;
          const wp = syncPath || currentDraftPath;
          if (wp) {
            fs.writeFile(wp, content, 'utf8', () => {});
          } else if (syncUri) {
            try {
              let doc;
              try {
                doc = await vscode.workspace.openTextDocument(syncUri);
              } catch {
                const createEdit = new vscode.WorkspaceEdit();
                createEdit.createFile(syncUri, { ignoreIfExists: true });
                await vscode.workspace.applyEdit(createEdit);
                doc = await vscode.workspace.openTextDocument(syncUri);
              }
              const edit = new vscode.WorkspaceEdit();
              edit.replace(syncUri, new vscode.Range(
                doc.positionAt(0),
                doc.positionAt(doc.getText().length)
              ), content);
              await vscode.workspace.applyEdit(edit);
              await doc.save();
            } catch {}
          }
        }, 150);
      }
    },
    onSave: (savedFsPath) => {
      if (currentDraftPath && currentDraftPath !== savedFsPath) {
        try { if (fs.existsSync(currentDraftPath)) fs.unlinkSync(currentDraftPath); } catch {}
      }
      currentDraftPath = null;
    },
    onThemeChange: (theme) => {
      if (context) context.globalState.update('jsonTheme', theme);
    }
  });

  if ((syncPath || currentDraftPath || syncUri) && context) {
    const checkForUpdate = async () => {
      if (Date.now() - lastLocalActivity < TYPING_COOLDOWN_MS) return;
      const currentReadPath = syncPath || currentDraftPath;
      if (!currentReadPath && !syncUri) return;
      let content;
      try {
        if (currentReadPath) {
          content = fs.readFileSync(currentReadPath, 'utf8');
        } else {
          const bytes = await vscode.workspace.fs.readFile(syncUri);
          content = Buffer.from(bytes).toString('utf8');
        }
      } catch { return; }
      if (content === lastKnownContent) return;
      lastKnownContent = content;
      let data;
      try { data = JSON.parse(content); } catch { return; }
      if (!data || !data.version) return;
      const panel = getPanel();
      if (panel) {
        setTempImport(panel, data);
        panel.webview.postMessage({ command: 'import', data });
      }
    };
    const pollInterval = setInterval(checkForUpdate, 400);
    context.subscriptions.push({ dispose: () => clearInterval(pollInterval) });
  }
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

class DesmosFileEditorProvider {
  constructor(context, dataProvider) {
    this._context = context;
    this._dataProvider = dataProvider;
  }

  resolveCustomTextEditor(document, webviewPanel, _token) {
    let restoredState = null;
    try { restoredState = JSON.parse(document.getText()); } catch {}
    const filename = path.basename(document.uri.fsPath);
    const calcType = restoredState?._calculatorType
      || Object.entries(SYNC_FILES).find(([, f]) => f === filename)?.[0]
      || 'GraphingCalculator';
    openDesmosLocal(restoredState, this._context.extensionUri, this._dataProvider, calcType, this._context, webviewPanel, document.uri);
  }
}

function activate(context) {
  const dataProvider = new DesmosDataProvider(context);
  vscode.window.registerTreeDataProvider("desmosCalcView", dataProvider);
  dataProvider.refresh();

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'desmos.calculator',
      new DesmosFileEditorProvider(context, dataProvider),
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  const liveShareBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(liveShareBar);

  function updateLiveShareBar() {
    if (liveshare.isActive()) {
      const role = liveshare.getSessionRole();
      liveShareBar.text = '$(broadcast) Desmos: Live';
      liveShareBar.tooltip = `Desmos Live Share active (${role})`;
      liveShareBar.show();
    } else {
      liveShareBar.hide();
    }
  }

  liveshare.initialize(context, () => {
    updateLiveShareBar();
    dataProvider.refresh();
  }, (state, _calculatorType) => {
    if (Date.now() - lastLocalActivity < TYPING_COOLDOWN_MS) {
      pendingRemoteState = state;
      clearTimeout(remoteApplyTimer);
      remoteApplyTimer = setTimeout(() => {
        if (pendingRemoteState) { applyRemoteState(pendingRemoteState); pendingRemoteState = null; }
      }, TYPING_COOLDOWN_MS);
    } else {
      applyRemoteState(state);
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openDesmos", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'GraphingCalculator', context);
    }),
    vscode.commands.registerCommand("extension.openDesmos3D", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'Calculator3D', context);
    }),
    vscode.commands.registerCommand("extension.openDesmosScientific", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'ScientificCalculator', context);
    }),
    vscode.commands.registerCommand("extension.openDesmosFourFunction", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'FourFunctionCalculator', context);
    }),
    vscode.commands.registerCommand("extension.openDesmosGeometry", () => {
      openDesmosLocal(null, context.extensionUri, dataProvider, 'Geometry', context);
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
    vscode.commands.registerCommand("extension.recoverData", (item) => {
      const parsedItem = JSON.parse(item);
      const { version, data, timestamp, calculatorType } = parsedItem;
      if (version === 'prerelease') usePrerelease = true;
      openDesmosLocal(data, context.extensionUri, dataProvider, calculatorType || 'GraphingCalculator', context);
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
