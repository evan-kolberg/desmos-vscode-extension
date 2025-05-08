const vscode = require('vscode');
const fs = require('fs');

let panel = null;
let tempState = null;
let jsonTemp = null;
let tempImport = null;
let justImported = false;
let isDialogActive = false;

function getHtml(scriptUri) {
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8"/>
	<style>
		html, body { margin:0; padding:0; width:100%; height:100%; }
		#calculator { width:100%; height:100%; box-sizing:border-box; }
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
			}
		});
	</script>
</body>
</html>`;
}

function openDesmos({ viewType, title, script, restoredState, extensionUri, onRestore, onUnsaved }) {
	panel = vscode.window.createWebviewPanel(
		viewType, title, vscode.ViewColumn.One,
		{ enableScripts: true, retainContextWhenHidden: true }
	);

	const scriptUri = script instanceof vscode.Uri
		? panel.webview.asWebviewUri(script).toString()
		: script;

	panel.webview.html = getHtml(scriptUri);

	panel.webview.onDidReceiveMessage(async msg => {
		if (msg.command === "calcState") {
			const saveUri = await vscode.window.showSaveDialog({ filters:{ JSON:["json"] } });
			if (saveUri) {
				fs.writeFileSync(saveUri.fsPath, JSON.stringify(msg.data,null,2));
				vscode.window.showInformationMessage("Work exported");
				jsonTemp = msg.data;
			}
		} 
		else if (msg.command === "tempState") {
			if (justImported && JSON.stringify(msg.data) !== JSON.stringify(tempImport)) {
				justImported = false;
			}
			tempState = msg.data;
		}
	});

	panel.onDidDispose(async () => {
		panel = null;
		
		if (justImported) {
			tempState = jsonTemp = tempImport = null;
			justImported = false;
			return;
		}

		if (
			tempState &&
			JSON.stringify(tempState) !== JSON.stringify(jsonTemp) &&
			JSON.stringify(tempState) !== JSON.stringify(tempImport)
		) {
			onUnsaved?.(tempState);
		}

		tempState = jsonTemp = tempImport = null;
		justImported = false;
	});

	if (restoredState) {
		panel.webview.postMessage({ command: "import", data: restoredState });
	}
}

function getPanel() {
	return panel;
}

function setTempImport(data) {
  tempImport   = data;
  tempState    = data;
  justImported = true;
}

module.exports = { openDesmos, getPanel, setTempImport };
