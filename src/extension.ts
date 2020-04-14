// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { StatusBarItem, commands, window, workspace, , ExtensionContext, ViewColumn, Uri, WebviewPanel } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
// const psnode = require('find-ps');
import DailyLine from './dailyline';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
	var debounce = function(func, wait, immediate) {
		// 设置定时器
		let timeout;
		return (...args) => {
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
	}；

	const daily = new DailyLine();
	daily.init(context);
	// let timer: Timer | null
	// const timecode = [];
	// const endTime = [];

	const htmlPath = path.resolve(context.extensionPath, 'webview/index.html');
	let lastUsedImageUri = Uri.file(path.resolve(homedir(), 'Desktop/code.png'));

	workspace.onDidOpenTextDocument(() => {
		daily.open();
	});
	workspace.onDidSaveTextDocument(() => {
		daily.save();
	});

	workspace.onDidChangeTextDocument(debounce(() => {
		console.log('code===');
		daily.setNewTimer();
	}, 500, true));

	let panel: WebviewPanel;

	window.registerWebviewPanelSerializer('dailyline', {
		async deserializeWebviewPanel(_panel: WebviewPanel, state: any) {
			panel = _panel;
			daily.setPanel(panel);
			panel.webview.html = getHtmlContent(htmlPath);
			console.log('reload', daily.getCacheLine());
			setcode(panel, daily.getCacheLine(), daily.getToday());
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
		console.log('init', daily.getCacheLine());
		setcode(panel, daily.getCacheLine(), daily.getToday());
		setupMessageListeners();
	});


	context.subscriptions.push(daily);

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
}

// this method is called when your extension is deactivated
export function deactivate() {

}

function setcode(panel: WebviewPanel, line: number, day: string) {
	// const bgColor = context.globalState.get('polacode.bgColor', '#2e3440')
	psnode('Visual Studio Code', (error: any, data: string) => {
		let time = 0;
		if (!error) {
			const timelist = data.split(/(:|\.)/);
			const times: number[] = timelist.filter(item => item !== ':' && item !== '.').map(item => +item);
			console.log(times);
			time = +times[0] + times[1] / 60;
			console.log(time);
		}
		const fontFamily = workspace.getConfiguration('editor').fontFamily;
		const msg = {
			type: 'update',
			line,
			fontFamily,
			bgColor: '#2e3440',
			time,
			day
		};
		panel.webview.postMessage(msg);
	});
	
}

function getHtmlContent(htmlPath: string) {
	const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
	return htmlContent.replace(/script src="([^"]*)"/g, (match, src) => {
		const realSource = 'vscode-resource:' + path.resolve(htmlPath, '..', src);
		return `script src="${realSource}"`;
	});
}

