// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { StatusBarItem, commands, window, workspace, ExtensionContext, ViewColumn, Uri, WebviewPanel } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import DailyLine from './dailyline';
const daily = new DailyLine();
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
	let panel: WebviewPanel;
	daily.init(context);
	var debounce = function (func: Function, wait: number, immediate: boolean) {
		// 设置定时器
		let timeout: any;
		return (...args: any[]) => {
			const later = () => {
				timeout = null;
				if (!immediate) func.apply(this, args);
			};
			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow)
				func.apply(this, args);
		}
	};

	const htmlPath = path.resolve(context.extensionPath, 'webview/index.html');
	let lastUsedImageUri = Uri.file(path.resolve(homedir(), 'Desktop/code.png'));

	workspace.onDidOpenTextDocument(() => {
		daily.open();
	});
	workspace.onDidSaveTextDocument(() => {
		daily.save();
	});

	workspace.onDidChangeTextDocument(debounce(() => {
		console.log('active');
		daily.setNewTimer();
	}, 500, true));

	
	window.registerWebviewPanelSerializer('dailyline', {
		async deserializeWebviewPanel(_panel: WebviewPanel, state: any) {
			panel = _panel;
			daily.setPanel(panel);
			panel.webview.html = getHtmlContent(htmlPath);
			daily.setcode();
			setupMessageListeners();
		}
	});

	commands.registerCommand('dailyline.start', () => {
		// 创建并显示新的webview
		panel = window.createWebviewPanel('dailyline', 'dailyline', 2, {
			enableScripts: true,
			localResourceRoots: [Uri.file(path.join(context.extensionPath, 'webview'))]
		});
		daily.setPanel(panel);
		panel.webview.html = getHtmlContent(htmlPath);
		daily.setcode();
		setupMessageListeners();
	});

	const writeSerializedBlobToFile = (serializeBlob: any, fileName: string) => {
		const bytes = new Uint8Array(serializeBlob.split(','));
		fs.writeFileSync(fileName, Buffer.from(bytes));
	};

	function setupMessageListeners() {
		panel.webview.onDidReceiveMessage(({ type, data }) => {
			switch (type) {
				case 'shoot':
					window
						.showSaveDialog({
							defaultUri: lastUsedImageUri,
							filters: {
								Images: ['png']
							}
						})
						.then(uri => {
							if (uri) {
								writeSerializedBlobToFile(data.serializedBlob, uri.fsPath);
								lastUsedImageUri = uri;
							}
						});
					break;
			}
		});
	}
	context.subscriptions.push(daily);
}

// this method is called when your extension is deactivated
export function deactivate() {
	daily.syncLocal();
}

function getHtmlContent(htmlPath: string) {
	const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
	return htmlContent.replace(/script src="([^"]*)"/g, (match, src) => {
		const realSource = 'vscode-resource:' + path.resolve(htmlPath, '..', src);
		return `script src="${realSource}"`;
	});
}

