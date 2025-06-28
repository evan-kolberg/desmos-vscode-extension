const vscode = require('vscode');
const fs = require('fs');

const panels = new Map();

function getHtml(scriptUri) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    #calculator { width: 100%; height: 100%; box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="calculator"></div>
  <script src="${scriptUri}"></script>
  <script>
    const vscode = acquireVsCodeApi();
    const Calc = Desmos.GraphingCalculator(document.getElementById('calculator'));
    Calc.observeEvent('change', () => {
      vscode.postMessage({ command: "tempState", data: Calc.getState() });
    });
    window.addEventListener("message", evt => {
      if (evt.data.command === "export") {
        vscode.postMessage({ command: "calcState", data: Calc.getState() });
      } else if (evt.data.command === "import") {
        Calc.setState(evt.data.data);
      } else if (evt.data.command === "randomizeSeed") {
        const state = Calc.getState();
        const newSeed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        state.randomSeed = newSeed;
        Calc.setState(state);
        vscode.postMessage({ command: "info", message: "Random seed updated." });
      }
    });
  </script>
</body>
</html>`;
}

function openDesmos({ viewType, script, title, restoredState, onUnsaved }) {
  const panel = vscode.window.createWebviewPanel(
    viewType, title, vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  const scriptUri = script instanceof vscode.Uri
    ? panel.webview.asWebviewUri(script).toString()
    : script;

  panel.webview.html = getHtml(scriptUri);

  const panelState = {
    tempState: null,
    jsonTemp: null,
    tempImport: null,
    justImported: false
  };
  panels.set(panel, panelState);

  panel.webview.onDidReceiveMessage(async msg => {
    if (msg.command === "calcState") {
      const saveUri = await vscode.window.showSaveDialog({ filters: { JSON: ["json"] } });
      if (saveUri) {
        fs.writeFileSync(saveUri.fsPath, JSON.stringify(msg.data, null, 2));
        vscode.window.showInformationMessage("Data exported");
        panelState.jsonTemp = msg.data;
      }
    } else if (msg.command === "tempState") {
      if (panelState.justImported) {
        panelState.justImported = false;
        return;
      }
      panelState.tempState = msg.data;
    } else if (msg.command === "import") {
      panelState.tempImport = msg.data;
      panelState.tempState = msg.data;
      panelState.justImported = true;
    }
  });

  panel.onDidDispose(() => {
    if (
      panelState.tempState &&
      JSON.stringify(panelState.tempState) !== JSON.stringify(panelState.jsonTemp) &&
      JSON.stringify(panelState.tempState) !== JSON.stringify(panelState.tempImport)
    ) {
      onUnsaved?.(panelState.tempState);
    }
    panels.delete(panel);
  });

  if (restoredState) {
    panel.webview.postMessage({ command: "import", data: restoredState });
  }
}

function getPanel() {
  for (const [panel] of panels) {
    if (panel.visible) {
      return panel;
    }
  }
  return null;
}

function setTempImport(panel, data) {
  const panelState = panels.get(panel);
  if (panelState) {
    panelState.tempImport = data;
    panelState.tempState = data;
    panelState.justImported = true;
  }
}

module.exports = { openDesmos, getPanel, setTempImport };
