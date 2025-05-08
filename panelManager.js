const vscode = require('vscode');
const fs = require('fs');

let panel = null;
let tempState = null;
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

function openDesmos({ viewType, title, script, restoredState, extensionUri, onRestore }) {
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
			}
		} 
		else if (msg.command === "tempState") {
			tempState = msg.data;
		}
	});

	panel.onDidDispose(async () => {
		if (isDialogActive) return;
		isDialogActive = true;
		const choice = await vscode.window.showWarningMessage(
			"Are you sure you wanted to close Desmos?",
			"No! Go back now!","Yes, discard any unsaved work"
		);
		isDialogActive = false;

		if (choice === "No! Go back now!") {
			onRestore(tempState, extensionUri);
		} else {
			tempState = null;
		}
	});

	if (restoredState) {
		panel.webview.postMessage({ command: "import", data: restoredState });
	}
}

function getPanel() {
	return panel;
}

module.exports = { openDesmos, getPanel };
