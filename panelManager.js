const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const panels = new Map();

function getHtml(scriptUri, cmCssUri, themeCssUri, cmJsUri, jsModeUri) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" href="${cmCssUri}"/>
  <link rel="stylesheet" href="${themeCssUri}"/>
  <style>
    html, body { height: 100%; margin: 0; padding: 0; }
    #container { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
    #left { flex: 7 1 0; min-width: 200px; background: #fff; }
    #right { flex: 3 1 0; min-width: 200px; background: transparent; position: relative; display: flex; flex-direction: column; }
    #dragbar { width: 6px; background: #888; cursor: ew-resize; z-index: 10; }
    textarea#json-editor { display: none; }
    .CodeMirror { flex: 1; height: auto; background: transparent !important; }
    .CodeMirror-scroll { background: transparent !important; }
    .CodeMirror-gutters { background: transparent !important; border-right: none !important; }
    #apply-btn { position: absolute; bottom: 16px; right: 16px; background: #2d70b3; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; height: 32px; }
    #apply-btn:hover { background: #388c46; }
    #calculator { width: 100%; height: 100%; }
  </style>
  <script src="${cmJsUri}"></script>
  <script src="${jsModeUri}"></script>
</head>
<body>
  <div id="container">
    <div id="left"><div id="calculator"></div></div>
    <div id="dragbar"></div>
    <div id="right">
      <textarea id="json-editor" spellcheck="false"></textarea>
      <button id="apply-btn">Apply to Calculator</button>
    </div>
  </div>
  <script src="${scriptUri}"></script>
  <script>
    const vscode = acquireVsCodeApi();
    let Calc = null;
    window.addEventListener('DOMContentLoaded', () => {
      const ta = document.getElementById('json-editor');
      window.editor = CodeMirror.fromTextArea(ta, {
        mode: { name: 'javascript', json: true },
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true
      });
    });
    function updateJsonViewer(state) {
      const str = JSON.stringify(state, null, 2);
      if (window.editor) window.editor.setValue(str);
    }
    function tryInit() {
      if (!window.Desmos || !window.Desmos.GraphingCalculator) { setTimeout(tryInit, 300); return; }
      Calc = window.Calc || window.Desmos.GraphingCalculator(document.getElementById('calculator'));
      window.Calc = Calc;
      Calc.observeEvent('change', () => {
        const state = Calc.getState();
        updateJsonViewer(state);
        vscode.postMessage({ command: 'tempState', data: state });
      });
      setTimeout(() => updateJsonViewer(Calc.getState()), 500);
    }
    tryInit();
    const dragbar = document.getElementById('dragbar');
    let dragging = false;
    dragbar.onmousedown = () => { dragging = true; document.body.style.cursor='ew-resize'; };
    window.onmousemove = e => { if (dragging) { const pct = e.clientX/window.innerWidth; document.getElementById('left').style.flex = pct * 10; document.getElementById('right').style.flex = (1-pct) * 10; } };
    window.onmouseup = () => { dragging=false; document.body.style.cursor=''; };
    document.getElementById('apply-btn').onclick = () => {
      try {
        const val = window.editor ? window.editor.getValue() : document.getElementById('json-editor').value;
        const json = JSON.parse(val);
        if (Calc.setState) Calc.setState(json);
      } catch {
        alert('Invalid JSON');
      }
    };
    window.addEventListener('message', evt => {
      if (evt.data.command === 'import') Calc.setState(evt.data.data);
      else if (evt.data.command === 'export') vscode.postMessage({ command:'calcState', data:Calc.getState() });
      else if (evt.data.command === 'randomizeSeed') {
        const state=Calc.getState(), newSeed=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('');
        state.randomSeed=newSeed; Calc.setState(state); vscode.postMessage({command:'info',message:'Random seed updated.'});
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
  const cmCssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, 'codemirror.min.css'))).toString();
  const themeCssUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, 'dracula.min.css'))).toString();
  const cmJsUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, 'codemirror.min.js'))).toString();
  const jsModeUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(__dirname, 'javascript.min.js'))).toString();
  panel.webview.html = getHtml(scriptUri, cmCssUri, themeCssUri, cmJsUri, jsModeUri);

  const panelState = {
    tempState: null,
    jsonTemp: null,
    tempImport: null,
    justImported: false,
    hasRecovery: false,
    onUnsaved
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
      if (typeof panelState.onUnsaved === 'function') {
        panelState.onUnsaved(panelState.tempState, panelState.hasRecovery);
      }
      panelState.hasRecovery = true;
    } else if (msg.command === "import") {
      panelState.tempImport = msg.data;
      panelState.tempState = msg.data;
      panelState.justImported = true;
      panelState.hasRecovery = false;
    }
  });

  panel.onDidDispose(() => {
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
