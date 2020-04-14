import { StatusBarAlignment, window, WebviewPanel, ExtensionContext } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface Cache {
	[key: string]: number
}

interface DayMap {
	[key: string]: {
		[key: string]: number
	}
}

interface TimeCode {
	startTime: number;
	endTime: number | null;
}
class DailyLine {
	cache: Cache;
	dayMap: DayMap;
	context: ExtensionContext;
	cachePath: string;
	statusBar: StatusBarItem;
	htmlPath: string;
	timer: number | null;
	panel: WebviewPanel | null;
	timecode: TimeCode[];
	constructor() {
		this.panel = null;
		this.cache = {};
		this.dayMap = {};
		this.timer = null;
		this.timecode = [];
    }
    init(context: ExtensionContext) {
        this.context = context;
		this.cachePath = context.globalStoragePath;
		this.statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
		this.htmlPath = path.resolve(context.extensionPath, 'webview/index.html');
		this.initCache();
		this.loadCache();
		const today = this.getToday();
		this.statusBar.text = `今日已coding ${this.cache[today] || 0} 行`;
		this.statusBar.show();
	}
	setNewTimer() {
		if (!this.timer) {
			this.timecode.push({
				startTime: +new Date(),
				endTime: null
			})
		}
		if (this.timer) {
			clearTimeout(this.timer);
		}
		this.timer = setTimeout(() => {
			const lastcode = this.timecode[this.timecode.length - 1];

			if (!lastcode.endTime) {
				lastcode.endTime = +new Date();
			}

			console.log('记录未写代码时间');
			clearTimeout(this.timer);
			this.timer = null;
		}, 1000 * 60 * 3);
	}
	setPanel(panel: WebviewPanel) {
		this.panel = panel;
	}
	initCache() {
		if (!fs.existsSync(this.cachePath)) {
			fs.writeFileSync(this.cachePath, JSON.stringify(this.cache));
		}
	}
	loadCache() {
		const content = fs.readFileSync(this.cachePath).toString();
		this.cache = JSON.parse(content);
	}
	getCacheLine() {
		console.log(this.cache);
		const today = this.getToday();
		return this.cache[today];
	}
	getToday() {
		const date = new Date();
		const year = date.getFullYear();
		const month = date.getMonth();
		const day = date.getDate();
		return `${year}-${(month + 1) >= 10 ? (month + 1) : '0' + (month + 1)}-${day >= 10 ? day : '0' + day}`;
	}
	getLine() {
		let editor = window.activeTextEditor;
		if (!editor) {
			return 0;
		}
		const content = editor.document.getText();
		const lastLine = content.split(/\r?\n/);
		// console.log(lastLine.length, 'last====');
		return lastLine.length;
	}
	open() {
		let editor = window.activeTextEditor;
		if (!editor) {
			return;
		}
		const fileName = editor.document.fileName;
		if (!fileName) {
			return;
		}
		const today = this.getToday();
		this.checkInit(today);
		this.dayMap[today][fileName] = this.getLine();
		console.log('open ===', this.dayMap[today][fileName]);
	}
	checkInit(today: string) {
		if (!this.cache[today]) {
			this.cache[today] = 0;
		}
		if (!this.dayMap[today]) {
			this.dayMap[today] = {};
		}
	}
	checkInitFile(today: string, fileName: string) {
		if (!this.dayMap[today][fileName]) {
			this.dayMap[today][fileName] = this.getLine();
		}
	}
	save() {
		this.loadCache();
		const today = this.getToday();
		this.checkInit(today);
		let editor = window.activeTextEditor;
		if (!editor) {
			return;
		}
		const fileName = editor.document.fileName;
		if (!fileName) {
			return;
		}
		const saveLine = this.getLine();
		this.checkInitFile(today, fileName);
		const addcode = saveLine - this.dayMap[today][fileName];
		console.log(saveLine, this.dayMap[today][fileName]);
		if (addcode > 0) {
			this.dayMap[today][fileName] = saveLine;
			this.cache[today] += addcode;
			fs.writeFileSync(this.cachePath, JSON.stringify(this.cache));
			this.statusBar.text = `今日已 coding ${this.cache[today]} 行`;
			if (this.panel) {
				// setcode(this.panel, this.cache[today], today);
			}
		}
	}
	dispose() {

	}
}

export default DailyLine;